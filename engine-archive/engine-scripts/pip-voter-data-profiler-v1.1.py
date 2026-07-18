#!/usr/bin/env python3
"""
PIP Voter Data Profiler v1.0
============================

Production-oriented, read-only profiling layer for PIP voter datasets.

Purpose
-------
Profile raw or staging voter data BEFORE cleansing and transformation.
The profiler is designed to work with:

* Excel workbooks (.xlsx, .xls, .xlsm) including multiple sheets
* CSV / TSV text files
* JSON arrays, JSON objects containing record arrays, JSONL / NDJSON
* Excel-derived JSON records

Contract
--------
The source-of-truth schema is:

    pip-voter-intelligence-ontology-v1.0.json

When the ontology is available, this profiler extracts the ontology field mappings,
validates coverage of the expected 47 source fields, resolves aliases, and reports
missing / unknown / duplicate columns. The ontology file is never modified.

Privacy and security guarantees
-------------------------------
* The input dataset is opened read-only and is never overwritten.
* Raw IC / NRIC / MyKad values are never emitted to reports.
* Sensitive identity values are never used as report IDs.
* Duplicate and conflict references use opaque HMAC-SHA256 tokens when a stable
  secret is available; otherwise ephemeral SHA-256 tokens are used for the run.
* Top-value frequency outputs are suppressed for sensitive identity columns.
* Reports contain row references and evidence codes, not raw identity numbers.

Recommended environment variable
--------------------------------

    PIP_VOTER_HASH_SALT=<long-random-secret>

Recommended runtime
-------------------
Python 3.11+

Required packages
-----------------

    pandas>=2.1
    openpyxl>=3.1

Optional for legacy .xls
------------------------

    xlrd>=2.0

Example
-------

    python pip-voter-data-profiler-v1.1.py voters.xlsx \
        --ontology pip-voter-intelligence-ontology-v1.0.json \
        --output-dir profile-output \
        --strict-contract

This module can also be imported and used programmatically.
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import datetime as dt
import decimal
import hashlib
import hmac
import json
import logging
import math
import os
import re
import secrets
import sys
import traceback
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping, MutableMapping, Sequence

try:
    import pandas as pd
except ImportError as exc:  # pragma: no cover - import guard
    raise SystemExit(
        "Missing required dependency 'pandas'. Install with: pip install pandas openpyxl"
    ) from exc


PROFILER_NAME = "PIP_VOTER_DATA_PROFILER"
PROFILER_VERSION = "1.1.0"
DEFAULT_ONTOLOGY_FILENAME = "pip-voter-intelligence-ontology-v1.0.json"
LEGACY_EXPECTED_SOURCE_FIELD_COUNT = 47
EXPECTED_SOURCE_FIELD_COUNT = LEGACY_EXPECTED_SOURCE_FIELD_COUNT
DEFAULT_OUTPUT_DIR = "pip-voter-profile-output"

# The 29 fields below are known from the existing PIP source model. The complete
# 47-field list MUST come from the ontology contract. They are used only for
# alias resolution and degraded-mode profiling when the ontology is unavailable.
CORE_FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "PARAMETER": ("PARAMETER",),
    "IC": ("IC", "NO_IC", "NRIC", "MYKAD", "NO_KP", "NO_KAD_PENGENALAN"),
    "IC_LAMA": ("IC_LAMA", "OLD_IC", "NO_IC_LAMA", "KP_LAMA"),
    "IC_PERSONEL": ("IC_PERSONEL", "IC_PERSONAL", "PERSONEL_IC", "PERSONAL_IC"),
    "IC_SPOUSE": ("IC_SPOUSE", "SPOUSE_IC", "IC_PASANGAN", "PASANGAN_IC"),
    "NAMA": ("NAMA", "NAME", "FULL_NAME", "NAMA_PENUH"),
    "JANTINA": ("JANTINA", "GENDER", "SEX"),
    "UMUR": ("UMUR", "AGE"),
    "KAUM": ("KAUM", "ETHNICITY", "RACE"),
    "UMUR2": ("UMUR2", "AGE2", "AGE_BAND", "KUMPULAN_UMUR"),
    "TAHUN_LAHIR": ("TAHUN_LAHIR", "BIRTH_YEAR", "YEAR_OF_BIRTH"),
    "AGAMA": ("AGAMA", "RELIGION"),
    "PROFESSION": ("PROFESSION", "PEKERJAAN", "OCCUPATION", "KERJAYA"),
    "LOKALITI": ("LOKALITI", "LOCALITY"),
    "DM": ("DM", "PDM", "DAERAH_MENGUNDI"),
    "DUN": ("DUN",),
    "PARLIMEN": ("PARLIMEN", "PARLIAMENT"),
    "NEGERI": ("NEGERI", "STATE"),
    "NO_RUMAH": ("NO_RUMAH", "HOUSE_NO", "HOUSE_NUMBER", "NOMBOR_RUMAH"),
    "ALAMAT1": ("ALAMAT1", "ADDRESS1", "ADDRESS_1", "ALAMAT_1"),
    "ALAMAT2": ("ALAMAT2", "ADDRESS2", "ADDRESS_2", "ALAMAT_2"),
    "ALAMAT3": ("ALAMAT3", "ADDRESS3", "ADDRESS_3", "ALAMAT_3"),
    "POSKOD": ("POSKOD", "POSTCODE", "POSTAL_CODE", "ZIP"),
    "ALAMAT_BANDAR": ("ALAMAT_BANDAR", "CITY", "ADDRESS_CITY", "BANDAR"),
    "ALAMAT_NEGERI": ("ALAMAT_NEGERI", "ADDRESS_STATE", "STATE_ADDRESS"),
    "NO_TEL_HF": ("NO_TEL_HF", "PHONE", "PHONE_NO", "MOBILE", "TEL", "NO_TEL"),
    "BANGSA": ("BANGSA", "NATIONALITY_RACE", "NATIONALITY"),
    "KAUM2": ("KAUM2", "ETHNICITY2", "RACE2"),
    "KOD_UMUR": ("KOD_UMUR", "AGE_CODE"),
}

DEFAULT_NULL_TOKENS = {
    "",
    "-",
    "--",
    "---",
    "N/A",
    "NA",
    "N.A.",
    "NULL",
    "NONE",
    "NIL",
    "TIADA",
    "TIDAK DIKETAHUI",
    "UNKNOWN",
    "UNDEFINED",
    "#N/A",
    "#VALUE!",
    "#REF!",
    "#DIV/0!",
}

SENSITIVE_IDENTITY_PATTERNS = (
    re.compile(r"^IC$", re.I),
    re.compile(r"^IC_", re.I),
    re.compile(r"_IC$", re.I),
    re.compile(r"NRIC", re.I),
    re.compile(r"MYKAD", re.I),
    re.compile(r"NO_?KP", re.I),
    re.compile(r"KAD_?PENGENALAN", re.I),
    re.compile(r"IDENTITY.*CARD", re.I),
)

# Fields whose row-level values must not be echoed into diagnostic outputs.
# This is intentionally broader than identity matching so that names, phone
# numbers, and street-address components are privacy-safe in anomaly evidence.
REPORT_SENSITIVE_PATTERNS = (
    *SENSITIVE_IDENTITY_PATTERNS,
    re.compile(r"^VTR_ID$", re.I),
    re.compile(r"^VOTER_ID_HASH$", re.I),
    re.compile(r"^NAMA$", re.I),
    re.compile(r"(^|_)NAME($|_)", re.I),
    re.compile(r"PHONE|MOBILE|TELEFON|(^|_)TEL($|_)|NO_TEL|NO_TEL_HF", re.I),
    re.compile(r"^NO_RUMAH$|HOUSE_NUMBER|HOUSE_NO", re.I),
    re.compile(r"^ALAMAT[123]$|^ALAMAT_[123]$|ADDRESS_[123]$|^ADDRESS[123]$", re.I),
)

PHONE_HINTS = ("PHONE", "TEL", "MOBILE", "HP", "HF", "TELEFON")
POSTCODE_HINTS = ("POSKOD", "POSTCODE", "POSTAL", "ZIP")
DATE_HINTS = ("DATE", "TARIKH", "LAST_CONTACT", "CONTACT_DATE", "DIKEMASKINI", "UPDATED")
AGE_HINTS = ("UMUR", "AGE")
BIRTH_YEAR_HINTS = ("TAHUN_LAHIR", "BIRTH_YEAR", "YEAR_OF_BIRTH")
GENDER_HINTS = ("JANTINA", "GENDER", "SEX")
LOCALITY_HINTS = ("LOKALITI", "LOCALITY")

GENDER_CANONICAL_MAP = {
    "M": "MALE",
    "MALE": "MALE",
    "LELAKI": "MALE",
    "L": "MALE",
    "1": "MALE",
    "F": "FEMALE",
    "FEMALE": "FEMALE",
    "PEREMPUAN": "FEMALE",
    "P": "FEMALE",
    "2": "FEMALE",
}

HIERARCHY_RELATIONSHIPS: tuple[tuple[str, str], ...] = (
    ("LOKALITI", "DM"),
    ("DM", "DUN"),
    ("DUN", "PARLIMEN"),
    ("PARLIMEN", "NEGERI"),
)

EXCEL_SCI_NOTATION_RE = re.compile(r"^[+-]?\d+(?:\.\d+)?[Ee][+-]?\d+$")
DECIMAL_ZERO_SUFFIX_RE = re.compile(r"^[+-]?\d+\.0+$")
DIGITS_RE = re.compile(r"\d+")
NON_ALNUM_RE = re.compile(r"[^A-Z0-9]+")
MULTISPACE_RE = re.compile(r"\s+")


class ProfilerError(RuntimeError):
    """Base profiler exception."""


class OntologyContractError(ProfilerError):
    """Raised when the ontology contract cannot be compiled."""


class InputReadError(ProfilerError):
    """Raised when an input dataset cannot be read."""


@dataclass(slots=True)
class ProfilerConfig:
    """Runtime configuration for :class:`PIPVoterDataProfiler`."""

    ontology_path: Path | None = None
    output_dir: Path = Path(DEFAULT_OUTPUT_DIR)
    strict_contract: bool = False
    expected_source_field_count: int | None = None
    include_all_sheets: bool = True
    sheets: tuple[str, ...] = ()
    max_rows: int | None = None
    age_min: int = 18
    age_max: int = 120
    locality_similarity_threshold: float = 0.92
    locality_max_unique: int = 20_000
    top_values_limit: int = 10
    anomaly_limit_per_code: int = 5_000
    duplicate_group_limit: int = 10_000
    null_tokens: set[str] = field(default_factory=lambda: set(DEFAULT_NULL_TOKENS))
    hash_salt: str | None = None
    log_level: str = "INFO"
    write_excel_summary: bool = True
    write_csv_details: bool = True
    fail_on_high_severity: bool = False
    high_severity_threshold: int = 1

    def resolved_hash_salt(self) -> str:
        """Return a stable salt when configured, otherwise an ephemeral run salt."""
        if self.hash_salt:
            return self.hash_salt
        env_salt = os.getenv("PIP_VOTER_HASH_SALT")
        if env_salt:
            return env_salt
        # Ephemeral by design. This prevents accidental unsalted identity hashes.
        return secrets.token_hex(32)


@dataclass(slots=True)
class FieldMapping:
    source_field: str | None
    canonical_field: str | None
    aliases: tuple[str, ...] = ()
    declared_type: str | None = None
    required: bool | None = None
    raw: Mapping[str, Any] | None = None


@dataclass(slots=True)
class OntologyContract:
    contract_id: str
    version: str
    field_mappings: tuple[FieldMapping, ...]
    source_fields: tuple[str, ...]
    alias_to_source: Mapping[str, str]
    validation: Mapping[str, Any]
    raw: Mapping[str, Any]
    expected_source_field_count: int | None = None
    contract_type: str = "ontology"
    privacy_removed_fields: tuple[str, ...] = ()
    source_identity_field: str | None = None
    masked_label_field: str | None = None
    canonical_identity_field: str | None = None


@dataclass(slots=True)
class DataUnit:
    source_path: Path
    unit_name: str
    frame: "pd.DataFrame"
    input_kind: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ProfileBundle:
    report: dict[str, Any]
    tables: dict[str, "pd.DataFrame"]
    output_paths: dict[str, str]


class PrivacyGuard:
    """Centralized privacy-safe hashing and redaction helpers."""

    def __init__(self, salt: str) -> None:
        if not salt:
            raise ValueError("PrivacyGuard requires a non-empty salt")
        self._key = salt.encode("utf-8")

    def token(self, value: Any, namespace: str = "VALUE", length: int = 24) -> str | None:
        normalized = normalize_scalar_text(value)
        if normalized is None:
            return None
        digest = hmac.new(
            self._key,
            f"{namespace}|{normalized}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return f"{namespace.lower()}_{digest[:length]}"

    def row_token(self, unit_name: str, row_number: int) -> str:
        return self.token(f"{unit_name}|{row_number}", "ROW", 20) or "row_unknown"

    def redact(self, value: Any, field_name: str) -> Any:
        if value is None or is_nullish(value):
            return None
        if is_report_sensitive_field(field_name):
            return self.token(value, f"FIELD_{normalize_key(field_name)}")
        text = normalize_scalar_text(value)
        if text is None:
            return None
        if len(text) > 160:
            return text[:157] + "..."
        return text


class PIPVoterDataProfiler:
    """
    Read-only voter dataset profiler.

    The profiler loads one or more logical data units (Excel sheets or files),
    resolves the ontology contract, calculates schema and quality diagnostics,
    and writes privacy-safe reports.
    """

    def __init__(self, config: ProfilerConfig | None = None) -> None:
        self.config = config or ProfilerConfig()
        self.logger = _build_logger(self.config.log_level)
        self.run_id = f"pvp_{dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{secrets.token_hex(4)}"
        self.started_at = dt.datetime.now(dt.timezone.utc)
        self._salt_is_ephemeral = not bool(self.config.hash_salt or os.getenv("PIP_VOTER_HASH_SALT"))
        self.privacy = PrivacyGuard(self.config.resolved_hash_salt())
        self.contract: OntologyContract | None = None
        self._anomaly_counts: Counter[str] = Counter()

    def profile(self, input_path: str | Path) -> ProfileBundle:
        """Profile the supplied file and write report artifacts."""
        source_path = Path(input_path).expanduser().resolve()
        if not source_path.exists():
            raise InputReadError(f"Input file does not exist: {source_path}")
        if not source_path.is_file():
            raise InputReadError(f"Input path is not a file: {source_path}")

        self.logger.info("Starting %s v%s", PROFILER_NAME, PROFILER_VERSION)
        self.logger.info("Input: %s", source_path)

        self.contract = self._load_contract(source_path)
        units = load_data_units(source_path, self.config, self.logger)
        if not units:
            raise InputReadError("No readable data units were discovered")

        input_inventory = build_input_inventory(source_path, units)
        unit_reports: list[dict[str, Any]] = []

        table_acc: dict[str, list[dict[str, Any]]] = {
            "dataset": [],
            "units": [],
            "schema": [],
            "nulls": [],
            "columns": [],
            "anomalies": [],
            "duplicates": [],
            "hierarchy": [],
            "variants": [],
            "recommendations": [],
        }

        for unit in units:
            self.logger.info("Profiling unit '%s' (%s rows)", unit.unit_name, len(unit.frame))
            unit_report, unit_tables = self._profile_unit(unit)
            unit_reports.append(unit_report)
            for table_name, rows in unit_tables.items():
                table_acc.setdefault(table_name, []).extend(rows)

        cross_unit_report, cross_tables = self._profile_cross_unit(units)
        for table_name, rows in cross_tables.items():
            table_acc.setdefault(table_name, []).extend(rows)

        quality_summary = aggregate_quality_summary(unit_reports, cross_unit_report)
        recommendations = build_recommendations(
            unit_reports=unit_reports,
            cross_unit_report=cross_unit_report,
            contract=self.contract,
        )
        table_acc["recommendations"].extend(recommendations)

        completed_at = dt.datetime.now(dt.timezone.utc)
        report = {
            "report_type": "PIP_VOTER_DATA_PROFILE",
            "profiler": {
                "name": PROFILER_NAME,
                "version": PROFILER_VERSION,
                "run_id": self.run_id,
                "started_at": iso_z(self.started_at),
                "completed_at": iso_z(completed_at),
                "duration_seconds": round((completed_at - self.started_at).total_seconds(), 3),
            },
            "privacy": {
                "raw_ic_emitted": False,
                "sensitive_top_values_suppressed": True,
                "identity_tokens": "HMAC-SHA256",
                "hash_salt_mode": "EPHEMERAL_RUN" if self._salt_is_ephemeral else "STABLE_CONFIGURED",
                "note": (
                    "Ephemeral identity tokens cannot be compared across profiler runs. "
                    "Set PIP_VOTER_HASH_SALT for stable privacy-safe linkage."
                    if self._salt_is_ephemeral
                    else "Stable privacy-safe linkage enabled for duplicate comparisons across runs."
                ),
            },
            "input_inventory": input_inventory,
            "ontology_contract": contract_to_report(self.contract),
            "units": unit_reports,
            "cross_unit_analysis": cross_unit_report,
            "quality_summary": quality_summary,
            "recommendations": recommendations,
            "execution": {
                "max_rows": self.config.max_rows,
                "strict_contract": self.config.strict_contract,
                "expected_source_field_count": (
                    self.contract.expected_source_field_count
                    if self.contract is not None
                    else self.config.expected_source_field_count
                ),
                "age_range": [self.config.age_min, self.config.age_max],
                "locality_similarity_threshold": self.config.locality_similarity_threshold,
                "anomaly_limits": {
                    "per_code": self.config.anomaly_limit_per_code,
                    "duplicate_groups": self.config.duplicate_group_limit,
                },
            },
        }

        tables = {name: pd.DataFrame(rows) for name, rows in table_acc.items()}
        output_paths = self._write_outputs(source_path, report, tables)
        report["output_paths"] = output_paths

        # Rewrite JSON after output paths have been added.
        report_json_path = Path(output_paths["report_json"])
        safe_write_json(report_json_path, report)

        high_count = count_high_severity_anomalies(tables.get("anomalies"))
        if self.config.fail_on_high_severity and high_count >= self.config.high_severity_threshold:
            raise ProfilerError(
                f"High-severity anomaly threshold reached: {high_count} >= "
                f"{self.config.high_severity_threshold}"
            )

        self.logger.info("Profiling completed. Report: %s", report_json_path)
        return ProfileBundle(report=report, tables=tables, output_paths=output_paths)

    def _load_contract(self, source_path: Path) -> OntologyContract:
        ontology_path = self.config.ontology_path
        if ontology_path is None:
            candidate_names = (
                "pip-voter-source-contract-p134-v1.0.json",
                DEFAULT_ONTOLOGY_FILENAME,
            )
            candidates = [
                directory / name
                for directory in (
                    source_path.parent,
                    Path.cwd(),
                    Path(__file__).resolve().parent,
                )
                for name in candidate_names
            ]
            ontology_path = next((p for p in candidates if p.exists()), None)

        if ontology_path is None:
            msg = (
                "Ontology/source contract not found. "
                "Running in degraded mode with known core aliases only."
            )
            if self.config.strict_contract:
                raise OntologyContractError(msg)
            self.logger.warning(msg)
            return build_degraded_contract(self.config.expected_source_field_count)

        path = Path(ontology_path).expanduser().resolve()
        self.logger.info("Ontology/source contract: %s", path)
        try:
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
        except Exception as exc:
            raise OntologyContractError(f"Unable to read ontology JSON: {path}: {exc}") from exc

        return compile_ontology_contract(
            payload,
            expected_source_field_count=self.config.expected_source_field_count,
            strict=self.config.strict_contract,
        )

    def _profile_unit(self, unit: DataUnit) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
        raw_df = unit.frame.copy(deep=False)
        resolution = resolve_columns(raw_df.columns, self.contract)
        df = apply_column_resolution(raw_df, resolution)
        df = normalize_nulls_frame(df, self.config.null_tokens)

        schema_report = profile_schema(unit, raw_df, df, resolution, self.contract)
        null_report, null_rows = profile_nulls(unit, df)
        column_report, column_rows = profile_columns(
            unit,
            df,
            top_values_limit=self.config.top_values_limit,
            privacy=self.privacy,
        )

        anomalies: list[dict[str, Any]] = []
        anomalies.extend(self._detect_contract_specific_anomalies(unit, df))
        anomalies.extend(self._detect_ic_anomalies(unit, df))
        anomalies.extend(self._detect_phone_anomalies(unit, df))
        anomalies.extend(self._detect_age_anomalies(unit, df))
        anomalies.extend(self._detect_gender_anomalies(unit, df))
        anomalies.extend(self._detect_postcode_anomalies(unit, df))
        anomalies.extend(self._detect_date_anomalies(unit, df))
        anomalies.extend(self._detect_excel_coercion_anomalies(unit, df))

        duplicate_report, duplicate_rows, duplicate_anomalies = self._profile_duplicates(unit, df)
        anomalies.extend(duplicate_anomalies)

        hierarchy_report, hierarchy_rows, hierarchy_anomalies = self._profile_hierarchy(unit, df)
        anomalies.extend(hierarchy_anomalies)

        variant_report, variant_rows = self._profile_variants(unit, df)

        # Enforce per-code output limits after detectors have run.
        anomalies = limit_anomalies(anomalies, self.config.anomaly_limit_per_code)

        quality = calculate_unit_quality(
            df=df,
            schema_report=schema_report,
            anomalies=anomalies,
            duplicate_report=duplicate_report,
            hierarchy_report=hierarchy_report,
        )
        confidence = calculate_profile_confidence(
            row_count=len(df),
            contract=self.contract,
            schema_report=schema_report,
            sampled=self.config.max_rows is not None,
        )

        unit_report = {
            "unit_name": unit.unit_name,
            "input_kind": unit.input_kind,
            "rows": int(len(df)),
            "columns_raw": int(len(raw_df.columns)),
            "columns_resolved": int(len(df.columns)),
            "metadata": unit.metadata,
            "schema": schema_report,
            "null_profile": null_report,
            "column_profile": column_report,
            "anomaly_summary": summarize_anomalies(anomalies),
            "duplicate_analysis": duplicate_report,
            "hierarchy_analysis": hierarchy_report,
            "variant_analysis": variant_report,
            "quality": quality,
            "profile_confidence": confidence,
        }

        unit_row = {
            "unit_name": unit.unit_name,
            "input_kind": unit.input_kind,
            "rows": len(df),
            "columns_raw": len(raw_df.columns),
            "columns_resolved": len(df.columns),
            "quality_score": quality["overall_score"],
            "confidence_score": confidence["score"],
            "anomaly_count": len(anomalies),
            "exact_duplicate_rows": duplicate_report.get("exact_duplicate_rows", 0),
        }

        tables = {
            "units": [unit_row],
            "schema": schema_report["table_rows"],
            "nulls": null_rows,
            "columns": column_rows,
            "anomalies": anomalies,
            "duplicates": duplicate_rows,
            "hierarchy": hierarchy_rows,
            "variants": variant_rows,
        }
        return unit_report, tables

    def _detect_contract_specific_anomalies(
        self,
        unit: DataUnit,
        df: "pd.DataFrame",
    ) -> list[dict[str, Any]]:
        """
        Apply source-contract-specific diagnostics without reinterpreting
        pseudonymous identifiers as IC/NRIC values.

        v1.1 responsibilities:
        - source identity missing / duplicate / regex checks
        - declared field regex checks (for example CODE.NAME geography)
        - privacy-removed field reappearance gate
        """
        anomalies: list[dict[str, Any]] = []
        contract = self.contract
        if contract is None:
            return anomalies

        # --------------------------------------------------------------
        # Privacy-removal gate
        # --------------------------------------------------------------
        for field_name in contract.privacy_removed_fields:
            key = normalize_key(field_name)
            if key not in df.columns:
                continue

            non_null = df[key].dropna()
            if non_null.empty:
                # Physical reappearance is still a schema concern, even blank.
                anomalies.append(self._issue(
                    unit,
                    1,
                    key,
                    "PRIVACY_REMOVED_FIELD_REAPPEARED",
                    "CRITICAL",
                    "A field declared privacy-removed by the source contract is present in the dataset schema.",
                    None,
                    metrics={"non_null_count": 0},
                ))
                continue

            # Emit bounded row-level evidence; _issue handles privacy redaction.
            for idx, value in non_null.items():
                anomalies.append(self._issue(
                    unit,
                    excel_row_number(idx),
                    key,
                    "PRIVACY_REMOVED_FIELD_REAPPEARED",
                    "CRITICAL",
                    "A field declared privacy-removed by the source contract contains data.",
                    value,
                ))

        # --------------------------------------------------------------
        # Pseudonymous source identity diagnostics
        # --------------------------------------------------------------
        identity_field = normalize_key(contract.source_identity_field or "")
        if identity_field:
            if identity_field not in df.columns:
                anomalies.append(self._issue(
                    unit,
                    1,
                    identity_field,
                    "SOURCE_IDENTITY_FIELD_MISSING",
                    "CRITICAL",
                    "Source-contract identity field is absent.",
                    None,
                ))
            else:
                series = df[identity_field]

                for idx, value in series.items():
                    if is_nullish(value):
                        anomalies.append(self._issue(
                            unit,
                            excel_row_number(idx),
                            identity_field,
                            "SOURCE_IDENTITY_MISSING",
                            "CRITICAL",
                            "Source pseudonymous identity is missing.",
                            value,
                        ))

                non_null = series.dropna().map(normalize_scalar_text)
                duplicate_mask = non_null.duplicated(keep=False)
                duplicate_values = set(non_null[duplicate_mask].dropna().tolist())
                if duplicate_values:
                    for idx, value in series.items():
                        normalized = normalize_scalar_text(value)
                        if normalized in duplicate_values:
                            anomalies.append(self._issue(
                                unit,
                                excel_row_number(idx),
                                identity_field,
                                "SOURCE_IDENTITY_DUPLICATE",
                                "CRITICAL",
                                "Source pseudonymous identity is duplicated.",
                                value,
                            ))

        # --------------------------------------------------------------
        # Contract-declared regex validation
        # --------------------------------------------------------------
        for mapping in contract.field_mappings:
            if not mapping.source_field or not mapping.raw:
                continue

            pattern_value = first_non_null(
                lookup_ci(mapping.raw, "pattern"),
                lookup_ci(mapping.raw, "regex"),
            )
            if not pattern_value:
                continue

            field_name = normalize_key(mapping.source_field)
            if field_name not in df.columns:
                continue

            try:
                compiled = re.compile(str(pattern_value))
            except re.error:
                anomalies.append(self._issue(
                    unit,
                    1,
                    field_name,
                    "CONTRACT_REGEX_INVALID",
                    "HIGH",
                    "Source contract contains an invalid regex pattern.",
                    None,
                    metrics={"pattern_token": self.privacy.token(pattern_value, "REGEX", 16)},
                ))
                continue

            for idx, value in df[field_name].items():
                if is_nullish(value):
                    continue
                normalized = normalize_scalar_text(value)
                if normalized is None:
                    continue
                if compiled.fullmatch(normalized) is None:
                    severity = (
                        "CRITICAL"
                        if field_name == identity_field
                        else "MEDIUM"
                    )
                    code = (
                        "SOURCE_IDENTITY_PATTERN_MISMATCH"
                        if field_name == identity_field
                        else "CONTRACT_PATTERN_MISMATCH"
                    )
                    anomalies.append(self._issue(
                        unit,
                        excel_row_number(idx),
                        field_name,
                        code,
                        severity,
                        "Value does not satisfy the source-contract regex pattern.",
                        value,
                    ))

        return anomalies

    def _detect_ic_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        ic_columns = [c for c in df.columns if is_sensitive_field(c)]
        for col in ic_columns:
            series = df[col]
            for idx, value in series.items():
                if is_nullish(value):
                    continue
                row_number = excel_row_number(idx)
                text = raw_scalar_text(value)
                compact = re.sub(r"[^0-9A-Za-z]", "", text or "")
                digits = re.sub(r"\D", "", text or "")

                if text and EXCEL_SCI_NOTATION_RE.match(text.strip()):
                    anomalies.append(self._issue(
                        unit, row_number, col, "IC_SCIENTIFIC_NOTATION", "HIGH",
                        "Identity-like value appears in scientific notation; precision may be lost.",
                        value,
                    ))
                if text and DECIMAL_ZERO_SUFFIX_RE.match(text.strip()):
                    anomalies.append(self._issue(
                        unit, row_number, col, "IC_DECIMAL_COERCION", "HIGH",
                        "Identity-like value has an Excel-style decimal suffix.",
                        value,
                    ))
                if compact and not digits:
                    anomalies.append(self._issue(
                        unit, row_number, col, "IC_NON_NUMERIC", "MEDIUM",
                        "Identity-like value contains no digits.", value,
                    ))
                    continue

                # Main Malaysian new IC / MyKad fields are usually 12 digits. Old IC
                # fields are deliberately not forced to 12 digits.
                key = normalize_key(col)
                if key in {"IC", "IC_PERSONEL", "IC_SPOUSE"} and digits:
                    if len(digits) != 12:
                        severity = "HIGH" if len(digits) < 10 or len(digits) > 13 else "MEDIUM"
                        anomalies.append(self._issue(
                            unit, row_number, col, "IC_LENGTH_ANOMALY", severity,
                            "Primary identity-like value does not resolve to 12 digits.",
                            value,
                            metrics={"digit_length": len(digits)},
                        ))
                    if len(digits) == 11:
                        anomalies.append(self._issue(
                            unit, row_number, col, "IC_LEADING_ZERO_LOSS_CANDIDATE", "HIGH",
                            "11-digit identity-like value may have lost a leading zero during Excel coercion.",
                            value,
                        ))
        return anomalies

    def _detect_phone_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        cols = [c for c in df.columns if field_matches_hints(c, PHONE_HINTS)]
        for col in cols:
            for idx, value in df[col].items():
                if is_nullish(value):
                    continue
                row_number = excel_row_number(idx)
                text = raw_scalar_text(value) or ""
                if EXCEL_SCI_NOTATION_RE.match(text.strip()):
                    anomalies.append(self._issue(
                        unit, row_number, col, "PHONE_SCIENTIFIC_NOTATION", "HIGH",
                        "Phone value appears in scientific notation.", value,
                    ))
                    continue
                number_chunks = re.findall(r"\+?\d[\d\s()\-]{5,}\d", text)
                delimiter_count = len(re.findall(r"[/;,|]", text))
                if len(number_chunks) > 1 or delimiter_count > 0:
                    anomalies.append(self._issue(
                        unit, row_number, col, "PHONE_MULTIPLE_VALUES", "MEDIUM",
                        "Phone field may contain multiple numbers.", value,
                    ))
                digits = re.sub(r"\D", "", text)
                # Accept common local / international lengths without attempting to
                # infer ownership or telecom carrier.
                if digits and (len(digits) < 9 or len(digits) > 13):
                    anomalies.append(self._issue(
                        unit, row_number, col, "PHONE_LENGTH_ANOMALY", "MEDIUM",
                        "Phone digit length falls outside the configured broad range 9-13.",
                        value,
                        metrics={"digit_length": len(digits)},
                    ))
        return anomalies

    def _detect_age_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        age_cols = [c for c in df.columns if normalize_key(c) == "UMUR" or normalize_key(c) == "AGE"]
        birth_cols = [c for c in df.columns if field_matches_hints(c, BIRTH_YEAR_HINTS)]
        current_year = dt.datetime.now(dt.timezone.utc).year

        for col in age_cols:
            for idx, value in df[col].items():
                if is_nullish(value):
                    continue
                row_number = excel_row_number(idx)
                number = parse_number(value)
                if number is None:
                    anomalies.append(self._issue(
                        unit, row_number, col, "AGE_NOT_NUMERIC", "MEDIUM",
                        "Age cannot be parsed as a number.", value,
                    ))
                elif number < self.config.age_min or number > self.config.age_max:
                    anomalies.append(self._issue(
                        unit, row_number, col, "AGE_OUT_OF_RANGE", "HIGH",
                        f"Age falls outside configured range {self.config.age_min}-{self.config.age_max}.",
                        value,
                        metrics={"parsed_age": number},
                    ))

        for col in birth_cols:
            for idx, value in df[col].items():
                if is_nullish(value):
                    continue
                row_number = excel_row_number(idx)
                year = parse_integer(value)
                min_year = current_year - self.config.age_max
                max_year = current_year - self.config.age_min
                if year is None:
                    anomalies.append(self._issue(
                        unit, row_number, col, "BIRTH_YEAR_NOT_NUMERIC", "MEDIUM",
                        "Birth year cannot be parsed as a four-digit year.", value,
                    ))
                elif year < min_year or year > max_year:
                    anomalies.append(self._issue(
                        unit, row_number, col, "BIRTH_YEAR_OUT_OF_RANGE", "HIGH",
                        f"Birth year is inconsistent with configured age range {self.config.age_min}-{self.config.age_max}.",
                        value,
                        metrics={"parsed_year": year, "expected_min": min_year, "expected_max": max_year},
                    ))

        if age_cols and birth_cols:
            age_col, birth_col = age_cols[0], birth_cols[0]
            for idx, row in df[[age_col, birth_col]].iterrows():
                age = parse_integer(row[age_col])
                year = parse_integer(row[birth_col])
                if age is None or year is None:
                    continue
                expected = current_year - year
                # A one-year difference is normal around birthdays.
                if abs(expected - age) > 1:
                    anomalies.append(self._issue(
                        unit, excel_row_number(idx), f"{age_col}|{birth_col}",
                        "AGE_BIRTH_YEAR_INCONSISTENT", "MEDIUM",
                        "Age and birth year differ by more than one year.",
                        None,
                        metrics={"age": age, "birth_year": year, "derived_age": expected},
                    ))
        return anomalies

    def _detect_gender_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        cols = [c for c in df.columns if field_matches_hints(c, GENDER_HINTS)]
        for col in cols:
            for idx, value in df[col].items():
                if is_nullish(value):
                    continue
                normalized = normalize_key(value)
                if normalized not in GENDER_CANONICAL_MAP:
                    anomalies.append(self._issue(
                        unit, excel_row_number(idx), col, "GENDER_UNMAPPED_VALUE", "LOW",
                        "Gender value is not in the known deterministic mapping table.", value,
                    ))
        return anomalies

    def _detect_postcode_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        cols = [c for c in df.columns if field_matches_hints(c, POSTCODE_HINTS)]
        for col in cols:
            for idx, value in df[col].items():
                if is_nullish(value):
                    continue
                text = raw_scalar_text(value) or ""
                row_number = excel_row_number(idx)
                if EXCEL_SCI_NOTATION_RE.match(text.strip()):
                    anomalies.append(self._issue(
                        unit, row_number, col, "POSTCODE_SCIENTIFIC_NOTATION", "HIGH",
                        "Postcode appears in scientific notation.", value,
                    ))
                digits = re.sub(r"\D", "", text)
                if len(digits) != 5:
                    severity = "HIGH" if len(digits) < 4 or len(digits) > 6 else "MEDIUM"
                    anomalies.append(self._issue(
                        unit, row_number, col, "POSTCODE_LENGTH_ANOMALY", severity,
                        "Postcode does not resolve to exactly five digits.", value,
                        metrics={"digit_length": len(digits)},
                    ))
                elif text.strip().isdigit() and len(text.strip()) < 5:
                    anomalies.append(self._issue(
                        unit, row_number, col, "POSTCODE_LEADING_ZERO_LOSS_CANDIDATE", "HIGH",
                        "Postcode may have lost a leading zero.", value,
                    ))
        return anomalies

    def _detect_date_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        cols = [c for c in df.columns if field_matches_hints(c, DATE_HINTS)]
        now = pd.Timestamp.now(tz="UTC")
        for col in cols:
            non_null = df[col].dropna()
            if non_null.empty:
                continue
            for idx, value in non_null.items():
                parsed = parse_datetime(value)
                if parsed is None:
                    anomalies.append(self._issue(
                        unit, excel_row_number(idx), col, "DATE_UNPARSEABLE", "MEDIUM",
                        "Date-like value cannot be parsed deterministically.", value,
                    ))
                    continue
                try:
                    parsed_utc = pd.Timestamp(parsed)
                    if parsed_utc.tzinfo is None:
                        parsed_utc = parsed_utc.tz_localize("UTC")
                    else:
                        parsed_utc = parsed_utc.tz_convert("UTC")
                    if parsed_utc > now + pd.Timedelta(days=1):
                        anomalies.append(self._issue(
                            unit, excel_row_number(idx), col, "DATE_IN_FUTURE", "MEDIUM",
                            "Date-like value is in the future.", value,
                        ))
                except Exception:
                    pass
        return anomalies

    def _detect_excel_coercion_anomalies(self, unit: DataUnit, df: "pd.DataFrame") -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        identifier_like = [
            c for c in df.columns
            if is_sensitive_field(c)
            or field_matches_hints(c, PHONE_HINTS)
            or field_matches_hints(c, POSTCODE_HINTS)
            or "ID" in normalize_key(c)
            or "KOD" in normalize_key(c)
        ]
        for col in identifier_like:
            for idx, value in df[col].items():
                if is_nullish(value):
                    continue
                text = raw_scalar_text(value) or ""
                if EXCEL_SCI_NOTATION_RE.match(text.strip()):
                    anomalies.append(self._issue(
                        unit, excel_row_number(idx), col, "EXCEL_SCIENTIFIC_NOTATION", "HIGH",
                        "Identifier-like field appears in scientific notation.", value,
                    ))
                elif DECIMAL_ZERO_SUFFIX_RE.match(text.strip()):
                    anomalies.append(self._issue(
                        unit, excel_row_number(idx), col, "EXCEL_DECIMAL_SUFFIX", "MEDIUM",
                        "Identifier-like field has a trailing decimal suffix introduced by numeric coercion.",
                        value,
                    ))
        return anomalies

    def _profile_duplicates(
        self, unit: DataUnit, df: "pd.DataFrame"
    ) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
        duplicate_rows: list[dict[str, Any]] = []
        anomalies: list[dict[str, Any]] = []

        normalized_for_hash = df.apply(lambda s: s.map(normalize_scalar_text))
        row_fingerprints = normalized_for_hash.apply(
            lambda row: hashlib.sha256(
                "\x1f".join("" if v is None else str(v) for v in row.tolist()).encode("utf-8")
            ).hexdigest(),
            axis=1,
        )
        counts = row_fingerprints.value_counts(dropna=False)
        exact_group_hashes = counts[counts > 1]
        exact_duplicate_rows = int(exact_group_hashes.sum()) if not exact_group_hashes.empty else 0
        exact_duplicate_excess = int((exact_group_hashes - 1).sum()) if not exact_group_hashes.empty else 0

        for group_no, (fp, group_count) in enumerate(exact_group_hashes.items(), start=1):
            if group_no > self.config.duplicate_group_limit:
                break
            idxs = row_fingerprints[row_fingerprints == fp].index.tolist()
            group_id = self.privacy.token(fp, "EXACT_DUP", 20)
            for idx in idxs:
                duplicate_rows.append({
                    "unit_name": unit.unit_name,
                    "duplicate_type": "EXACT_ROW",
                    "group_id": group_id,
                    "row_number": excel_row_number(idx),
                    "row_ref": self.privacy.row_token(unit.unit_name, excel_row_number(idx)),
                    "group_size": int(group_count),
                    "confidence": 1.0,
                })
            anomalies.append(self._issue(
                unit,
                excel_row_number(idxs[0]),
                "*ROW*",
                "EXACT_DUPLICATE_GROUP",
                "MEDIUM",
                "Two or more rows are exact normalized duplicates.",
                None,
                metrics={"group_size": int(group_count), "group_id": group_id},
            ))

        identity_cols = [c for c in df.columns if is_sensitive_field(c)]
        identity_duplicate_groups = 0
        identity_conflict_groups = 0
        if identity_cols:
            id_col = choose_primary_identity_column(identity_cols)
            id_tokens = df[id_col].map(lambda v: self.privacy.token(normalize_identity_value(v), "VOTER_ID", 24))
            token_counts = id_tokens.dropna().value_counts()
            repeated = token_counts[token_counts > 1]
            identity_duplicate_groups = int(len(repeated))

            conflict_cols = [c for c in ("NAMA", "LOKALITI", "DM", "DUN", "PARLIMEN") if c in df.columns]
            for group_no, (token, group_count) in enumerate(repeated.items(), start=1):
                if group_no > self.config.duplicate_group_limit:
                    break
                mask = id_tokens == token
                group = df.loc[mask]
                conflict_fields = []
                for c in conflict_cols:
                    unique = {
                        normalize_scalar_text(v)
                        for v in group[c].tolist()
                        if normalize_scalar_text(v) is not None
                    }
                    if len(unique) > 1:
                        conflict_fields.append(c)
                if conflict_fields:
                    identity_conflict_groups += 1
                for idx in group.index:
                    duplicate_rows.append({
                        "unit_name": unit.unit_name,
                        "duplicate_type": "IDENTITY_REPEAT",
                        "group_id": token,
                        "row_number": excel_row_number(idx),
                        "row_ref": self.privacy.row_token(unit.unit_name, excel_row_number(idx)),
                        "group_size": int(group_count),
                        "conflict_fields": "|".join(conflict_fields),
                        "confidence": 1.0,
                    })
                if conflict_fields:
                    anomalies.append(self._issue(
                        unit,
                        excel_row_number(group.index[0]),
                        id_col,
                        "IDENTITY_REPEAT_WITH_CONFLICT",
                        "HIGH",
                        "Same privacy-safe identity token appears on rows with conflicting profile fields.",
                        None,
                        metrics={
                            "identity_token": token,
                            "group_size": int(group_count),
                            "conflict_fields": conflict_fields,
                        },
                    ))

        composite_groups = self._composite_duplicate_candidates(unit, df, duplicate_rows)

        report = {
            "exact_duplicate_groups": int(len(exact_group_hashes)),
            "exact_duplicate_rows": exact_duplicate_rows,
            "exact_duplicate_excess_rows": exact_duplicate_excess,
            "identity_duplicate_groups": identity_duplicate_groups,
            "identity_conflict_groups": identity_conflict_groups,
            "composite_candidate_groups": composite_groups,
            "raw_identity_emitted": False,
        }
        return report, duplicate_rows, anomalies

    def _composite_duplicate_candidates(
        self,
        unit: DataUnit,
        df: "pd.DataFrame",
        duplicate_rows: list[dict[str, Any]],
    ) -> int:
        name_col = first_present(df.columns, ("NAMA", "NAME", "FULL_NAME"))
        locality_col = first_present(df.columns, ("LOKALITI", "LOCALITY"))
        year_col = first_present(df.columns, ("TAHUN_LAHIR", "BIRTH_YEAR", "YEAR_OF_BIRTH"))
        age_col = first_present(df.columns, ("UMUR", "AGE"))
        if name_col is None or locality_col is None or (year_col is None and age_col is None):
            return 0

        keys: list[str | None] = []
        for _, row in df.iterrows():
            name = normalize_name(row[name_col])
            locality = normalize_place(row[locality_col])
            year = parse_integer(row[year_col]) if year_col else None
            if year is None and age_col:
                age = parse_integer(row[age_col])
                year = dt.datetime.now(dt.timezone.utc).year - age if age is not None else None
            if not name or not locality or year is None:
                keys.append(None)
            else:
                raw = f"{name}|{year}|{locality}"
                keys.append(self.privacy.token(raw, "COMPOSITE_DUP", 22))

        key_series = pd.Series(keys, index=df.index, dtype="object")
        repeated = key_series.dropna().value_counts()
        repeated = repeated[repeated > 1]
        for group_no, (token, count) in enumerate(repeated.items(), start=1):
            if group_no > self.config.duplicate_group_limit:
                break
            idxs = key_series[key_series == token].index.tolist()
            for idx in idxs:
                duplicate_rows.append({
                    "unit_name": unit.unit_name,
                    "duplicate_type": "COMPOSITE_CANDIDATE",
                    "group_id": token,
                    "row_number": excel_row_number(idx),
                    "row_ref": self.privacy.row_token(unit.unit_name, excel_row_number(idx)),
                    "group_size": int(count),
                    "confidence": 0.75,
                    "basis": "NORMALIZED_NAME|BIRTH_YEAR_OR_AGE|LOCALITY",
                })
        return int(len(repeated))

    def _profile_hierarchy(
        self, unit: DataUnit, df: "pd.DataFrame"
    ) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
        rows: list[dict[str, Any]] = []
        anomalies: list[dict[str, Any]] = []
        relationship_reports: list[dict[str, Any]] = []

        for child, parent in HIERARCHY_RELATIONSHIPS:
            if child not in df.columns or parent not in df.columns:
                relationship_reports.append({
                    "child_field": child,
                    "parent_field": parent,
                    "status": "NOT_TESTED_MISSING_FIELD",
                    "conflicting_child_values": 0,
                })
                continue
            pairs = df[[child, parent]].dropna().copy()
            if pairs.empty:
                relationship_reports.append({
                    "child_field": child,
                    "parent_field": parent,
                    "status": "NOT_TESTED_NO_COMPLETE_PAIRS",
                    "conflicting_child_values": 0,
                })
                continue
            pairs[child] = pairs[child].map(normalize_place)
            pairs[parent] = pairs[parent].map(normalize_place)
            pairs = pairs.dropna()
            parent_counts = pairs.groupby(child, dropna=True)[parent].nunique(dropna=True)
            conflicts = parent_counts[parent_counts > 1]

            relationship_reports.append({
                "child_field": child,
                "parent_field": parent,
                "status": "CONFLICT" if len(conflicts) else "CONSISTENT",
                "tested_pairs": int(len(pairs)),
                "unique_child_values": int(pairs[child].nunique()),
                "conflicting_child_values": int(len(conflicts)),
            })

            for child_value, parent_count in conflicts.items():
                subset = pairs[pairs[child] == child_value]
                parent_values = sorted(subset[parent].dropna().unique().tolist())
                child_token = self.privacy.token(child_value, f"HIER_{child}", 18)
                rows.append({
                    "unit_name": unit.unit_name,
                    "child_field": child,
                    "parent_field": parent,
                    "child_value": child_value,
                    "child_token": child_token,
                    "parent_count": int(parent_count),
                    "parent_values": " | ".join(parent_values[:20]),
                    "status": "CONFLICT",
                })
                source_idxs = df[
                    df[child].map(normalize_place) == child_value
                ].index.tolist()
                if source_idxs:
                    anomalies.append(self._issue(
                        unit,
                        excel_row_number(source_idxs[0]),
                        f"{child}->{parent}",
                        "HIERARCHY_CONFLICT",
                        "HIGH",
                        f"One normalized {child} maps to multiple {parent} values.",
                        None,
                        metrics={
                            "child_token": child_token,
                            "parent_count": int(parent_count),
                            "parent_values": parent_values[:20],
                        },
                    ))

        report = {
            "relationships": relationship_reports,
            "total_conflicting_child_values": int(sum(r.get("conflicting_child_values", 0) for r in relationship_reports)),
        }
        return report, rows, anomalies

    def _profile_variants(
        self, unit: DataUnit, df: "pd.DataFrame"
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        rows: list[dict[str, Any]] = []
        report_items: list[dict[str, Any]] = []
        candidate_fields = [c for c in ("LOKALITI", "DM", "DUN", "PARLIMEN", "NEGERI") if c in df.columns]

        for col in candidate_fields:
            values = [normalize_scalar_text(v) for v in df[col].dropna().tolist()]
            values = [v for v in values if v]
            counts = Counter(values)
            unique_values = list(counts)
            if len(unique_values) > self.config.locality_max_unique:
                report_items.append({
                    "field": col,
                    "status": "SKIPPED_TOO_MANY_UNIQUE_VALUES",
                    "unique_values": len(unique_values),
                    "limit": self.config.locality_max_unique,
                })
                continue

            candidates = find_string_variant_candidates(
                unique_values,
                threshold=self.config.locality_similarity_threshold,
            )
            for left, right, similarity in candidates:
                rows.append({
                    "unit_name": unit.unit_name,
                    "field": col,
                    "value_a": left,
                    "value_b": right,
                    "count_a": counts[left],
                    "count_b": counts[right],
                    "similarity": round(similarity, 4),
                    "status": "REVIEW_REQUIRED",
                })
            report_items.append({
                "field": col,
                "status": "PROFILED",
                "unique_values": len(unique_values),
                "variant_candidates": len(candidates),
                "threshold": self.config.locality_similarity_threshold,
            })

        return {"fields": report_items, "total_variant_candidates": len(rows)}, rows

    def _profile_cross_unit(
        self, units: Sequence[DataUnit]
    ) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
        if len(units) <= 1:
            return {
                "unit_count": len(units),
                "status": "NOT_REQUIRED_SINGLE_UNIT",
                "cross_unit_identity_repeats": 0,
                "schema_drift": [],
            }, {"anomalies": [], "duplicates": [], "schema": []}

        schema_sets = {u.unit_name: {normalize_key(c) for c in u.frame.columns} for u in units}
        all_cols = sorted(set().union(*schema_sets.values()))
        schema_drift = []
        schema_rows = []
        for col in all_cols:
            presence = {name: col in cols for name, cols in schema_sets.items()}
            present_count = sum(presence.values())
            if present_count != len(units):
                schema_drift.append({
                    "column": col,
                    "present_in_units": [k for k, v in presence.items() if v],
                    "missing_in_units": [k for k, v in presence.items() if not v],
                })
                schema_rows.append({
                    "unit_name": "*CROSS_UNIT*",
                    "source_column": col,
                    "resolved_column": col,
                    "status": "SCHEMA_DRIFT",
                    "present_in_units": " | ".join(k for k, v in presence.items() if v),
                    "missing_in_units": " | ".join(k for k, v in presence.items() if not v),
                })

        identity_occurrences: defaultdict[str, list[tuple[str, int]]] = defaultdict(list)
        for unit in units:
            resolution = resolve_columns(unit.frame.columns, self.contract)
            df = normalize_nulls_frame(apply_column_resolution(unit.frame, resolution), self.config.null_tokens)
            id_cols = [c for c in df.columns if is_sensitive_field(c)]
            if not id_cols:
                continue
            id_col = choose_primary_identity_column(id_cols)
            for idx, value in df[id_col].items():
                token = self.privacy.token(normalize_identity_value(value), "VOTER_ID", 24)
                if token:
                    identity_occurrences[token].append((unit.unit_name, excel_row_number(idx)))

        cross_repeats = {k: v for k, v in identity_occurrences.items() if len({u for u, _ in v}) > 1}
        duplicate_rows: list[dict[str, Any]] = []
        for token, refs in list(cross_repeats.items())[: self.config.duplicate_group_limit]:
            for unit_name, row_number in refs:
                duplicate_rows.append({
                    "unit_name": unit_name,
                    "duplicate_type": "CROSS_UNIT_IDENTITY_REPEAT",
                    "group_id": token,
                    "row_number": row_number,
                    "row_ref": self.privacy.row_token(unit_name, row_number),
                    "group_size": len(refs),
                    "confidence": 1.0,
                })

        report = {
            "unit_count": len(units),
            "status": "PROFILED",
            "schema_drift": schema_drift,
            "cross_unit_identity_repeats": len(cross_repeats),
        }
        return report, {"anomalies": [], "duplicates": duplicate_rows, "schema": schema_rows}

    def _issue(
        self,
        unit: DataUnit,
        row_number: int,
        field_name: str,
        code: str,
        severity: str,
        message: str,
        observed_value: Any,
        metrics: Mapping[str, Any] | None = None,
    ) -> dict[str, Any]:
        self._anomaly_counts[code] += 1
        return {
            "unit_name": unit.unit_name,
            "row_number": row_number,
            "row_ref": self.privacy.row_token(unit.unit_name, row_number),
            "field": field_name,
            "code": code,
            "severity": severity,
            "message": message,
            "observed_value": self.privacy.redact(observed_value, field_name),
            "metrics": json_compact(metrics or {}),
            "evidence_ref": f"{self.run_id}:{unit.unit_name}:{row_number}:{code}",
        }

    def _write_outputs(
        self,
        source_path: Path,
        report: dict[str, Any],
        tables: Mapping[str, "pd.DataFrame"],
    ) -> dict[str, str]:
        output_dir = self.config.output_dir.expanduser().resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        stem = safe_filename(source_path.stem)
        run_dir = output_dir / f"{stem}__{self.run_id}"
        run_dir.mkdir(parents=True, exist_ok=False)

        report_json = run_dir / "profile-report.json"
        safe_write_json(report_json, report)

        paths: dict[str, str] = {"run_dir": str(run_dir), "report_json": str(report_json)}

        if self.config.write_csv_details:
            csv_map = {
                "anomalies": "profile-anomalies.csv",
                "duplicates": "profile-duplicate-candidates.csv",
                "schema": "profile-schema-mismatch.csv",
                "hierarchy": "profile-hierarchy-conflicts.csv",
                "variants": "profile-variant-candidates.csv",
                "nulls": "profile-null-distribution.csv",
                "columns": "profile-column-statistics.csv",
                "recommendations": "profile-recommendations.csv",
            }
            for table_name, filename in csv_map.items():
                frame = tables.get(table_name)
                if frame is None:
                    continue
                path = run_dir / filename
                frame.to_csv(path, index=False, encoding="utf-8-sig")
                paths[f"csv_{table_name}"] = str(path)

        if self.config.write_excel_summary:
            excel_path = run_dir / "profile-summary.xlsx"
            try:
                with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
                    for table_name in (
                        "units",
                        "schema",
                        "nulls",
                        "columns",
                        "anomalies",
                        "duplicates",
                        "hierarchy",
                        "variants",
                        "recommendations",
                    ):
                        frame = tables.get(table_name)
                        if frame is None:
                            continue
                        safe_frame = frame.copy()
                        # Excel hard row limit; preserve full details in CSV.
                        if len(safe_frame) > 1_048_000:
                            safe_frame = safe_frame.head(1_048_000)
                        safe_frame.to_excel(writer, sheet_name=table_name[:31], index=False)
                paths["summary_excel"] = str(excel_path)
            except ImportError as exc:
                self.logger.warning("Excel summary skipped; openpyxl missing: %s", exc)
            except Exception as exc:
                self.logger.warning("Excel summary could not be written: %s", exc)

        manifest = {
            "artifact": "PIP_VOTER_DATA_PROFILE_OUTPUT",
            "profiler_version": PROFILER_VERSION,
            "run_id": self.run_id,
            "generated_at": iso_z(dt.datetime.now(dt.timezone.utc)),
            "source_file": {
                "name": source_path.name,
                "size_bytes": source_path.stat().st_size,
                "sha256": sha256_file(source_path),
            },
            "privacy": {
                "raw_ic_emitted": False,
                "identity_token_mode": "EPHEMERAL_RUN" if self._salt_is_ephemeral else "STABLE_CONFIGURED",
            },
            "outputs": paths,
        }
        manifest_path = run_dir / "profile-manifest.json"
        safe_write_json(manifest_path, manifest)
        paths["manifest_json"] = str(manifest_path)
        return paths


# ---------------------------------------------------------------------------
# Ontology contract compilation
# ---------------------------------------------------------------------------


def resolve_contract_expected_source_field_count(
    contract: Mapping[str, Any],
    *,
    discovered_source_field_count: int,
    override: int | None = None,
) -> tuple[int, str]:
    """
    Resolve expected physical source field count.

    Precedence:
      1. explicit CLI/config override
      2. source_scope.expected_source_field_count
      3. source_scope.physical_source_field_count
      4. schema.expected_source_field_count
      5. runtime_adapter.expected_source_field_count
      6. compatibility.physical_field_count
      7. discovered source mapping count
      8. legacy fallback (47)
    """
    if override is not None:
        if override <= 0:
            raise OntologyContractError(
                "expected source field count override must be greater than zero"
            )
        return int(override), "CONFIG_OVERRIDE"

    candidate_paths = (
        ("source_scope", "expected_source_field_count"),
        ("source_scope", "physical_source_field_count"),
        ("schema", "expected_source_field_count"),
        ("runtime_adapter", "expected_source_field_count"),
        ("compatibility", "physical_field_count"),
    )

    for path_parts in candidate_paths:
        value: Any = contract
        valid_path = True
        for part in path_parts:
            if not isinstance(value, Mapping) or part not in value:
                valid_path = False
                break
            value = value[part]
        if not valid_path:
            continue
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            return parsed, "CONTRACT_METADATA:" + ".".join(path_parts)

    if discovered_source_field_count > 0:
        return discovered_source_field_count, "DISCOVERED_MAPPING_COUNT"

    return LEGACY_EXPECTED_SOURCE_FIELD_COUNT, "LEGACY_FALLBACK"


def extract_privacy_removed_fields(contract: Mapping[str, Any]) -> tuple[str, ...]:
    privacy_model = contract.get("privacy_model")
    if not isinstance(privacy_model, Mapping):
        return ()

    declared = privacy_model.get("privacy_removed_fields", ())
    if not isinstance(declared, Sequence) or isinstance(declared, (str, bytes)):
        return ()

    fields: list[str] = []
    for item in declared:
        if isinstance(item, str):
            fields.append(normalize_key(item))
        elif isinstance(item, Mapping):
            value = first_non_null(
                item.get("field_name"),
                item.get("field"),
                item.get("source_field"),
            )
            if value:
                fields.append(normalize_key(value))
    return tuple(dedupe_preserve_order(fields))


def detect_canonical_hash_contract(contract: Mapping[str, Any], mappings: Sequence[FieldMapping]) -> bool:
    if any(
        normalize_key(m.source_field) == "VOTER_ID_HASH"
        or normalize_key(m.canonical_field) == "VOTER_ID_HASH"
        for m in mappings
    ):
        return True

    identity_model = contract.get("identity_model")
    if isinstance(identity_model, Mapping):
        canonical = first_non_null(
            identity_model.get("canonical_identity_field"),
            identity_model.get("canonicalIdentityField"),
        )
        if normalize_key(canonical) == "VOTER_ID_HASH":
            return True

    derived = contract.get("derived_fields")
    if isinstance(derived, Sequence) and not isinstance(derived, (str, bytes)):
        for item in derived:
            if isinstance(item, str) and normalize_key(item) == "VOTER_ID_HASH":
                return True
            if isinstance(item, Mapping):
                value = first_non_null(
                    item.get("derived_field"),
                    item.get("field"),
                    item.get("canonical_field"),
                )
                if normalize_key(value) == "VOTER_ID_HASH":
                    return True

    return False


def compile_ontology_contract(
    ontology: Mapping[str, Any],
    *,
    expected_source_field_count: int | None = None,
    strict: bool = False,
) -> OntologyContract:
    if not isinstance(ontology, Mapping):
        raise OntologyContractError("Ontology/source-contract JSON root must be an object")

    raw_mappings = extract_field_mappings(ontology)
    mappings: list[FieldMapping] = []
    seen: set[tuple[str | None, str | None]] = set()
    for raw in raw_mappings:
        mapping = normalize_field_mapping(raw)
        if mapping.source_field is None and mapping.canonical_field is None:
            continue
        key = (mapping.source_field, mapping.canonical_field)
        if key in seen:
            continue
        seen.add(key)
        mappings.append(mapping)

    source_fields = dedupe_preserve_order(
        m.source_field
        for m in mappings
        if m.source_field and normalize_key(m.source_field) != "VOTER_ID_HASH"
    )

    resolved_expected_count, expected_count_source = (
        resolve_contract_expected_source_field_count(
            ontology,
            discovered_source_field_count=len(source_fields),
            override=expected_source_field_count,
        )
    )

    has_hash = detect_canonical_hash_contract(ontology, mappings)
    privacy_removed_fields = extract_privacy_removed_fields(ontology)

    contract_type = str(first_non_null(
        ontology.get("contract_type"),
        ontology.get("contractType"),
        "ontology",
    ))

    identity_model = ontology.get("identity_model")
    if not isinstance(identity_model, Mapping):
        identity_model = {}

    source_identity_field = first_non_null(
        identity_model.get("source_identity_field"),
        identity_model.get("sourceIdentityField"),
    )
    masked_label_field = first_non_null(
        identity_model.get("masked_label_field"),
        identity_model.get("maskedLabelField"),
    )
    canonical_identity_field = first_non_null(
        identity_model.get("canonical_identity_field"),
        identity_model.get("canonicalIdentityField"),
        "VOTER_ID_HASH" if has_hash else None,
    )

    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    if len(source_fields) != resolved_expected_count:
        errors.append({
            "code": "SOURCE_FIELD_COUNT_MISMATCH",
            "expected": resolved_expected_count,
            "actual": len(source_fields),
            "expected_count_source": expected_count_source,
        })

    if not has_hash:
        errors.append({"code": "CANONICAL_VOTER_ID_HASH_CONTRACT_MISSING"})

    if not mappings:
        errors.append({"code": "FIELD_MAPPINGS_NOT_DISCOVERED"})

    # Privacy-removed fields are intentional absences. They must not appear in
    # the physical source mapping list.
    source_field_set = {normalize_key(field) for field in source_fields}
    privacy_overlap = sorted(
        field
        for field in privacy_removed_fields
        if normalize_key(field) in source_field_set
    )
    if privacy_overlap:
        errors.append({
            "code": "PRIVACY_REMOVED_FIELDS_PRESENT_IN_SOURCE_MAPPINGS",
            "fields": privacy_overlap,
        })

    validation = {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "field_mapping_count": len(mappings),
        "source_field_count": len(source_fields),
        "expected_source_field_count": resolved_expected_count,
        "expected_source_field_count_source": expected_count_source,
        "has_canonical_voter_id_hash": has_hash,
        "contract_type": contract_type,
        "privacy_removed_field_count": len(privacy_removed_fields),
        "source_identity_field": normalize_key(source_identity_field) if source_identity_field else None,
        "masked_label_field": normalize_key(masked_label_field) if masked_label_field else None,
        "canonical_identity_field": normalize_key(canonical_identity_field) if canonical_identity_field else None,
        "mode": (
            "SOURCE_CONTRACT"
            if normalize_key(contract_type) == "PIP_VOTER_SOURCE_CONTRACT"
            else "ONTOLOGY_CONTRACT"
        ),
    }

    if strict and errors:
        raise OntologyContractError(
            "Contract validation failed: " + json.dumps(errors, ensure_ascii=False)
        )

    alias_map: dict[str, str] = {}
    for m in mappings:
        if not m.source_field:
            continue
        source = normalize_key(m.source_field)
        alias_map[source] = m.source_field
        for alias in m.aliases:
            alias_map[normalize_key(alias)] = m.source_field
        for alias in CORE_FIELD_ALIASES.get(source, ()):
            alias_map[normalize_key(alias)] = m.source_field

    contract_id = first_non_null(
        ontology.get("contract_id"),
        ontology.get("contractId"),
        ontology.get("id"),
        ontology.get("name"),
        "PIP_VOTER_INTELLIGENCE_CONTRACT",
    )
    version = first_non_null(
        ontology.get("version"),
        ontology.get("ontology_version"),
        ontology.get("ontologyVersion"),
        "1.0",
    )

    return OntologyContract(
        contract_id=str(contract_id),
        version=str(version),
        field_mappings=tuple(mappings),
        source_fields=tuple(source_fields),
        alias_to_source=alias_map,
        validation=validation,
        raw=ontology,
        expected_source_field_count=resolved_expected_count,
        contract_type=contract_type,
        privacy_removed_fields=privacy_removed_fields,
        source_identity_field=normalize_key(source_identity_field) if source_identity_field else None,
        masked_label_field=normalize_key(masked_label_field) if masked_label_field else None,
        canonical_identity_field=normalize_key(canonical_identity_field) if canonical_identity_field else None,
    )


def build_degraded_contract(expected_source_field_count: int | None) -> OntologyContract:
    resolved_expected = (
        int(expected_source_field_count)
        if expected_source_field_count is not None
        else LEGACY_EXPECTED_SOURCE_FIELD_COUNT
    )
    fields = tuple(CORE_FIELD_ALIASES.keys())
    mappings = tuple(
        FieldMapping(source_field=f, canonical_field=f, aliases=CORE_FIELD_ALIASES[f])
        for f in fields
    )
    alias_map: dict[str, str] = {}
    for source, aliases in CORE_FIELD_ALIASES.items():
        alias_map[normalize_key(source)] = source
        for alias in aliases:
            alias_map[normalize_key(alias)] = source
    return OntologyContract(
        contract_id="PIP_VOTER_INTELLIGENCE_ONTOLOGY_DEGRADED",
        version="1.1-degraded",
        field_mappings=mappings,
        source_fields=fields,
        alias_to_source=alias_map,
        validation={
            "valid": False,
            "errors": [{
                "code": "ONTOLOGY_CONTRACT_NOT_LOADED",
                "expected_source_field_count": resolved_expected,
                "known_core_field_count": len(fields),
            }],
            "warnings": [{"code": "PROFILE_RESULTS_ARE_DEGRADED"}],
            "field_mapping_count": len(mappings),
            "source_field_count": len(fields),
            "expected_source_field_count": resolved_expected,
            "expected_source_field_count_source": (
                "CONFIG_OVERRIDE"
                if expected_source_field_count is not None
                else "LEGACY_FALLBACK"
            ),
            "has_canonical_voter_id_hash": False,
            "mode": "DEGRADED_CORE_ALIASES",
        },
        raw={},
        expected_source_field_count=resolved_expected,
        contract_type="degraded",
    )


def extract_field_mappings(root: Mapping[str, Any]) -> list[Any]:
    preferred_keys = {
        "fieldmappings",
        "field_mappings",
        "fieldmapping",
        "mappings",
        "sourcemappings",
        "source_field_mappings",
    }
    candidates: list[list[Any]] = []

    def walk(value: Any, key_name: str | None = None) -> None:
        if isinstance(value, Mapping):
            for key, child in value.items():
                nk = normalize_key(key).lower()
                if nk in preferred_keys:
                    converted = mapping_container_to_list(child)
                    if converted:
                        candidates.append(converted)
                walk(child, str(key))
        elif isinstance(value, list):
            if looks_like_mapping_list(value):
                candidates.append(value)
            for child in value:
                walk(child, key_name)

    walk(root)
    if not candidates:
        return []
    # Prefer the candidate with the most mapping-like entries.
    return max(candidates, key=len)


def mapping_container_to_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, Mapping):
        rows: list[Any] = []
        for key, item in value.items():
            if isinstance(item, Mapping):
                copy = dict(item)
                copy.setdefault("source_field", key)
                rows.append(copy)
            else:
                rows.append({"source_field": key, "canonical_field": item})
        return rows
    return []


def looks_like_mapping_list(value: Sequence[Any]) -> bool:
    if not value:
        return False
    inspected = [item for item in value[:10] if isinstance(item, Mapping)]
    if not inspected:
        return False
    mapping_keys = {
        "sourcefield", "source_field", "source", "field", "inputfield", "input_field",
        "canonicalfield", "canonical_field", "targetfield", "target_field", "canonical",
    }
    hits = 0
    for item in inspected:
        keys = {normalize_key(k).lower() for k in item.keys()}
        if keys & mapping_keys:
            hits += 1
    return hits >= max(1, len(inspected) // 2)


def normalize_field_mapping(raw: Any) -> FieldMapping:
    if isinstance(raw, str):
        return FieldMapping(source_field=normalize_key(raw), canonical_field=normalize_key(raw), raw={"value": raw})
    if not isinstance(raw, Mapping):
        return FieldMapping(None, None, raw={"value": raw})

    source = first_non_null(
        lookup_ci(raw, "source_field"), lookup_ci(raw, "sourceField"),
        lookup_ci(raw, "source"), lookup_ci(raw, "input_field"),
        lookup_ci(raw, "inputField"), lookup_ci(raw, "field"),
    )
    canonical = first_non_null(
        lookup_ci(raw, "canonical_field"), lookup_ci(raw, "canonicalField"),
        lookup_ci(raw, "target_field"), lookup_ci(raw, "targetField"),
        lookup_ci(raw, "canonical"), lookup_ci(raw, "ontology_field"),
    )
    aliases_raw = first_non_null(lookup_ci(raw, "aliases"), lookup_ci(raw, "alias"), [])
    if isinstance(aliases_raw, str):
        aliases = tuple(a.strip() for a in re.split(r"[,|;]", aliases_raw) if a.strip())
    elif isinstance(aliases_raw, Sequence):
        aliases = tuple(str(a).strip() for a in aliases_raw if str(a).strip())
    else:
        aliases = ()

    return FieldMapping(
        source_field=normalize_key(source) if source is not None else None,
        canonical_field=normalize_key(canonical) if canonical is not None else None,
        aliases=aliases,
        declared_type=str(first_non_null(lookup_ci(raw, "type"), lookup_ci(raw, "data_type"), "")) or None,
        required=as_optional_bool(first_non_null(lookup_ci(raw, "required"), lookup_ci(raw, "mandatory"))),
        raw=dict(raw),
    )


# ---------------------------------------------------------------------------
# Input loading
# ---------------------------------------------------------------------------


def load_data_units(path: Path, config: ProfilerConfig, logger: logging.Logger) -> list[DataUnit]:
    ext = path.suffix.lower()
    if ext in {".xlsx", ".xls", ".xlsm"}:
        return load_excel_units(path, config, logger)
    if ext in {".csv", ".tsv", ".txt"}:
        return [load_delimited_unit(path, config)]
    if ext in {".json"}:
        return load_json_units(path, config)
    if ext in {".jsonl", ".ndjson"}:
        return [load_jsonl_unit(path, config)]
    raise InputReadError(f"Unsupported input extension: {ext}")


def load_excel_units(path: Path, config: ProfilerConfig, logger: logging.Logger) -> list[DataUnit]:
    try:
        workbook = pd.ExcelFile(path)
    except Exception as exc:
        raise InputReadError(f"Unable to open Excel workbook '{path}': {exc}") from exc

    available = workbook.sheet_names
    if config.sheets:
        selected = [s for s in config.sheets if s in available]
        missing = [s for s in config.sheets if s not in available]
        if missing:
            logger.warning("Requested sheets not found: %s", ", ".join(missing))
    elif config.include_all_sheets:
        selected = available
    else:
        selected = available[:1]

    units: list[DataUnit] = []
    for sheet in selected:
        try:
            frame = pd.read_excel(
                path,
                sheet_name=sheet,
                dtype=object,
                nrows=config.max_rows,
            )
        except Exception as exc:
            raise InputReadError(f"Unable to read sheet '{sheet}': {exc}") from exc
        units.append(DataUnit(
            source_path=path,
            unit_name=str(sheet),
            frame=frame,
            input_kind="EXCEL_SHEET",
            metadata={"sheet_name": str(sheet), "workbook_sheet_count": len(available)},
        ))
    return units


def load_delimited_unit(path: Path, config: ProfilerConfig) -> DataUnit:
    encoding = detect_text_encoding(path)
    sep = "\t" if path.suffix.lower() == ".tsv" else None
    try:
        frame = pd.read_csv(
            path,
            dtype=object,
            encoding=encoding,
            sep=sep,
            engine="python" if sep is None else "c",
            nrows=config.max_rows,
            keep_default_na=False,
            na_filter=False,
            on_bad_lines="warn",
        )
    except Exception as exc:
        raise InputReadError(f"Unable to read delimited file '{path}': {exc}") from exc
    return DataUnit(
        source_path=path,
        unit_name=path.stem,
        frame=frame,
        input_kind="DELIMITED_TEXT",
        metadata={"encoding": encoding, "separator": sep or "AUTO_DETECT"},
    )


def load_json_units(path: Path, config: ProfilerConfig) -> list[DataUnit]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        raise InputReadError(f"Unable to read JSON file '{path}': {exc}") from exc

    units: list[DataUnit] = []
    if isinstance(payload, list):
        records = payload[: config.max_rows] if config.max_rows else payload
        units.append(DataUnit(path, path.stem, pd.DataFrame(records), "JSON_RECORD_ARRAY"))
        return units

    if isinstance(payload, Mapping):
        # Common wrappers: records, data, rows, voters. If multiple list-of-dict
        # sections exist, treat each as a logical unit.
        for key, value in payload.items():
            if isinstance(value, list) and (not value or isinstance(value[0], Mapping)):
                records = value[: config.max_rows] if config.max_rows else value
                units.append(DataUnit(
                    path,
                    str(key),
                    pd.DataFrame(records),
                    "JSON_RECORD_SECTION",
                    metadata={"json_key": str(key)},
                ))
        if units:
            return units
        units.append(DataUnit(path, path.stem, pd.DataFrame([payload]), "JSON_OBJECT"))
        return units

    raise InputReadError("JSON root must be an object or array")


def load_jsonl_unit(path: Path, config: ProfilerConfig) -> DataUnit:
    records = []
    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            for line_no, line in enumerate(handle, start=1):
                if config.max_rows is not None and len(records) >= config.max_rows:
                    break
                text = line.strip()
                if not text:
                    continue
                value = json.loads(text)
                if not isinstance(value, Mapping):
                    raise InputReadError(f"JSONL line {line_no} is not an object")
                records.append(value)
    except InputReadError:
        raise
    except Exception as exc:
        raise InputReadError(f"Unable to read JSONL file '{path}': {exc}") from exc
    return DataUnit(path, path.stem, pd.DataFrame(records), "JSONL")


def detect_text_encoding(path: Path) -> str:
    sample = path.read_bytes()[:262_144]
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
        try:
            sample.decode(enc)
            return enc
        except UnicodeDecodeError:
            continue
    return "latin1"


# ---------------------------------------------------------------------------
# Schema, null and column profiling
# ---------------------------------------------------------------------------


def resolve_columns(columns: Iterable[Any], contract: OntologyContract | None) -> dict[str, Any]:
    originals = [str(c) for c in columns]
    alias_map = dict(contract.alias_to_source) if contract else {}
    resolved_pairs: list[dict[str, Any]] = []
    target_counts: Counter[str] = Counter()

    for original in originals:
        normalized = normalize_key(original)
        target = alias_map.get(normalized, normalized)
        target_counts[target] += 1
        resolved_pairs.append({
            "original": original,
            "normalized": normalized,
            "resolved": target,
            "match_type": "ONTOLOGY_ALIAS" if normalized in alias_map and target != normalized else (
                "ONTOLOGY_EXACT" if normalized in alias_map else "NORMALIZED_ONLY"
            ),
        })

    # Prevent silent overwriting when multiple source columns resolve to the same
    # contract field. Keep first canonical name, suffix subsequent columns.
    used: Counter[str] = Counter()
    rename_map: dict[str, str] = {}
    for item in resolved_pairs:
        target = item["resolved"]
        used[target] += 1
        actual_target = target if used[target] == 1 else f"{target}__DUP{used[target]}"
        item["resolved_unique"] = actual_target
        item["collision"] = target_counts[target] > 1
        rename_map[item["original"]] = actual_target

    return {
        "pairs": resolved_pairs,
        "rename_map": rename_map,
        "collisions": [p for p in resolved_pairs if p["collision"]],
    }


def apply_column_resolution(df: "pd.DataFrame", resolution: Mapping[str, Any]) -> "pd.DataFrame":
    result = df.copy()
    result.columns = [resolution["rename_map"].get(str(c), normalize_key(c)) for c in df.columns]
    return result


def normalize_nulls_frame(df: "pd.DataFrame", null_tokens: set[str]) -> "pd.DataFrame":
    tokens = {normalize_key(t) for t in null_tokens}
    result = df.copy()
    for col in result.columns:
        result[col] = result[col].map(lambda v: None if is_nullish(v, tokens) else v)
    return result


def profile_schema(
    unit: DataUnit,
    raw_df: "pd.DataFrame",
    resolved_df: "pd.DataFrame",
    resolution: Mapping[str, Any],
    contract: OntologyContract | None,
) -> dict[str, Any]:
    expected = list(contract.source_fields) if contract else []
    present_base = [re.sub(r"__DUP\d+$", "", str(c)) for c in resolved_df.columns]
    present_set = set(present_base)
    expected_set = set(expected)
    missing = [f for f in expected if f not in present_set]
    unknown = [c for c in present_base if c not in expected_set] if expected else []
    duplicate_targets = sorted({
        re.sub(r"__DUP\d+$", "", str(c))
        for c in resolved_df.columns
        if re.search(r"__DUP\d+$", str(c))
    })
    coverage = (len(expected_set & present_set) / len(expected_set) * 100.0) if expected_set else None

    rows = []
    for pair in resolution["pairs"]:
        base_target = pair["resolved"]
        status = "EXPECTED_PRESENT" if (not expected or base_target in expected_set) else "UNKNOWN_COLUMN"
        if pair["collision"]:
            status = "DUPLICATE_RESOLUTION_TARGET"
        rows.append({
            "unit_name": unit.unit_name,
            "source_column": pair["original"],
            "normalized_column": pair["normalized"],
            "resolved_column": pair["resolved_unique"],
            "contract_field": base_target if base_target in expected_set else "",
            "match_type": pair["match_type"],
            "status": status,
        })
    for field_name in missing:
        rows.append({
            "unit_name": unit.unit_name,
            "source_column": "",
            "normalized_column": "",
            "resolved_column": "",
            "contract_field": field_name,
            "match_type": "",
            "status": "MISSING_EXPECTED_FIELD",
        })

    return {
        "expected_field_count": len(expected),
        "raw_column_count": len(raw_df.columns),
        "resolved_column_count": len(resolved_df.columns),
        "expected_fields_present": len(expected_set & present_set),
        "coverage_percent": round(coverage, 3) if coverage is not None else None,
        "missing_fields": missing,
        "unknown_columns": sorted(set(unknown)),
        "duplicate_resolution_targets": duplicate_targets,
        "table_rows": rows,
    }


def profile_nulls(unit: DataUnit, df: "pd.DataFrame") -> tuple[dict[str, Any], list[dict[str, Any]]]:
    rows = []
    total_cells = max(1, len(df) * max(1, len(df.columns)))
    total_nulls = 0
    for col in df.columns:
        null_count = int(df[col].isna().sum())
        total_nulls += null_count
        pct = (null_count / len(df) * 100.0) if len(df) else 0.0
        rows.append({
            "unit_name": unit.unit_name,
            "field": col,
            "row_count": len(df),
            "null_count": null_count,
            "null_percent": round(pct, 4),
            "non_null_count": int(len(df) - null_count),
        })
    report = {
        "total_cells": total_cells,
        "total_null_cells": total_nulls,
        "overall_null_percent": round(total_nulls / total_cells * 100.0, 4),
        "fields_100_percent_null": [r["field"] for r in rows if r["null_percent"] == 100.0],
        "fields_over_50_percent_null": [r["field"] for r in rows if r["null_percent"] > 50.0],
    }
    return report, rows


def profile_columns(
    unit: DataUnit,
    df: "pd.DataFrame",
    *,
    top_values_limit: int,
    privacy: PrivacyGuard,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    rows = []
    summary = []
    for col in df.columns:
        series = df[col]
        non_null = series.dropna()
        distinct = int(non_null.map(normalize_scalar_text).nunique(dropna=True))
        semantic_type, semantic_confidence = infer_semantic_type(col, non_null)
        top_values: list[dict[str, Any]] = []
        if not is_report_sensitive_field(col):
            normalized = non_null.map(normalize_scalar_text).dropna()
            counts = normalized.value_counts().head(top_values_limit)
            top_values = [
                {"value": privacy.redact(value, col), "count": int(count)}
                for value, count in counts.items()
            ]
        row = {
            "unit_name": unit.unit_name,
            "field": col,
            "pandas_dtype": str(series.dtype),
            "semantic_type": semantic_type,
            "semantic_confidence": round(semantic_confidence, 4),
            "row_count": len(series),
            "non_null_count": int(len(non_null)),
            "null_count": int(series.isna().sum()),
            "distinct_count": distinct,
            "uniqueness_percent": round(distinct / len(non_null) * 100.0, 4) if len(non_null) else 0.0,
            "top_values_suppressed": is_report_sensitive_field(col),
            "top_values": json_compact(top_values),
        }
        rows.append(row)
        summary.append({
            "field": col,
            "semantic_type": semantic_type,
            "semantic_confidence": semantic_confidence,
            "distinct_count": distinct,
            "top_values_suppressed": is_report_sensitive_field(col),
        })
    return {"fields": summary}, rows


# ---------------------------------------------------------------------------
# Quality, confidence and recommendations
# ---------------------------------------------------------------------------


def calculate_unit_quality(
    *,
    df: "pd.DataFrame",
    schema_report: Mapping[str, Any],
    anomalies: Sequence[Mapping[str, Any]],
    duplicate_report: Mapping[str, Any],
    hierarchy_report: Mapping[str, Any],
) -> dict[str, Any]:
    total_cells = max(1, len(df) * max(1, len(df.columns)))
    null_cells = int(df.isna().sum().sum())
    completeness = clamp01(1.0 - null_cells / total_cells)

    coverage_pct = schema_report.get("coverage_percent")
    contract_coverage = clamp01((coverage_pct or 0.0) / 100.0) if coverage_pct is not None else 0.5

    severity_weights = {"LOW": 0.25, "MEDIUM": 1.0, "HIGH": 3.0, "CRITICAL": 5.0}
    anomaly_weight = sum(severity_weights.get(str(a.get("severity", "MEDIUM")).upper(), 1.0) for a in anomalies)
    validity = clamp01(1.0 - anomaly_weight / max(1.0, len(df) * 2.0))

    duplicate_excess = int(duplicate_report.get("exact_duplicate_excess_rows", 0))
    uniqueness = clamp01(1.0 - duplicate_excess / max(1, len(df)))

    hierarchy_conflicts = int(hierarchy_report.get("total_conflicting_child_values", 0))
    consistency = clamp01(1.0 - hierarchy_conflicts / max(1, len(df) * 0.05))

    weights = {
        "completeness": 0.25,
        "validity": 0.25,
        "uniqueness": 0.15,
        "consistency": 0.15,
        "contract_coverage": 0.20,
    }
    overall = (
        completeness * weights["completeness"]
        + validity * weights["validity"]
        + uniqueness * weights["uniqueness"]
        + consistency * weights["consistency"]
        + contract_coverage * weights["contract_coverage"]
    )
    return {
        "overall_score": round(overall * 100.0, 3),
        "dimensions": {
            "completeness": round(completeness * 100.0, 3),
            "validity": round(validity * 100.0, 3),
            "uniqueness": round(uniqueness * 100.0, 3),
            "consistency": round(consistency * 100.0, 3),
            "contract_coverage": round(contract_coverage * 100.0, 3),
        },
        "weights": weights,
        "interpretation": quality_band(overall * 100.0),
        "note": "Quality score is a profiler triage metric, not an electoral prediction score.",
    }


def calculate_profile_confidence(
    *,
    row_count: int,
    contract: OntologyContract | None,
    schema_report: Mapping[str, Any],
    sampled: bool,
) -> dict[str, Any]:
    contract_component = 1.0 if contract and contract.validation.get("valid") else 0.55
    row_component = min(1.0, math.log10(max(10, row_count)) / 5.0 + 0.2)
    coverage = schema_report.get("coverage_percent")
    coverage_component = (coverage / 100.0) if coverage is not None else 0.5
    sampling_component = 0.8 if sampled else 1.0
    score = (
        contract_component * 0.35
        + row_component * 0.20
        + coverage_component * 0.30
        + sampling_component * 0.15
    )
    return {
        "score": round(clamp01(score) * 100.0, 3),
        "band": quality_band(score * 100.0),
        "components": {
            "contract": round(contract_component * 100.0, 3),
            "row_volume": round(row_component * 100.0, 3),
            "schema_coverage": round(coverage_component * 100.0, 3),
            "sampling": round(sampling_component * 100.0, 3),
        },
    }


def aggregate_quality_summary(
    unit_reports: Sequence[Mapping[str, Any]],
    cross_unit_report: Mapping[str, Any],
) -> dict[str, Any]:
    if not unit_reports:
        return {"overall_score": 0.0, "band": "UNKNOWN"}
    total_rows = sum(int(u.get("rows", 0)) for u in unit_reports)
    weighted = 0.0
    for u in unit_reports:
        weight = int(u.get("rows", 0)) or 1
        weighted += float(u["quality"]["overall_score"]) * weight
    denominator = sum((int(u.get("rows", 0)) or 1) for u in unit_reports)
    score = weighted / max(1, denominator)
    return {
        "overall_score": round(score, 3),
        "band": quality_band(score),
        "total_rows_profiled": total_rows,
        "unit_count": len(unit_reports),
        "cross_unit_identity_repeats": int(cross_unit_report.get("cross_unit_identity_repeats", 0)),
    }


def build_recommendations(
    *,
    unit_reports: Sequence[Mapping[str, Any]],
    cross_unit_report: Mapping[str, Any],
    contract: OntologyContract | None,
) -> list[dict[str, Any]]:
    recs: list[dict[str, Any]] = []

    def add(priority: str, code: str, action: str, rationale: str) -> None:
        if code not in {r["code"] for r in recs}:
            recs.append({"priority": priority, "code": code, "action": action, "rationale": rationale})

    if not contract or not contract.validation.get("valid"):
        add(
            "P0",
            "FIX_ONTOLOGY_CONTRACT",
            "Load and validate pip-voter-intelligence-ontology-v1.0.json before production cleansing.",
            "Exact 47-field coverage and source-of-truth mapping cannot be guaranteed in degraded mode.",
        )

    for unit in unit_reports:
        schema = unit.get("schema", {})
        if schema.get("missing_fields"):
            add(
                "P0",
                "RESOLVE_MISSING_SOURCE_FIELDS",
                "Map, recover, or explicitly waive missing ontology source fields before canonical transformation.",
                "Missing source fields reduce ontology coverage and downstream score readiness.",
            )
        if schema.get("duplicate_resolution_targets"):
            add(
                "P0",
                "RESOLVE_COLUMN_COLLISIONS",
                "Resolve source columns that map to the same canonical field; do not merge silently.",
                "Alias collisions can overwrite evidence and break lineage.",
            )
        anomaly_counts = unit.get("anomaly_summary", {}).get("by_code", {})
        if any("SCIENTIFIC_NOTATION" in code for code in anomaly_counts):
            add(
                "P0",
                "REPAIR_EXCEL_IDENTIFIER_COERCION",
                "Recover identifier-like fields from authoritative source text before any deduplication or hashing.",
                "Scientific notation can cause irreversible precision loss.",
            )
        if anomaly_counts.get("IDENTITY_REPEAT_WITH_CONFLICT", 0):
            add(
                "P0",
                "QUARANTINE_IDENTITY_CONFLICTS",
                "Quarantine repeated identity tokens with conflicting profile fields for evidence-led review.",
                "Automatic resolution could merge different people or overwrite valid history.",
            )
        if anomaly_counts.get("HIERARCHY_CONFLICT", 0):
            add(
                "P1",
                "REVIEW_ELECTORAL_HIERARCHY",
                "Validate Lokaliti→DM→DUN→Parlimen→Negeri conflicts against an authoritative hierarchy reference.",
                "Hierarchy conflicts can create incorrect graph edges and geographic scores.",
            )
        if unit.get("duplicate_analysis", {}).get("exact_duplicate_excess_rows", 0):
            add(
                "P1",
                "DEDUPLICATE_EXACT_ROWS",
                "Remove exact duplicate excess rows in staging only, preserving a duplicate audit ledger.",
                "Exact duplicates distort counts, density metrics, and network weights.",
            )
        if unit.get("variant_analysis", {}).get("total_variant_candidates", 0):
            add(
                "P2",
                "REVIEW_PLACE_NAME_VARIANTS",
                "Review high-similarity locality and electoral-area spellings before applying alias mappings.",
                "Near-duplicate place names may be spelling variants or genuinely different locations.",
            )
        if unit.get("null_profile", {}).get("fields_over_50_percent_null"):
            add(
                "P2",
                "ASSESS_HIGH_NULL_FIELDS",
                "Classify high-null fields as unavailable, not-applicable, or collection gaps before scoring.",
                "Null semantics affect data readiness and confidence calculations.",
            )

    if cross_unit_report.get("schema_drift"):
        add(
            "P1",
            "NORMALIZE_CROSS_SHEET_SCHEMA",
            "Standardize field names and required columns across workbook sheets before concatenation.",
            "Cross-unit schema drift can create false nulls and fragmented profiles.",
        )
    if cross_unit_report.get("cross_unit_identity_repeats", 0):
        add(
            "P1",
            "REVIEW_CROSS_UNIT_IDENTITY_REPEATS",
            "Review privacy-safe repeated voter identities across sheets/files before merge.",
            "A voter may be duplicated, historically moved, or legitimately represented in multiple source segments.",
        )

    priority_rank = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    return sorted(recs, key=lambda r: (priority_rank.get(r["priority"], 9), r["code"]))


# ---------------------------------------------------------------------------
# Generic utilities
# ---------------------------------------------------------------------------


def build_input_inventory(path: Path, units: Sequence[DataUnit]) -> dict[str, Any]:
    stat = path.stat()
    return {
        "source_file": {
            "name": path.name,
            "extension": path.suffix.lower(),
            "size_bytes": stat.st_size,
            "sha256": sha256_file(path),
            "modified_at": iso_z(dt.datetime.fromtimestamp(stat.st_mtime, tz=dt.timezone.utc)),
        },
        "unit_count": len(units),
        "units": [
            {
                "unit_name": u.unit_name,
                "input_kind": u.input_kind,
                "rows_loaded": len(u.frame),
                "columns_loaded": len(u.frame.columns),
                "metadata": u.metadata,
            }
            for u in units
        ],
    }


def contract_to_report(contract: OntologyContract | None) -> dict[str, Any]:
    if contract is None:
        return {"loaded": False}
    return {
        "loaded": bool(contract.raw),
        "contract_id": contract.contract_id,
        "contract_type": contract.contract_type,
        "version": contract.version,
        "expected_source_field_count": contract.expected_source_field_count,
        "source_field_count": len(contract.source_fields),
        "source_fields": list(contract.source_fields),
        "privacy_removed_fields": list(contract.privacy_removed_fields),
        "source_identity_field": contract.source_identity_field,
        "masked_label_field": contract.masked_label_field,
        "canonical_identity_field": contract.canonical_identity_field,
        "validation": contract.validation,
    }


def infer_semantic_type(field_name: str, series: "pd.Series") -> tuple[str, float]:
    key = normalize_key(field_name)
    if is_sensitive_field(key):
        return "SENSITIVE_IDENTITY", 1.0
    if field_matches_hints(key, PHONE_HINTS):
        return "PHONE", 0.98
    if field_matches_hints(key, POSTCODE_HINTS):
        return "POSTCODE", 0.98
    if field_matches_hints(key, DATE_HINTS):
        return "DATE", 0.90
    if field_matches_hints(key, GENDER_HINTS):
        return "GENDER", 0.98
    if key in {"UMUR", "AGE"}:
        return "AGE", 0.99
    if field_matches_hints(key, BIRTH_YEAR_HINTS):
        return "YEAR", 0.98

    sample = [v for v in series.head(500).tolist() if not is_nullish(v)]
    if not sample:
        return "EMPTY", 1.0
    numeric = sum(parse_number(v) is not None for v in sample) / len(sample)
    date_like = sum(parse_datetime(v) is not None for v in sample[:100]) / min(len(sample), 100)
    if numeric >= 0.95:
        return "NUMERIC", numeric
    if date_like >= 0.90:
        return "DATE", date_like
    return "TEXT", max(0.5, 1.0 - numeric)


def find_string_variant_candidates(values: Sequence[str], threshold: float) -> list[tuple[str, str, float]]:
    # Block by aggressive place normalization and prefix to avoid O(n^2) on all values.
    blocks: defaultdict[str, list[str]] = defaultdict(list)
    for value in values:
        norm = normalize_place(value)
        if not norm:
            continue
        compact = NON_ALNUM_RE.sub("", norm)
        key = compact[:4] if len(compact) >= 4 else compact
        blocks[key].append(value)

    pairs: list[tuple[str, str, float]] = []
    seen: set[tuple[str, str]] = set()
    for block_values in blocks.values():
        if len(block_values) < 2:
            continue
        # Protect against pathological blocks.
        candidates = sorted(block_values, key=lambda s: (len(s), s))[:2000]
        for i, left in enumerate(candidates):
            left_norm = normalize_place(left) or ""
            for right in candidates[i + 1 :]:
                pair_key = tuple(sorted((left, right)))
                if pair_key in seen:
                    continue
                seen.add(pair_key)
                right_norm = normalize_place(right) or ""
                if left_norm == right_norm:
                    similarity = 1.0
                else:
                    length_ratio = min(len(left_norm), len(right_norm)) / max(1, max(len(left_norm), len(right_norm)))
                    if length_ratio < threshold - 0.15:
                        continue
                    similarity = SequenceMatcher(None, left_norm, right_norm).ratio()
                if similarity >= threshold and left != right:
                    pairs.append((left, right, similarity))
    return sorted(pairs, key=lambda x: (-x[2], x[0], x[1]))


def summarize_anomalies(anomalies: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    by_code = Counter(str(a.get("code", "UNKNOWN")) for a in anomalies)
    by_severity = Counter(str(a.get("severity", "UNKNOWN")) for a in anomalies)
    return {
        "total": len(anomalies),
        "by_code": dict(sorted(by_code.items())),
        "by_severity": dict(sorted(by_severity.items())),
    }


def limit_anomalies(anomalies: Sequence[dict[str, Any]], per_code_limit: int) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    result = []
    for issue in anomalies:
        code = str(issue.get("code", "UNKNOWN"))
        if counts[code] >= per_code_limit:
            continue
        counts[code] += 1
        result.append(issue)
    return result


def count_high_severity_anomalies(frame: "pd.DataFrame | None") -> int:
    if frame is None or frame.empty or "severity" not in frame.columns:
        return 0
    return int(frame["severity"].astype(str).str.upper().isin({"HIGH", "CRITICAL"}).sum())


def choose_primary_identity_column(columns: Sequence[str]) -> str:
    priority = ["IC", "IC_PERSONEL", "NRIC", "MYKAD", "IC_LAMA", "IC_SPOUSE"]
    normalized = {normalize_key(c): c for c in columns}
    for key in priority:
        if key in normalized:
            return normalized[key]
    return columns[0]


def normalize_identity_value(value: Any) -> str | None:
    text = normalize_scalar_text(value)
    if text is None:
        return None
    if EXCEL_SCI_NOTATION_RE.match(text):
        # Do not invent digits from scientific notation. Tokenize the observed form
        # only so duplicates can still be grouped within the run.
        return text
    return re.sub(r"[^0-9A-Z]", "", text.upper()) or None


def normalize_name(value: Any) -> str | None:
    text = normalize_scalar_text(value)
    if text is None:
        return None
    text = strip_diacritics(text.upper())
    text = re.sub(r"[^A-Z0-9 ]", " ", text)
    return MULTISPACE_RE.sub(" ", text).strip() or None


def normalize_place(value: Any) -> str | None:
    text = normalize_scalar_text(value)
    if text is None:
        return None
    text = strip_diacritics(text.upper())
    text = text.replace("&", " DAN ")
    text = re.sub(r"[^A-Z0-9 ]", " ", text)
    return MULTISPACE_RE.sub(" ", text).strip() or None


def normalize_key(value: Any) -> str:
    if value is None:
        return ""
    text = strip_diacritics(str(value)).upper().strip()
    text = re.sub(r"[^A-Z0-9]+", "_", text)
    return text.strip("_")


def normalize_scalar_text(value: Any) -> str | None:
    if is_nullish(value):
        return None
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (dt.datetime, dt.date, pd.Timestamp)):
        try:
            return pd.Timestamp(value).isoformat()
        except Exception:
            return str(value)
    if isinstance(value, float):
        if math.isnan(value):
            return None
        if value.is_integer():
            return str(int(value))
    text = str(value).strip()
    return MULTISPACE_RE.sub(" ", text) if text else None


def raw_scalar_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return str(value).strip()


def is_nullish(value: Any, normalized_tokens: set[str] | None = None) -> bool:
    if value is None:
        return True
    try:
        null_result = pd.isna(value)
        if isinstance(null_result, bool) and null_result:
            return True
    except Exception:
        pass
    if isinstance(value, str):
        key = normalize_key(value)
        tokens = normalized_tokens or {normalize_key(t) for t in DEFAULT_NULL_TOKENS}
        return key in tokens
    return False


def is_sensitive_field(field_name: Any) -> bool:
    """Return True only for IC/NRIC/MyKad-like identity fields."""
    key = normalize_key(field_name)
    return any(pattern.search(key) for pattern in SENSITIVE_IDENTITY_PATTERNS)


def is_report_sensitive_field(field_name: Any) -> bool:
    """Return True for row-level PII that must be tokenized in reports."""
    key = normalize_key(field_name)
    return any(pattern.search(key) for pattern in REPORT_SENSITIVE_PATTERNS)


def field_matches_hints(field_name: Any, hints: Sequence[str]) -> bool:
    key = normalize_key(field_name)
    return any(normalize_key(hint) in key for hint in hints)


def parse_number(value: Any) -> float | None:
    if is_nullish(value):
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float, decimal.Decimal)):
        try:
            number = float(value)
            return number if math.isfinite(number) else None
        except Exception:
            return None
    text = str(value).strip().replace(",", "")
    match = re.search(r"[+-]?\d+(?:\.\d+)?", text)
    if not match:
        return None
    try:
        number = float(match.group(0))
        return number if math.isfinite(number) else None
    except ValueError:
        return None


def parse_integer(value: Any) -> int | None:
    number = parse_number(value)
    if number is None:
        return None
    if abs(number - round(number)) > 1e-9:
        return None
    return int(round(number))


def parse_datetime(value: Any) -> dt.datetime | None:
    if is_nullish(value):
        return None
    if isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time.min)
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    text = str(value).strip()
    if not text:
        return None
    # Avoid turning arbitrary short integers into nanosecond timestamps.
    if re.fullmatch(r"\d{1,5}", text):
        return None
    try:
        parsed = pd.to_datetime(text, errors="raise", dayfirst=True)
        if isinstance(parsed, pd.Timestamp):
            return parsed.to_pydatetime()
    except Exception:
        return None
    return None


def excel_row_number(index: Any) -> int:
    try:
        return int(index) + 2  # +1 zero-based and +1 header row
    except Exception:
        return -1


def first_present(columns: Iterable[str], candidates: Sequence[str]) -> str | None:
    normalized = {normalize_key(c): c for c in columns}
    for candidate in candidates:
        if normalize_key(candidate) in normalized:
            return normalized[normalize_key(candidate)]
    return None


def first_non_null(*values: Any) -> Any:
    for value in values:
        if value is not None:
            return value
    return None


def lookup_ci(mapping: Mapping[str, Any], wanted: str) -> Any:
    target = normalize_key(wanted)
    for key, value in mapping.items():
        if normalize_key(key) == target:
            return value
    return None


def as_optional_bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    key = normalize_key(value)
    if key in {"TRUE", "YES", "Y", "1", "REQUIRED", "MANDATORY"}:
        return True
    if key in {"FALSE", "NO", "N", "0", "OPTIONAL"}:
        return False
    return None


def dedupe_preserve_order(values: Iterable[str | None]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value:
            continue
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def strip_diacritics(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def quality_band(score: float) -> str:
    if score >= 90:
        return "VERY_HIGH"
    if score >= 75:
        return "HIGH"
    if score >= 60:
        return "MEDIUM"
    if score >= 40:
        return "LOW"
    return "VERY_LOW"


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-._")
    return cleaned or "dataset"


def safe_write_json(path: Path, payload: Any) -> None:
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, default=json_default),
        encoding="utf-8",
    )
    temp.replace(path)


def json_default(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, (set, tuple)):
        return list(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    return str(value)


def json_compact(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=json_default)


def iso_z(value: dt.datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _build_logger(level: str) -> logging.Logger:
    logger = logging.getLogger(PROFILER_NAME)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    return logger


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="pip-voter-data-profiler-v1.1.py",
        description=(
            "Read-only privacy-safe profiler for PIP voter Excel/CSV/JSON datasets. "
            "v1.1 supports ontology and source-specific contracts with contract-driven field counts."
        ),
    )
    parser.add_argument("input", nargs="?", type=Path, help="Input .xlsx/.xls/.xlsm/.csv/.tsv/.json/.jsonl file")
    parser.add_argument(
        "--ontology",
        "--contract",
        dest="ontology",
        type=Path,
        default=None,
        help=(
            f"Path to ontology or source contract JSON (for example {DEFAULT_ONTOLOGY_FILENAME} "
            "or pip-voter-source-contract-p134-v1.0.json). Auto-discovered when omitted."
        ),
    )
    parser.add_argument("--output-dir", type=Path, default=Path(DEFAULT_OUTPUT_DIR))
    parser.add_argument(
        "--strict-contract",
        action="store_true",
        help=(
            "Fail when the contract does not satisfy its own expected physical source-field "
            "count and canonical VOTER_ID_HASH contract."
        ),
    )
    parser.add_argument(
        "--expected-source-field-count",
        type=int,
        default=None,
        help=(
            "Optional explicit override. When omitted, v1.1 reads the expected count from "
            "source-contract metadata; legacy fallback is 47 only when no count is discoverable."
        ),
    )
    parser.add_argument("--sheet", action="append", default=[], help="Excel sheet to profile. Repeat for multiple sheets.")
    parser.add_argument("--first-sheet-only", action="store_true", help="Profile only the first sheet when --sheet is not supplied")
    parser.add_argument("--max-rows", type=int, default=None, help="Optional profiling row cap per logical unit")
    parser.add_argument("--age-min", type=int, default=18)
    parser.add_argument("--age-max", type=int, default=120)
    parser.add_argument("--locality-similarity", type=float, default=0.92)
    parser.add_argument("--no-excel-summary", action="store_true")
    parser.add_argument("--no-csv-details", action="store_true")
    parser.add_argument("--fail-on-high-severity", action="store_true")
    parser.add_argument("--high-severity-threshold", type=int, default=1)
    parser.add_argument("--log-level", choices=("DEBUG", "INFO", "WARNING", "ERROR"), default="INFO")
    parser.add_argument(
        "--hash-salt",
        default=None,
        help=(
            "Stable HMAC salt for privacy-safe identity linkage. Prefer environment variable "
            "PIP_VOTER_HASH_SALT instead of command history."
        ),
    )
    parser.add_argument("--self-check", action="store_true", help="Run offline contract-driven self-checks and exit.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {PROFILER_VERSION}")
    return parser


def config_from_args(args: argparse.Namespace) -> ProfilerConfig:
    if args.max_rows is not None and args.max_rows <= 0:
        raise SystemExit("--max-rows must be greater than zero")
    if args.expected_source_field_count is not None and args.expected_source_field_count <= 0:
        raise SystemExit("--expected-source-field-count must be greater than zero")
    if not (0.5 <= args.locality_similarity <= 1.0):
        raise SystemExit("--locality-similarity must be between 0.5 and 1.0")
    if args.age_min < 0 or args.age_max <= args.age_min:
        raise SystemExit("Invalid age range")

    return ProfilerConfig(
        ontology_path=args.ontology,
        output_dir=args.output_dir,
        strict_contract=args.strict_contract,
        expected_source_field_count=args.expected_source_field_count,
        include_all_sheets=not args.first_sheet_only,
        sheets=tuple(args.sheet),
        max_rows=args.max_rows,
        age_min=args.age_min,
        age_max=args.age_max,
        locality_similarity_threshold=args.locality_similarity,
        hash_salt=args.hash_salt,
        log_level=args.log_level,
        write_excel_summary=not args.no_excel_summary,
        write_csv_details=not args.no_csv_details,
        fail_on_high_severity=args.fail_on_high_severity,
        high_severity_threshold=args.high_severity_threshold,
    )


def profiler_self_check() -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    def add(name: str, passed: bool, detail: Any = None) -> None:
        checks.append({"name": name, "passed": bool(passed), "detail": detail})

    source_fields = ["VTR_ID", "VTR_LABEL"] + [f"FIELD_{i:02d}" for i in range(3, 42)]
    synthetic = {
        "contract_id": "PIP.VOTER.SOURCE.P134.V1.0",
        "contract_type": "pip_voter_source_contract",
        "version": "1.0.0",
        "source_scope": {
            "expected_source_field_count": 41,
            "physical_source_field_count": 41,
        },
        "identity_model": {
            "source_identity_field": "VTR_ID",
            "masked_label_field": "VTR_LABEL",
            "canonical_identity_field": "VOTER_ID_HASH",
        },
        "privacy_model": {
            "privacy_removed_fields": [
                {"field_name": "IC"},
                {"field_name": "NAMA"},
            ]
        },
        "schema": {
            "source_fields": source_fields,
            "field_mappings": [
                {
                    "source_field": field,
                    "canonical_field": field,
                    **({"pattern": r"^VTR_P134\.\d{5,}$"} if field == "VTR_ID" else {}),
                }
                for field in source_fields
            ],
        },
        "derived_fields": [
            {"derived_field": "VOTER_ID_HASH"}
        ],
    }

    contract = compile_ontology_contract(synthetic, strict=True)
    add(
        "contract_driven_41_field_count",
        contract.expected_source_field_count == 41
        and len(contract.source_fields) == 41,
        contract.validation,
    )
    add(
        "source_contract_mode",
        contract.validation.get("mode") == "SOURCE_CONTRACT",
        contract.validation.get("mode"),
    )
    add(
        "derived_hash_contract_detected",
        contract.validation.get("has_canonical_voter_id_hash") is True,
    )
    add(
        "privacy_removed_fields_extracted",
        set(contract.privacy_removed_fields) == {"IC", "NAMA"},
        list(contract.privacy_removed_fields),
    )
    add(
        "source_identity_field_extracted",
        contract.source_identity_field == "VTR_ID",
        contract.source_identity_field,
    )

    override_contract = compile_ontology_contract(
        {
            **synthetic,
            "source_scope": {
                "expected_source_field_count": 41,
                "physical_source_field_count": 41,
            },
        },
        expected_source_field_count=41,
        strict=True,
    )
    add(
        "explicit_count_override",
        override_contract.validation.get("expected_source_field_count_source")
        == "CONFIG_OVERRIDE",
        override_contract.validation,
    )

    passed = all(check["passed"] for check in checks)
    return {
        "artifact": "pip-voter-data-profiler-v1.1.py",
        "version": PROFILER_VERSION,
        "passed": passed,
        "checks": checks,
    }


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    if args.self_check:
        report = profiler_self_check()
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0 if report["passed"] else 2
    if args.input is None:
        parser.error("input is required unless --self-check is used")
    try:
        profiler = PIPVoterDataProfiler(config_from_args(args))
        bundle = profiler.profile(args.input)
        result = {
            "status": "SUCCESS",
            "run_id": bundle.report["profiler"]["run_id"],
            "quality_summary": bundle.report["quality_summary"],
            "output_paths": bundle.output_paths,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except OntologyContractError as exc:
        print(json.dumps({"status": "CONTRACT_ERROR", "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2
    except (InputReadError, ProfilerError) as exc:
        print(json.dumps({"status": "PROFILER_ERROR", "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 3
    except KeyboardInterrupt:
        print(json.dumps({"status": "INTERRUPTED"}), file=sys.stderr)
        return 130
    except Exception as exc:  # pragma: no cover - last-resort CLI boundary
        print(json.dumps({
            "status": "UNEXPECTED_ERROR",
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
