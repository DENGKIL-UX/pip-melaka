#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
PIP Voter Data Cleanser v1.1
============================

Production-oriented, contract-driven cleansing layer for PIP Voter Intelligence.

Artifact:
    pip-voter-data-cleanser-v1.1.py

Primary goals:
    - Read voter data from Excel, CSV/TSV, JSON, JSONL/NDJSON.
    - Preserve source lineage and never overwrite raw input files.
    - Use ontology or source-specific contract JSON as source-of-truth when present.
    - Normalize and validate source fields using contract-driven physical field counts.
    - Generate privacy-safe canonical VOTER_ID_HASH values.
    - Never expose raw IC / NRIC / MyKad values in reports, logs, quarantine identifiers,
      duplicate outputs, or graph-facing identifiers.
    - Support SAFE, STANDARD and STRICT cleansing modes.
    - Apply deterministic corrections only; quarantine uncertain political/electoral
      hierarchy conflicts instead of silently guessing.
    - Produce cleaned records ready for pip-voter-intelligence-transformer-v1.0.js.
    - Preserve audit trail, field-level lineage, confidence, recency and evidence references.

The cleanser is intentionally modular:
    ingestion -> contract resolution -> profiling-aware normalization -> validation
    -> duplicate analysis -> hierarchy analysis -> quarantine -> canonical output
    -> audit/report/manifest

Dependencies:
    Required:
        pandas
    Recommended for Excel:
        openpyxl
    For legacy .xls:
        xlrd

Install:
    pip install pandas openpyxl
    pip install xlrd   # only when legacy .xls input is required

Examples:
    PowerShell:
        $env:PIP_VOTER_HASH_SALT="replace-with-a-long-stable-secret"
        python .\pip-voter-data-cleanser-v1.1.py `
            .\voters.xlsx `
            --ontology .\pip-voter-intelligence-ontology-v1.0.json `
            --output-dir .\clean-output `
            --mode standard

    Strict mode:
        python .\pip-voter-data-cleanser-v1.1.py `
            .\voters.xlsx `
            --ontology .\pip-voter-intelligence-ontology-v1.0.json `
            --output-dir .\clean-output `
            --mode strict `
            --strict-contract

Security notes:
    - VOTER_ID_HASH is HMAC-SHA256 using PIP_VOTER_HASH_SALT.
    - Raw identity values are not emitted into diagnostics or reports.
    - A stable production secret MUST be provided through environment or --hash-salt-file.
    - Do not commit salts, raw voter data, or generated sensitive output to source control.
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import datetime as dt
import decimal
import hashlib
import hmac
import io
import json
import math
import os
import re
import secrets
import shutil
import sys
import tempfile
import traceback
import unicodedata
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import (
    Any,
    Dict,
    Iterable,
    Iterator,
    List,
    Mapping,
    MutableMapping,
    Optional,
    Sequence,
    Set,
    Tuple,
    Union,
)

try:
    import pandas as pd
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: pandas. Install with: pip install pandas openpyxl"
    ) from exc


# ---------------------------------------------------------------------------
# Version and contract constants
# ---------------------------------------------------------------------------

ARTIFACT_NAME = "pip-voter-data-cleanser-v1.1.py"
ARTIFACT_VERSION = "1.1.0"
PIPELINE_STAGE = "PIP_VOTER_DATA_CLEANSING"
LEGACY_EXPECTED_SOURCE_FIELD_COUNT = 47
EXPECTED_SOURCE_FIELD_COUNT = LEGACY_EXPECTED_SOURCE_FIELD_COUNT
CANONICAL_HASH_FIELD = "VOTER_ID_HASH"
DEFAULT_ONTOLOGY_FILENAME = "pip-voter-intelligence-ontology-v1.0.json"
DEFAULT_HASH_ENV = "PIP_VOTER_HASH_SALT"
DEFAULT_ENCODING = "utf-8"
MAX_EVIDENCE_VALUE_LEN = 160

SUPPORTED_EXTENSIONS = {
    ".xlsx",
    ".xls",
    ".xlsm",
    ".csv",
    ".tsv",
    ".txt",
    ".json",
    ".jsonl",
    ".ndjson",
}

IDENTITY_FIELD_NAMES = {
    "IC",
    "IC_LAMA",
    "IC_PERSONEL",
    "IC_SPOUSE",
    "NRIC",
    "MYKAD",
    "NO_IC",
    "NO_KP",
    "KAD_PENGENALAN",
}

PSEUDONYMOUS_IDENTITY_FIELD_NAMES = {
    "VTR_ID",
}

REPORT_SENSITIVE_IDENTITY_FIELDS = (
    IDENTITY_FIELD_NAMES
    | PSEUDONYMOUS_IDENTITY_FIELD_NAMES
)

HIGHLY_SENSITIVE_FIELDS = REPORT_SENSITIVE_IDENTITY_FIELDS | {
    "NAMA",
    "NAME",
    "FULL_NAME",
    "NO_TEL_HF",
    "PHONE",
    "TELEPHONE",
    "MOBILE",
    "NO_RUMAH",
    "ALAMAT1",
    "ALAMAT2",
    "ALAMAT3",
    "ADDRESS",
}

ELECTORAL_HIERARCHY_FIELDS = (
    "NEGERI",
    "PARLIMEN",
    "DUN",
    "DM",
    "LOKALITI",
)

NULL_TOKENS = {
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
    "NOT AVAILABLE",
    "#N/A",
    "#VALUE!",
    "#REF!",
    "#DIV/0!",
    "NAN",
    "<NA>",
}

# Fallback names are only used when an ontology contract is unavailable.
# The actual ontology remains the source-of-truth and replaces this list.
FALLBACK_KNOWN_SOURCE_FIELDS = [
    "IC",
    "IC_LAMA",
    "IC_PERSONEL",
    "IC_SPOUSE",
    "NAMA",
    "JANTINA",
    "UMUR",
    "KAUM",
    "UMUR2",
    "TAHUN_LAHIR",
    "AGAMA",
    "PROFESSION",
    "LOKALITI",
    "DM",
    "DUN",
    "PARLIMEN",
    "NEGERI",
    "NO_RUMAH",
    "ALAMAT1",
    "ALAMAT2",
    "ALAMAT3",
    "POSKOD",
    "ALAMAT_BANDAR",
    "ALAMAT_NEGERI",
    "NO_TEL_HF",
    "BANGSA",
    "KAUM2",
    "KOD_UMUR",
    # The following generic placeholders are deliberately not asserted as the
    # authoritative ontology. They allow degraded-mode preservation only.
    "FIELD_29",
    "FIELD_30",
    "FIELD_31",
    "FIELD_32",
    "FIELD_33",
    "FIELD_34",
    "FIELD_35",
    "FIELD_36",
    "FIELD_37",
    "FIELD_38",
    "FIELD_39",
    "FIELD_40",
    "FIELD_41",
    "FIELD_42",
    "FIELD_43",
    "FIELD_44",
    "FIELD_45",
    "FIELD_46",
    "FIELD_47",
]


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CleanseMode(str, Enum):
    SAFE = "safe"
    STANDARD = "standard"
    STRICT = "strict"


class Severity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Action(str, Enum):
    PRESERVE = "PRESERVE"
    NORMALIZE = "NORMALIZE"
    CORRECT = "CORRECT"
    NULLIFY = "NULLIFY"
    QUARANTINE = "QUARANTINE"
    REJECT = "REJECT"
    FLAG = "FLAG"
    DEDUPLICATE = "DEDUPLICATE"


class RuleConfidence(str, Enum):
    CERTAIN = "CERTAIN"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RecordDisposition(str, Enum):
    CLEAN = "CLEAN"
    CLEAN_WITH_FLAGS = "CLEAN_WITH_FLAGS"
    QUARANTINED = "QUARANTINED"
    REJECTED = "REJECTED"


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class CleanserError(Exception):
    """Base cleanser error."""


class ContractError(CleanserError):
    """Ontology/contract error."""


class InputFormatError(CleanserError):
    """Unsupported or malformed input."""


class SecurityConfigurationError(CleanserError):
    """Security configuration is insufficient."""


class StrictModeError(CleanserError):
    """Strict-mode validation failure."""


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SourceRef:
    input_path: str
    source_file_name: str
    source_file_sha256: str
    source_sheet: Optional[str]
    source_row_number: int
    ingestion_timestamp_utc: str
    source_record_ref: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FieldContract:
    source_field: str
    canonical_field: str
    required: bool = False
    data_type: str = "string"
    nullable: bool = True
    aliases: List[str] = field(default_factory=list)
    enum_values: List[str] = field(default_factory=list)
    pattern: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: Optional[str] = None
    ontology_path: Optional[str] = None

    def all_names(self) -> Set[str]:
        names = {self.source_field, self.canonical_field}
        names.update(self.aliases)
        return {canonicalize_column_name(x) for x in names if x}


@dataclass
class OntologyContract:
    source_fields: List[str]
    field_contracts: Dict[str, FieldContract]
    canonical_hash_field: str = CANONICAL_HASH_FIELD
    ontology_path: Optional[str] = None
    ontology_sha256: Optional[str] = None
    ontology_version: Optional[str] = None
    degraded_mode: bool = False
    raw_contract: Dict[str, Any] = field(default_factory=dict)
    expected_source_field_count: Optional[int] = None
    expected_source_field_count_source: str = "LEGACY_FALLBACK"
    contract_id: Optional[str] = None
    contract_type: str = "ontology"
    privacy_removed_fields: List[str] = field(default_factory=list)
    source_identity_field: Optional[str] = None
    masked_label_field: Optional[str] = None
    canonical_identity_field: Optional[str] = None
    identity_derivation: Optional[str] = None

    def validate(self, strict: bool = False) -> None:
        unique = list(dict.fromkeys(self.source_fields))
        if len(unique) != len(self.source_fields):
            raise ContractError("Contract source field list contains duplicates.")

        expected = (
            int(self.expected_source_field_count)
            if self.expected_source_field_count is not None
            else LEGACY_EXPECTED_SOURCE_FIELD_COUNT
        )
        if strict and len(unique) != expected:
            raise ContractError(
                f"Strict contract requires exactly {expected} source fields "
                f"(resolved from {self.expected_source_field_count_source}); "
                f"resolved {len(unique)}."
            )

        if self.canonical_hash_field in unique:
            raise ContractError(
                f"{self.canonical_hash_field} must be canonical/derived, not a source field."
            )

        overlap = sorted(set(self.privacy_removed_fields) & set(unique))
        if overlap:
            raise ContractError(
                "Privacy-removed fields must not be physical source fields: "
                + ", ".join(overlap)
            )

        if strict and self.source_identity_field:
            if self.source_identity_field not in unique:
                raise ContractError(
                    f"Source identity field {self.source_identity_field} "
                    "is not present in physical source mappings."
                )


@dataclass
class CleansingIssue:
    issue_id: str
    record_ref: str
    field_name: Optional[str]
    rule_id: str
    severity: str
    action: str
    confidence: str
    message: str
    evidence_ref: Optional[str] = None
    original_token: Optional[str] = None
    normalized_token: Optional[str] = None
    review_required: bool = False
    created_at_utc: str = field(default_factory=lambda: utc_now_iso())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class FieldChange:
    change_id: str
    record_ref: str
    field_name: str
    rule_id: str
    action: str
    confidence: str
    before_token: Optional[str]
    after_token: Optional[str]
    deterministic: bool
    evidence_ref: Optional[str]
    created_at_utc: str = field(default_factory=lambda: utc_now_iso())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RecordResult:
    record_ref: str
    cleaned_record: Dict[str, Any]
    source_ref: SourceRef
    issues: List[CleansingIssue] = field(default_factory=list)
    changes: List[FieldChange] = field(default_factory=list)
    disposition: RecordDisposition = RecordDisposition.CLEAN
    quarantine_reasons: List[str] = field(default_factory=list)
    confidence: float = 1.0
    evidence_refs: List[str] = field(default_factory=list)
    duplicate_group_id: Optional[str] = None

    def to_summary(self) -> Dict[str, Any]:
        return {
            "record_ref": self.record_ref,
            "disposition": self.disposition.value,
            "confidence": round(self.confidence, 6),
            "issue_count": len(self.issues),
            "change_count": len(self.changes),
            "quarantine_reason_count": len(self.quarantine_reasons),
            "duplicate_group_id": self.duplicate_group_id,
            "source_ref": self.source_ref.source_record_ref,
        }


@dataclass
class CleanserConfig:
    mode: CleanseMode = CleanseMode.STANDARD
    strict_contract: bool = False
    expected_source_field_count: Optional[int] = None
    preserve_unknown_columns: bool = False
    include_lineage_columns: bool = True
    output_csv: bool = True
    output_json: bool = True
    output_excel: bool = True
    allow_ephemeral_hash_salt: bool = False
    null_tokens: Set[str] = field(default_factory=lambda: set(NULL_TOKENS))
    current_year: int = field(default_factory=lambda: dt.datetime.now(dt.timezone.utc).year)
    min_age: int = 18
    max_age: int = 120
    min_birth_year: int = 1900
    hierarchy_min_group_size: int = 2
    hierarchy_dominance_threshold: float = 0.95
    variant_similarity_threshold: float = 0.94
    quarantine_on_required_missing: bool = True
    quarantine_on_hierarchy_conflict: bool = True
    quarantine_on_identity_conflict: bool = True
    reject_on_no_identity: bool = False
    dedupe_exact_records: bool = False
    max_issue_rows: int = 500_000
    max_change_rows: int = 500_000


@dataclass
class RunMetrics:
    input_records: int = 0
    clean_records: int = 0
    clean_with_flags_records: int = 0
    quarantined_records: int = 0
    rejected_records: int = 0
    exact_duplicate_records: int = 0
    identity_duplicate_groups: int = 0
    hierarchy_conflicts: int = 0
    total_issues: int = 0
    total_changes: int = 0
    fields_normalized: int = 0
    fields_nullified: int = 0
    records_with_hash: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# General utilities
# ---------------------------------------------------------------------------

def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def sha256_file(path: Union[str, Path], chunk_size: int = 1024 * 1024) -> str:
    p = Path(path)
    digest = hashlib.sha256()
    with p.open("rb") as fh:
        while True:
            chunk = fh.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def stable_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def canonicalize_column_name(value: Any) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = text.strip().upper()
    text = re.sub(r"[\s\-\/\\\.]+", "_", text)
    text = re.sub(r"[^A-Z0-9_]+", "", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text


def normalize_unicode(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    text = unicodedata.normalize("NFKC", str(value))
    return text


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def safe_upper(value: str) -> str:
    return collapse_whitespace(value).upper()


def is_nullish(value: Any, null_tokens: Optional[Set[str]] = None) -> bool:
    if value is None:
        return True
    try:
        if pd.isna(value):
            return True
    except Exception:
        pass
    text = normalize_unicode(value)
    if text is None:
        return True
    token = safe_upper(text)
    return token in (null_tokens or NULL_TOKENS)


def as_nullable_text(value: Any, null_tokens: Optional[Set[str]] = None) -> Optional[str]:
    if is_nullish(value, null_tokens):
        return None
    text = normalize_unicode(value)
    if text is None:
        return None
    return collapse_whitespace(text)


def sanitize_filename(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._")
    return text or "output"


def ensure_directory(path: Union[str, Path]) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def atomic_write_text(path: Union[str, Path], text: str, encoding: str = DEFAULT_ENCODING) -> None:
    p = Path(path)
    ensure_directory(p.parent)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding=encoding,
        dir=str(p.parent),
        delete=False,
        newline="",
    ) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    tmp_path.replace(p)


def atomic_write_json(path: Union[str, Path], payload: Any) -> None:
    atomic_write_text(
        path,
        json.dumps(payload, ensure_ascii=False, indent=2, default=str),
    )


def token_digest(value: Any, prefix: str = "TOK", length: int = 16) -> Optional[str]:
    if value is None:
        return None
    text = as_nullable_text(value)
    if text is None:
        return None
    digest = sha256_text(text)[:length]
    return f"{prefix}_{digest}"


def is_sensitive_field(field_name: Optional[str]) -> bool:
    if not field_name:
        return False
    return canonicalize_column_name(field_name) in HIGHLY_SENSITIVE_FIELDS


def privacy_safe_token(field_name: Optional[str], value: Any) -> Optional[str]:
    if value is None:
        return None
    text = as_nullable_text(value)
    if text is None:
        return None
    canonical = canonicalize_column_name(field_name or "")
    if canonical in IDENTITY_FIELD_NAMES:
        return token_digest(text, "ID")
    if canonical in PSEUDONYMOUS_IDENTITY_FIELD_NAMES:
        return token_digest(text, "VTRID")
    if canonical in {"NAMA", "NAME", "FULL_NAME"}:
        return token_digest(text, "NAME")
    if canonical in {"NO_TEL_HF", "PHONE", "TELEPHONE", "MOBILE"}:
        return token_digest(text, "PHONE")
    if canonical in {"NO_RUMAH", "ALAMAT1", "ALAMAT2", "ALAMAT3", "ADDRESS"}:
        return token_digest(text, "ADDR")
    return text[:MAX_EVIDENCE_VALUE_LEN]


def make_uuid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def row_fingerprint(record: Mapping[str, Any], exclude_fields: Optional[Set[str]] = None) -> str:
    exclude = {canonicalize_column_name(x) for x in (exclude_fields or set())}
    payload = {}
    for key in sorted(record.keys()):
        ck = canonicalize_column_name(key)
        if ck in exclude:
            continue
        value = record.get(key)
        payload[ck] = None if is_nullish(value) else collapse_whitespace(str(value))
    return sha256_text(stable_json(payload))


# ---------------------------------------------------------------------------
# Identity and hashing
# ---------------------------------------------------------------------------

def normalize_identity_digits(value: Any) -> Optional[str]:
    """
    Normalize IC-like values without validating citizenship or inferring missing digits.

    Deterministic operations:
        - Unicode normalization
        - trim
        - remove spaces and common punctuation
        - repair spreadsheet decimal suffix ".0" only when integer-like
        - expand non-negative integer scientific notation only when exact and integral

    Raw values must never be used as graph IDs or diagnostic identifiers.
    """
    if is_nullish(value):
        return None

    text = collapse_whitespace(unicodedata.normalize("NFKC", str(value)))

    # Spreadsheet coercion: 900101011234.0 -> 900101011234
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".", 1)[0]

    # Scientific notation: expand only if exact integral decimal.
    if re.fullmatch(r"[+]?\d+(?:\.\d+)?[Ee][+]?\d+", text):
        try:
            dec = decimal.Decimal(text)
            if dec == dec.to_integral_value():
                text = format(dec.quantize(decimal.Decimal("1")), "f")
        except decimal.InvalidOperation:
            pass

    digits = re.sub(r"\D", "", text)
    return digits or None


def identity_format_status(value: Any) -> Tuple[Optional[str], str]:
    digits = normalize_identity_digits(value)
    if digits is None:
        return None, "MISSING"
    if len(digits) == 12:
        return digits, "VALID_12_DIGIT"
    if len(digits) in {6, 7, 8}:
        return digits, "LEGACY_LENGTH"
    return digits, "INVALID_LENGTH"


def resolve_hash_salt(
    explicit_salt: Optional[str] = None,
    salt_file: Optional[Union[str, Path]] = None,
    allow_ephemeral: bool = False,
) -> Tuple[bytes, str]:
    if explicit_salt:
        value = explicit_salt.strip()
        if len(value) < 16:
            raise SecurityConfigurationError(
                "Explicit hash salt must contain at least 16 characters."
            )
        return value.encode("utf-8"), "explicit"

    env_value = os.getenv(DEFAULT_HASH_ENV)
    if env_value and len(env_value.strip()) >= 16:
        return env_value.strip().encode("utf-8"), f"env:{DEFAULT_HASH_ENV}"

    if salt_file:
        p = Path(salt_file)
        if not p.exists():
            raise SecurityConfigurationError(f"Hash salt file not found: {p}")
        value = p.read_text(encoding="utf-8").strip()
        if len(value) < 16:
            raise SecurityConfigurationError(
                "Hash salt file must contain at least 16 characters."
            )
        return value.encode("utf-8"), "file"

    if allow_ephemeral:
        return secrets.token_bytes(32), "ephemeral"

    raise SecurityConfigurationError(
        f"Stable voter hashing requires {DEFAULT_HASH_ENV}, --hash-salt, "
        "--hash-salt-file, or --allow-ephemeral-hash-salt for non-production tests."
    )


def normalize_pseudonymous_identity(value: Any) -> Optional[str]:
    text = as_nullable_text(value)
    if text is None:
        return None
    return collapse_whitespace(
        unicodedata.normalize("NFKC", text)
    ).upper()


def p134_voter_hash_from_vtr_id(
    vtr_id: Any,
    salt: bytes,
) -> Optional[str]:
    normalized = normalize_pseudonymous_identity(vtr_id)
    if not normalized:
        return None

    canonical_material = f"P134|VTR_ID|{normalized}"
    digest = hmac.new(
        salt,
        canonical_material.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    # Exact match with pip-voter-source-contract-adapter-p134-v1.0.js.
    return f"VOTER_{digest[:40].upper()}"


def derive_contract_voter_hash(
    record: Mapping[str, Any],
    salt: bytes,
    contract: OntologyContract,
) -> Optional[str]:
    source_identity = canonicalize_column_name(
        contract.source_identity_field or ""
    )

    if source_identity == "VTR_ID":
        return p134_voter_hash_from_vtr_id(
            record.get(source_identity),
            salt,
        )

    return canonical_voter_hash(
        record,
        salt,
        identity_fields=("IC", "IC_LAMA", "IC_PERSONEL"),
    )


def split_code_name(value: Any) -> Tuple[Optional[str], Optional[str], bool]:
    text = as_nullable_text(value)
    if text is None:
        return None, None, False
    index = text.find(".")
    if index <= 0 or index >= len(text) - 1:
        return None, None, False
    code = text[:index].strip()
    name = text[index + 1:].strip()
    return code or None, name or None, bool(code and name)


def derive_geography_fields(record: Mapping[str, Any]) -> Dict[str, Any]:
    derived: Dict[str, Any] = {}
    for field_name in ELECTORAL_HIERARCHY_FIELDS:
        code, name, valid = split_code_name(record.get(field_name))
        derived[f"{field_name}_CODE"] = code if valid else None
        derived[f"{field_name}_NAME"] = name if valid else None
    return derived


def canonical_voter_hash(
    record: Mapping[str, Any],
    salt: bytes,
    identity_fields: Sequence[str] = ("IC", "IC_LAMA", "IC_PERSONEL"),
) -> Optional[str]:
    candidates: List[str] = []
    for field_name in identity_fields:
        value = record.get(field_name)
        digits = normalize_identity_digits(value)
        if digits:
            candidates.append(f"{canonicalize_column_name(field_name)}:{digits}")

    if not candidates:
        # Conservative deterministic fallback. It is weaker than direct identity
        # and is clearly namespaced as composite.
        name = as_nullable_text(record.get("NAMA"))
        year = parse_int(record.get("TAHUN_LAHIR"))
        locality = as_nullable_text(record.get("LOKALITI"))
        if name and year and locality:
            composite = "|".join([
                normalize_person_name(name) or "",
                str(year),
                normalize_label(locality) or "",
            ])
            candidates.append(f"COMPOSITE:{composite}")

    if not candidates:
        return None

    canonical_material = "||".join(sorted(set(candidates)))
    digest = hmac.new(
        salt,
        canonical_material.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"VOTER_{digest}"


# ---------------------------------------------------------------------------
# Primitive parsers and normalizers
# ---------------------------------------------------------------------------

def parse_int(value: Any) -> Optional[int]:
    if is_nullish(value):
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if math.isnan(value):
            return None
        if value.is_integer():
            return int(value)
        return None

    text = collapse_whitespace(str(value))
    text = text.replace(",", "")
    if re.fullmatch(r"[+-]?\d+", text):
        try:
            return int(text)
        except ValueError:
            return None
    if re.fullmatch(r"[+-]?\d+\.0+", text):
        try:
            return int(decimal.Decimal(text))
        except decimal.InvalidOperation:
            return None
    match = re.fullmatch(r"([+-]?\d+)\s*(?:TAHUN|THN|YEARS?|Y/O)", text, re.I)
    if match:
        return int(match.group(1))
    return None


def parse_float(value: Any) -> Optional[float]:
    if is_nullish(value):
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            result = float(value)
            return None if math.isnan(result) else result
        except Exception:
            return None
    text = collapse_whitespace(str(value)).replace(",", "")
    try:
        return float(text)
    except ValueError:
        return None


def normalize_label(value: Any) -> Optional[str]:
    text = as_nullable_text(value)
    if text is None:
        return None
    return safe_upper(text)


def normalize_person_name(value: Any) -> Optional[str]:
    text = as_nullable_text(value)
    if text is None:
        return None
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.upper()


def normalize_gender(value: Any) -> Tuple[Optional[str], str]:
    text = as_nullable_text(value)
    if text is None:
        return None, "MISSING"
    token = canonicalize_column_name(text)

    male = {
        "M",
        "MALE",
        "LELAKI",
        "L",
        "LK",
        "L_K",
        "PRIA",
    }
    female = {
        "F",
        "FEMALE",
        "PEREMPUAN",
        "P",
        "PR",
        "WANITA",
    }

    if token in male:
        return "MALE", "MAPPED"
    if token in female:
        return "FEMALE", "MAPPED"
    return safe_upper(text), "UNMAPPED"


def normalize_phone(value: Any) -> Tuple[Optional[str], str]:
    text = as_nullable_text(value)
    if text is None:
        return None, "MISSING"

    raw = unicodedata.normalize("NFKC", text)
    # Multiple phone numbers are not silently collapsed.
    parts = [x.strip() for x in re.split(r"[;,/|]+", raw) if x.strip()]
    if len(parts) > 1:
        return safe_upper(raw), "MULTIPLE_VALUES"

    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None, "INVALID"

    if digits.startswith("60") and len(digits) >= 10:
        normalized = "+" + digits
    elif digits.startswith("0") and 9 <= len(digits) <= 11:
        normalized = "+60" + digits[1:]
    elif len(digits) in {9, 10}:
        # Do not assume missing country prefix in strict interpretation.
        normalized = digits
    else:
        normalized = digits

    if normalized.startswith("+60") and 10 <= len(re.sub(r"\D", "", normalized)) <= 12:
        return normalized, "NORMALIZED_MY"
    if 9 <= len(digits) <= 12:
        return normalized, "PLAUSIBLE"
    return normalized, "INVALID_LENGTH"


def normalize_postcode(value: Any) -> Tuple[Optional[str], str]:
    if is_nullish(value):
        return None, "MISSING"

    text = collapse_whitespace(str(value))

    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".", 1)[0]

    if re.fullmatch(r"\d+(?:\.\d+)?[Ee][+-]?\d+", text, re.I):
        try:
            dec = decimal.Decimal(text)
            if dec == dec.to_integral_value():
                text = format(dec.quantize(decimal.Decimal("1")), "f")
        except decimal.InvalidOperation:
            pass

    digits = re.sub(r"\D", "", text)
    if not digits:
        return None, "INVALID"
    if len(digits) == 5:
        return digits, "VALID"
    if len(digits) < 5:
        # Leading zero restoration is ambiguous, do not auto-pad.
        return digits, "SHORT_REVIEW"
    return digits, "INVALID_LENGTH"


def normalize_year(value: Any) -> Tuple[Optional[int], str]:
    number = parse_int(value)
    if number is None:
        return None, "MISSING_OR_INVALID"
    current_year = dt.datetime.now(dt.timezone.utc).year
    if 1900 <= number <= current_year:
        return number, "VALID"
    return number, "OUT_OF_RANGE"


def normalize_age(value: Any, min_age: int = 18, max_age: int = 120) -> Tuple[Optional[int], str]:
    number = parse_int(value)
    if number is None:
        return None, "MISSING_OR_INVALID"
    if min_age <= number <= max_age:
        return number, "VALID"
    return number, "OUT_OF_RANGE"


def normalize_date(value: Any) -> Tuple[Optional[str], str]:
    if is_nullish(value):
        return None, "MISSING"

    if isinstance(value, (dt.datetime, dt.date)):
        d = value.date() if isinstance(value, dt.datetime) else value
        return d.isoformat(), "PARSED"

    text = collapse_whitespace(str(value))

    # Avoid interpreting bare identity-like numbers as dates.
    if re.fullmatch(r"\d{8,}", text):
        return text, "UNPARSED"

    candidates = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%m/%d/%Y",
    ]
    for fmt in candidates:
        try:
            parsed = dt.datetime.strptime(text, fmt).date()
            return parsed.isoformat(), "PARSED"
        except ValueError:
            continue

    try:
        parsed = pd.to_datetime(text, errors="raise", dayfirst=True)
        if pd.isna(parsed):
            return None, "MISSING"
        return parsed.date().isoformat(), "PARSED_PANDAS"
    except Exception:
        return text, "UNPARSED"


def normalize_boolean(value: Any) -> Tuple[Optional[bool], str]:
    if is_nullish(value):
        return None, "MISSING"
    token = canonicalize_column_name(value)
    true_values = {"1", "TRUE", "YES", "YA", "Y", "BETUL"}
    false_values = {"0", "FALSE", "NO", "TIDAK", "N", "SALAH"}
    if token in true_values:
        return True, "MAPPED"
    if token in false_values:
        return False, "MAPPED"
    return None, "UNMAPPED"


# ---------------------------------------------------------------------------
# Ontology contract loading
# ---------------------------------------------------------------------------

def recursive_find_mappings(obj: Any) -> List[Dict[str, Any]]:
    """
    Search common ontology structures without hard-coding one exact JSON shape.

    The loader intentionally remains tolerant because v1.0 ontology may represent
    mappings as:
        field_mappings
        mappings
        source_fields
        fields
        properties
        contract.field_mappings
        implementation.fieldMappings
    """
    found: List[Dict[str, Any]] = []

    if isinstance(obj, list):
        for item in obj:
            if isinstance(item, dict):
                keys = {canonicalize_column_name(k) for k in item.keys()}
                if keys & {
                    "SOURCE_FIELD",
                    "SOURCE",
                    "FIELD",
                    "SOURCEFIELD",
                    "INPUT_FIELD",
                    "INPUTFIELD",
                }:
                    found.append(item)
            found.extend(recursive_find_mappings(item))
        return found

    if isinstance(obj, dict):
        for key, value in obj.items():
            ck = canonicalize_column_name(key)
            if ck in {
                "FIELD_MAPPINGS",
                "FIELDMAPPINGS",
                "MAPPINGS",
                "SOURCE_FIELDS",
                "SOURCEFIELDS",
            }:
                if isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            found.append(item)
                        elif isinstance(item, str):
                            found.append({"source_field": item})
                elif isinstance(value, dict):
                    for k2, v2 in value.items():
                        if isinstance(v2, dict):
                            merged = dict(v2)
                            merged.setdefault("source_field", k2)
                            found.append(merged)
                        else:
                            found.append({
                                "source_field": k2,
                                "canonical_field": v2,
                            })
            found.extend(recursive_find_mappings(value))
    return found


def mapping_value(mapping: Mapping[str, Any], aliases: Sequence[str]) -> Any:
    normalized_map = {
        canonicalize_column_name(k): v for k, v in mapping.items()
    }
    for alias in aliases:
        key = canonicalize_column_name(alias)
        if key in normalized_map:
            return normalized_map[key]
    return None


def extract_field_contracts(raw: Dict[str, Any]) -> List[FieldContract]:
    mappings = recursive_find_mappings(raw)
    contracts: Dict[str, FieldContract] = {}

    for item in mappings:
        source = mapping_value(
            item,
            ["source_field", "source", "field", "input_field", "sourceField"],
        )
        canonical = mapping_value(
            item,
            [
                "canonical_field",
                "target_field",
                "canonical",
                "target",
                "ontology_field",
                "canonicalField",
            ],
        )

        if not source:
            continue

        source_name = canonicalize_column_name(source)
        if source_name == CANONICAL_HASH_FIELD:
            continue

        canonical_name = canonicalize_column_name(canonical or source_name)

        aliases_value = mapping_value(item, ["aliases", "alias", "source_aliases"])
        aliases: List[str] = []
        if isinstance(aliases_value, list):
            aliases = [str(x) for x in aliases_value if x is not None]
        elif isinstance(aliases_value, str):
            aliases = [x.strip() for x in re.split(r"[,;|]", aliases_value) if x.strip()]

        required_value = mapping_value(item, ["required", "is_required", "mandatory"])
        required = bool(required_value) if isinstance(required_value, bool) else (
            str(required_value).strip().lower() in {"1", "true", "yes", "required", "mandatory"}
            if required_value is not None else False
        )

        nullable_value = mapping_value(item, ["nullable", "allow_null", "optional"])
        if isinstance(nullable_value, bool):
            nullable = nullable_value
        elif nullable_value is None:
            nullable = not required
        else:
            nullable = str(nullable_value).strip().lower() not in {"0", "false", "no"}

        data_type = mapping_value(item, ["data_type", "type", "datatype"]) or "string"

        enum_values = mapping_value(item, ["enum", "enum_values", "allowed_values"])
        enums: List[str] = []
        if isinstance(enum_values, list):
            enums = [str(x) for x in enum_values]

        pattern = mapping_value(item, ["pattern", "regex"])
        min_value = mapping_value(item, ["min", "minimum", "min_value"])
        max_value = mapping_value(item, ["max", "maximum", "max_value"])
        description = mapping_value(item, ["description", "notes", "meaning"])

        contracts[source_name] = FieldContract(
            source_field=source_name,
            canonical_field=canonical_name,
            required=required,
            data_type=str(data_type),
            nullable=nullable,
            aliases=aliases,
            enum_values=enums,
            pattern=str(pattern) if pattern else None,
            min_value=parse_float(min_value),
            max_value=parse_float(max_value),
            description=str(description) if description else None,
        )

    return list(contracts.values())


def nested_contract_value(
    contract: Mapping[str, Any],
    path_parts: Sequence[str],
) -> Any:
    value: Any = contract
    for part in path_parts:
        if not isinstance(value, Mapping) or part not in value:
            return None
        value = value[part]
    return value


def resolve_expected_source_field_count(
    raw: Mapping[str, Any],
    discovered_count: int,
    override: Optional[int] = None,
) -> Tuple[int, str]:
    if override is not None:
        if override <= 0:
            raise ContractError(
                "Expected source field count override must be greater than zero."
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
        value = nested_contract_value(raw, path_parts)
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0:
            return parsed, "CONTRACT_METADATA:" + ".".join(path_parts)

    if discovered_count > 0:
        return int(discovered_count), "DISCOVERED_MAPPING_COUNT"

    return LEGACY_EXPECTED_SOURCE_FIELD_COUNT, "LEGACY_FALLBACK"


def extract_privacy_removed_fields(raw: Mapping[str, Any]) -> List[str]:
    declared = nested_contract_value(
        raw,
        ("privacy_model", "privacy_removed_fields"),
    )
    if not isinstance(declared, Sequence) or isinstance(declared, (str, bytes)):
        return []

    fields: List[str] = []
    for item in declared:
        if isinstance(item, str):
            fields.append(canonicalize_column_name(item))
        elif isinstance(item, Mapping):
            value = (
                item.get("field_name")
                or item.get("field")
                or item.get("source_field")
            )
            if value:
                fields.append(canonicalize_column_name(value))
    return list(dict.fromkeys(fields))


def extract_identity_model(raw: Mapping[str, Any]) -> Dict[str, Optional[str]]:
    model = raw.get("identity_model")
    if not isinstance(model, Mapping):
        model = {}

    source_identity = (
        model.get("source_identity_field")
        or model.get("sourceIdentityField")
    )
    masked_label = (
        model.get("masked_label_field")
        or model.get("maskedLabelField")
    )
    canonical_identity = (
        model.get("canonical_identity_field")
        or model.get("canonicalIdentityField")
    )

    derivation = None
    derivation_obj = model.get("canonical_identity_derivation")
    if isinstance(derivation_obj, Mapping):
        derivation = (
            derivation_obj.get("algorithm")
            or derivation_obj.get("derivation")
        )
    elif derivation_obj:
        derivation = str(derivation_obj)

    return {
        "source_identity_field": (
            canonicalize_column_name(source_identity)
            if source_identity else None
        ),
        "masked_label_field": (
            canonicalize_column_name(masked_label)
            if masked_label else None
        ),
        "canonical_identity_field": (
            canonicalize_column_name(canonical_identity)
            if canonical_identity else None
        ),
        "identity_derivation": str(derivation) if derivation else None,
    }


def detect_canonical_hash_contract(raw: Mapping[str, Any]) -> bool:
    model = extract_identity_model(raw)
    if model.get("canonical_identity_field") == CANONICAL_HASH_FIELD:
        return True

    derived = raw.get("derived_fields")
    if isinstance(derived, Sequence) and not isinstance(derived, (str, bytes)):
        for item in derived:
            if isinstance(item, str):
                if canonicalize_column_name(item) == CANONICAL_HASH_FIELD:
                    return True
            elif isinstance(item, Mapping):
                value = (
                    item.get("derived_field")
                    or item.get("field")
                    or item.get("canonical_field")
                )
                if canonicalize_column_name(value) == CANONICAL_HASH_FIELD:
                    return True

    for item in recursive_find_mappings(raw):
        source = mapping_value(
            item,
            ["source_field", "source", "field", "input_field", "sourceField"],
        )
        canonical = mapping_value(
            item,
            [
                "canonical_field",
                "target_field",
                "canonical",
                "target",
                "ontology_field",
                "canonicalField",
            ],
        )
        if (
            canonicalize_column_name(source) == CANONICAL_HASH_FIELD
            or canonicalize_column_name(canonical) == CANONICAL_HASH_FIELD
        ):
            return True
    return False


def discover_contract(start_dir: Union[str, Path]) -> Optional[Path]:
    start = Path(start_dir).resolve()
    names = (
        "pip-voter-source-contract-p134-v1.0.json",
        DEFAULT_ONTOLOGY_FILENAME,
    )
    candidates = [
        directory / name
        for directory in (
            start,
            start.parent,
            start / "contracts",
            start.parent / "contracts",
            start / "ontology",
            start.parent / "ontology",
        )
        for name in names
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def discover_ontology(start_dir: Union[str, Path]) -> Optional[Path]:
    # Backward-compatible function name; v1.1 discovers ontology OR source contract.
    return discover_contract(start_dir)


def load_ontology_contract(
    ontology_path: Optional[Union[str, Path]],
    strict: bool = False,
    search_dir: Optional[Union[str, Path]] = None,
    expected_source_field_count: Optional[int] = None,
) -> OntologyContract:
    resolved_path: Optional[Path] = None

    if ontology_path:
        resolved_path = Path(ontology_path).resolve()
        if not resolved_path.exists():
            raise ContractError(f"Contract file not found: {resolved_path}")
    elif search_dir:
        resolved_path = discover_contract(search_dir)

    if resolved_path is None:
        expected = (
            int(expected_source_field_count)
            if expected_source_field_count is not None
            else LEGACY_EXPECTED_SOURCE_FIELD_COUNT
        )
        contract = OntologyContract(
            source_fields=list(FALLBACK_KNOWN_SOURCE_FIELDS),
            field_contracts={
                name: FieldContract(
                    source_field=name,
                    canonical_field=name,
                    required=False,
                    data_type=infer_default_type(name),
                )
                for name in FALLBACK_KNOWN_SOURCE_FIELDS
            },
            ontology_path=None,
            ontology_sha256=None,
            ontology_version=None,
            degraded_mode=True,
            raw_contract={},
            expected_source_field_count=expected,
            expected_source_field_count_source=(
                "CONFIG_OVERRIDE"
                if expected_source_field_count is not None
                else "LEGACY_FALLBACK"
            ),
            contract_id="PIP_VOTER_CONTRACT_DEGRADED",
            contract_type="degraded",
        )
        if strict:
            raise ContractError(
                "Strict contract mode requires an ontology/source-contract JSON file."
            )
        return contract

    try:
        raw = json.loads(resolved_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ContractError(f"Unable to parse contract JSON: {exc}") from exc

    if not isinstance(raw, Mapping):
        raise ContractError("Contract JSON root must be an object.")

    field_contracts_list = extract_field_contracts(dict(raw))
    if not field_contracts_list:
        raise ContractError(
            "No source field mappings could be resolved from contract."
        )

    field_contracts = {
        fc.source_field: fc for fc in field_contracts_list
    }
    source_fields = list(field_contracts.keys())

    expected_count, expected_count_source = (
        resolve_expected_source_field_count(
            raw,
            discovered_count=len(source_fields),
            override=expected_source_field_count,
        )
    )

    identity_model = extract_identity_model(raw)
    privacy_removed_fields = extract_privacy_removed_fields(raw)

    if not detect_canonical_hash_contract(raw):
        if strict:
            raise ContractError(
                "Strict contract requires canonical VOTER_ID_HASH declaration "
                "through identity_model, derived_fields, or field mappings."
            )

    version = None
    for key in ["version", "ontology_version", "schema_version"]:
        if key in raw:
            version = str(raw[key])
            break

    contract = OntologyContract(
        source_fields=source_fields,
        field_contracts=field_contracts,
        canonical_hash_field=(
            identity_model.get("canonical_identity_field")
            or CANONICAL_HASH_FIELD
        ),
        ontology_path=str(resolved_path),
        ontology_sha256=sha256_file(resolved_path),
        ontology_version=version,
        degraded_mode=False,
        raw_contract=dict(raw),
        expected_source_field_count=expected_count,
        expected_source_field_count_source=expected_count_source,
        contract_id=str(
            raw.get("contract_id")
            or raw.get("id")
            or raw.get("name")
            or "PIP_VOTER_CONTRACT"
        ),
        contract_type=str(raw.get("contract_type") or "ontology"),
        privacy_removed_fields=privacy_removed_fields,
        source_identity_field=identity_model.get("source_identity_field"),
        masked_label_field=identity_model.get("masked_label_field"),
        canonical_identity_field=(
            identity_model.get("canonical_identity_field")
            or CANONICAL_HASH_FIELD
        ),
        identity_derivation=identity_model.get("identity_derivation"),
    )
    contract.validate(strict=strict)
    return contract


def infer_default_type(field_name: str) -> str:
    field_name = canonicalize_column_name(field_name)
    if field_name in {"UMUR", "TAHUN_LAHIR"}:
        return "integer"
    if field_name in {"IC", "IC_LAMA", "IC_PERSONEL", "IC_SPOUSE"}:
        return "identity"
    if field_name in PSEUDONYMOUS_IDENTITY_FIELD_NAMES:
        return "pseudonymous_identity"
    if field_name in {"NO_TEL_HF"}:
        return "phone"
    if field_name in {"POSKOD"}:
        return "postcode"
    if field_name in {"JANTINA"}:
        return "gender"
    return "string"


# ---------------------------------------------------------------------------
# Column resolution
# ---------------------------------------------------------------------------

def build_alias_index(contract: OntologyContract) -> Dict[str, str]:
    index: Dict[str, str] = {}
    for source_name, fc in contract.field_contracts.items():
        for alias in fc.all_names():
            index.setdefault(alias, source_name)

    # Conservative common aliases.
    common_aliases = {
        "PDM": "DM",
        "DAERAH_MENGUNDI": "DM",
        "PARLIMEN_NAME": "PARLIMEN",
        "PARLIMEN_NAMA": "PARLIMEN",
        "DUN_NAME": "DUN",
        "DUN_NAMA": "DUN",
        "LOCALITY": "LOKALITI",
        "POSTCODE": "POSKOD",
        "ZIP": "POSKOD",
        "PHONE": "NO_TEL_HF",
        "MOBILE": "NO_TEL_HF",
        "GENDER": "JANTINA",
        "AGE": "UMUR",
        "BIRTH_YEAR": "TAHUN_LAHIR",
        "YEAR_OF_BIRTH": "TAHUN_LAHIR",
        "STATE": "NEGERI",
        "OCCUPATION": "PROFESSION",
        "PROFESION": "PROFESSION",
    }
    for alias, target in common_aliases.items():
        if target in contract.field_contracts:
            index.setdefault(alias, target)
    return index


def resolve_columns(
    columns: Sequence[Any],
    contract: OntologyContract,
) -> Tuple[Dict[str, str], List[str], List[str], List[Tuple[str, str]]]:
    alias_index = build_alias_index(contract)
    mapping: Dict[str, str] = {}
    unknown: List[str] = []
    collisions: List[Tuple[str, str]] = []
    seen_targets: Dict[str, str] = {}

    for raw_col in columns:
        raw_name = str(raw_col)
        canonical_raw = canonicalize_column_name(raw_name)
        target = alias_index.get(canonical_raw)
        if target:
            if target in seen_targets:
                collisions.append((seen_targets[target], raw_name))
            else:
                seen_targets[target] = raw_name
                mapping[raw_name] = target
        else:
            unknown.append(raw_name)

    resolved_targets = set(mapping.values())
    missing = [x for x in contract.source_fields if x not in resolved_targets]
    return mapping, missing, unknown, collisions


# ---------------------------------------------------------------------------
# Input readers
# ---------------------------------------------------------------------------

@dataclass
class InputBatch:
    source_path: Path
    source_file_sha256: str
    source_sheet: Optional[str]
    dataframe: pd.DataFrame


def read_csv_like(path: Path, sep: Optional[str] = None) -> pd.DataFrame:
    kwargs = {
        "dtype": object,
        "keep_default_na": False,
        "na_filter": False,
        "encoding": "utf-8-sig",
    }
    if sep is None:
        return pd.read_csv(path, sep=None, engine="python", **kwargs)
    return pd.read_csv(path, sep=sep, **kwargs)


def read_json_records(path: Path) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in {".jsonl", ".ndjson"}:
        records = []
        with path.open("r", encoding="utf-8-sig") as fh:
            for line_number, line in enumerate(fh, start=1):
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    value = json.loads(stripped)
                except json.JSONDecodeError as exc:
                    raise InputFormatError(
                        f"Invalid JSONL at line {line_number}: {exc}"
                    ) from exc
                if not isinstance(value, dict):
                    raise InputFormatError(
                        f"JSONL line {line_number} is not an object."
                    )
                records.append(value)
        return pd.DataFrame(records)

    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if isinstance(raw, list):
        if not all(isinstance(x, dict) for x in raw):
            raise InputFormatError("JSON array must contain record objects.")
        return pd.DataFrame(raw)
    if isinstance(raw, dict):
        for key in ["records", "data", "rows", "items"]:
            if key in raw and isinstance(raw[key], list):
                return pd.DataFrame(raw[key])
        return pd.DataFrame([raw])
    raise InputFormatError("Unsupported JSON root structure.")


def iter_input_batches(path: Union[str, Path]) -> Iterator[InputBatch]:
    p = Path(path).resolve()
    if not p.exists():
        raise InputFormatError(f"Input file not found: {p}")
    suffix = p.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise InputFormatError(
            f"Unsupported input extension {suffix}. "
            f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    digest = sha256_file(p)

    if suffix in {".xlsx", ".xls", ".xlsm"}:
        try:
            sheets = pd.read_excel(
                p,
                sheet_name=None,
                dtype=object,
                keep_default_na=False,
            )
        except Exception as exc:
            raise InputFormatError(f"Unable to read Excel workbook: {exc}") from exc

        for sheet_name, df in sheets.items():
            yield InputBatch(
                source_path=p,
                source_file_sha256=digest,
                source_sheet=str(sheet_name),
                dataframe=df,
            )
        return

    if suffix == ".csv":
        df = read_csv_like(p, sep=",")
    elif suffix == ".tsv":
        df = read_csv_like(p, sep="\t")
    elif suffix == ".txt":
        df = read_csv_like(p, sep=None)
    elif suffix in {".json", ".jsonl", ".ndjson"}:
        df = read_json_records(p)
    else:
        raise InputFormatError(f"Unhandled input extension: {suffix}")

    yield InputBatch(
        source_path=p,
        source_file_sha256=digest,
        source_sheet=None,
        dataframe=df,
    )


# ---------------------------------------------------------------------------
# Rule registry and core field cleansing
# ---------------------------------------------------------------------------

@dataclass
class RuleDefinition:
    rule_id: str
    title: str
    description: str
    modes: Set[CleanseMode]
    deterministic: bool
    confidence: RuleConfidence
    severity: Severity


RULES: Dict[str, RuleDefinition] = {}


def register_rule(
    rule_id: str,
    title: str,
    description: str,
    modes: Sequence[CleanseMode],
    deterministic: bool,
    confidence: RuleConfidence,
    severity: Severity,
) -> None:
    RULES[rule_id] = RuleDefinition(
        rule_id=rule_id,
        title=title,
        description=description,
        modes=set(modes),
        deterministic=deterministic,
        confidence=confidence,
        severity=severity,
    )


register_rule(
    "R_NULL_001",
    "Normalize null token",
    "Convert configured null-like tokens to None.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.LOW,
)
register_rule(
    "R_TEXT_001",
    "Unicode and whitespace normalization",
    "Apply NFKC Unicode normalization and collapse repeated whitespace.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.LOW,
)
register_rule(
    "R_LABEL_001",
    "Controlled label normalization",
    "Uppercase deterministic categorical/geographical labels.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.LOW,
)
register_rule(
    "R_GENDER_001",
    "Gender vocabulary mapping",
    "Map known gender variants to MALE/FEMALE; preserve and flag unknowns.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_AGE_001",
    "Age parsing",
    "Parse deterministic integer age representations.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_AGE_002",
    "Age range validation",
    "Flag age outside configured range.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.HIGH,
)
register_rule(
    "R_YEAR_001",
    "Birth year normalization",
    "Parse and validate birth year.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_PHONE_001",
    "Phone normalization",
    "Normalize plausible Malaysian phone format without inventing missing digits.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_PHONE_002",
    "Multiple phone values",
    "Flag cells containing multiple phone values for review.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.MEDIUM,
)
register_rule(
    "R_POSTCODE_001",
    "Postcode normalization",
    "Normalize deterministic numeric formatting and validate length.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_ID_001",
    "Identity formatting normalization",
    "Normalize identity punctuation and spreadsheet coercion.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.HIGH,
)
register_rule(
    "R_ID_002",
    "Identity format validation",
    "Flag non-standard identity lengths without inventing digits.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.HIGH,
)
register_rule(
    "R_REQUIRED_001",
    "Required field missing",
    "Flag or quarantine records missing ontology-required fields.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.HIGH,
)
register_rule(
    "R_ENUM_001",
    "Enum validation",
    "Validate ontology-controlled values.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_PATTERN_001",
    "Pattern validation",
    "Validate ontology regex pattern.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)
register_rule(
    "R_AGE_YEAR_001",
    "Age and birth-year consistency",
    "Compare UMUR against TAHUN_LAHIR within expected calendar tolerance.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.HIGH,
)
register_rule(
    "R_DUP_001",
    "Exact record duplicate",
    "Detect exact duplicate canonical records.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.MEDIUM,
)
register_rule(
    "R_DUP_002",
    "Identity duplicate",
    "Detect repeated VOTER_ID_HASH records.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.HIGH,
)
register_rule(
    "R_DUP_003",
    "Identity conflict",
    "Repeated voter hash has conflicting demographic/electoral attributes.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.CRITICAL,
)
register_rule(
    "R_HIER_001",
    "Electoral hierarchy conflict",
    "Detect one child geography mapping to multiple parents.",
    [CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.HIGH,
)
register_rule(
    "R_UNKNOWN_001",
    "Unknown source column",
    "Input column is not mapped by ontology.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.LOW,
)
register_rule(
    "R_SCHEMA_001",
    "Missing source field",
    "Ontology source field absent from input.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.HIGH,
)
register_rule(
    "R_PRIVACY_001",
    "Privacy-removed field reappeared",
    "Field declared privacy-removed by source contract is present in input.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.CRITICAL,
)
register_rule(
    "R_SOURCE_ID_001",
    "Pseudonymous source identity validation",
    "Validate source pseudonymous identity without treating it as IC/NRIC.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.CRITICAL,
)
register_rule(
    "R_GEO_DERIVE_001",
    "Deterministic geography code/name derivation",
    "Split CODE.NAME electoral geography labels without replacing originals.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.CERTAIN,
    Severity.INFO,
)
register_rule(
    "R_DATE_001",
    "Date normalization",
    "Normalize parseable date values to ISO-8601.",
    [CleanseMode.SAFE, CleanseMode.STANDARD, CleanseMode.STRICT],
    True,
    RuleConfidence.HIGH,
    Severity.MEDIUM,
)


class RecordCleanser:
    def __init__(
        self,
        contract: OntologyContract,
        config: CleanserConfig,
        hash_salt: bytes,
    ) -> None:
        self.contract = contract
        self.config = config
        self.hash_salt = hash_salt

    def _issue(
        self,
        result: RecordResult,
        field_name: Optional[str],
        rule_id: str,
        message: str,
        *,
        severity: Optional[Severity] = None,
        action: Action = Action.FLAG,
        confidence: Optional[RuleConfidence] = None,
        evidence_ref: Optional[str] = None,
        original_value: Any = None,
        normalized_value: Any = None,
        review_required: bool = False,
    ) -> None:
        rule = RULES[rule_id]
        issue = CleansingIssue(
            issue_id=make_uuid("ISSUE"),
            record_ref=result.record_ref,
            field_name=field_name,
            rule_id=rule_id,
            severity=(severity or rule.severity).value,
            action=action.value,
            confidence=(confidence or rule.confidence).value,
            message=message,
            evidence_ref=evidence_ref,
            original_token=privacy_safe_token(field_name, original_value),
            normalized_token=privacy_safe_token(field_name, normalized_value),
            review_required=review_required,
        )
        result.issues.append(issue)

    def _change(
        self,
        result: RecordResult,
        field_name: str,
        rule_id: str,
        before: Any,
        after: Any,
        action: Action = Action.NORMALIZE,
        evidence_ref: Optional[str] = None,
    ) -> None:
        rule = RULES[rule_id]
        if before == after:
            return
        result.changes.append(
            FieldChange(
                change_id=make_uuid("CHANGE"),
                record_ref=result.record_ref,
                field_name=field_name,
                rule_id=rule_id,
                action=action.value,
                confidence=rule.confidence.value,
                before_token=privacy_safe_token(field_name, before),
                after_token=privacy_safe_token(field_name, after),
                deterministic=rule.deterministic,
                evidence_ref=evidence_ref,
            )
        )

    def cleanse_record(
        self,
        raw_record: Mapping[str, Any],
        source_ref: SourceRef,
    ) -> RecordResult:
        record_ref = source_ref.source_record_ref
        cleaned: Dict[str, Any] = {}
        result = RecordResult(
            record_ref=record_ref,
            cleaned_record=cleaned,
            source_ref=source_ref,
        )

        for source_field in self.contract.source_fields:
            fc = self.contract.field_contracts[source_field]
            raw_value = raw_record.get(source_field)
            value = self.cleanse_field(source_field, raw_value, fc, result)
            cleaned[fc.canonical_field] = value

        # Canonical hash is derived after field normalization.
        # P134: VTR_ID -> HMAC-SHA256 -> VOTER_ID_HASH
        # Legacy: IC-family -> v1.0 compatible hash path
        voter_hash = derive_contract_voter_hash(
            cleaned,
            self.hash_salt,
            self.contract,
        )
        cleaned[self.contract.canonical_hash_field] = voter_hash

        # Deterministic CODE.NAME geography derivation; originals remain intact.
        geography_derived = derive_geography_fields(cleaned)
        cleaned.update(geography_derived)
        for field_name, value in geography_derived.items():
            if value is not None:
                result.evidence_refs.append(
                    f"DERIVED:{field_name}:R_GEO_DERIVE_001"
                )

        self.validate_record_level(cleaned, result)

        # Privacy rule: raw identity fields are retained only in canonical cleaned
        # output if the ontology requires them. Diagnostics never emit them.
        # Downstream graph IDs MUST use VOTER_ID_HASH.

        if voter_hash is None:
            self._issue(
                result,
                self.contract.canonical_hash_field,
                "R_ID_002",
                "Unable to derive canonical VOTER_ID_HASH from the source-contract identity model.",
                severity=Severity.HIGH,
                action=Action.QUARANTINE if self.config.reject_on_no_identity else Action.FLAG,
                review_required=True,
            )
            if self.config.reject_on_no_identity:
                result.disposition = RecordDisposition.REJECTED
                result.quarantine_reasons.append("NO_CANONICAL_IDENTITY")

        self.finalize_record_disposition(result)
        return result

    def cleanse_field(
        self,
        field_name: str,
        raw_value: Any,
        fc: FieldContract,
        result: RecordResult,
    ) -> Any:
        # Null normalization
        if is_nullish(raw_value, self.config.null_tokens):
            if raw_value is not None and str(raw_value).strip():
                self._change(
                    result,
                    field_name,
                    "R_NULL_001",
                    raw_value,
                    None,
                    action=Action.NULLIFY,
                )
            if fc.required:
                self._issue(
                    result,
                    field_name,
                    "R_REQUIRED_001",
                    "Ontology-required field is missing.",
                    action=Action.QUARANTINE if self.config.quarantine_on_required_missing else Action.FLAG,
                    review_required=True,
                )
                if self.config.quarantine_on_required_missing:
                    result.quarantine_reasons.append(f"REQUIRED_MISSING:{field_name}")
            return None

        canonical_name = canonicalize_column_name(field_name)
        dtype = canonicalize_column_name(fc.data_type)

        source_identity_field = canonicalize_column_name(
            self.contract.source_identity_field or ""
        )
        if (
            (
                canonical_name == source_identity_field
                and source_identity_field in PSEUDONYMOUS_IDENTITY_FIELD_NAMES
            )
            or dtype in {"PSEUDONYMOUS_IDENTITY", "PSEUDONYMOUS_ID"}
        ):
            normalized = normalize_pseudonymous_identity(raw_value)
            if normalized is None:
                return None
            if normalized != as_nullable_text(raw_value):
                self._change(
                    result,
                    field_name,
                    "R_SOURCE_ID_001",
                    raw_value,
                    normalized,
                )

            if fc.pattern:
                try:
                    pattern_valid = re.fullmatch(fc.pattern, normalized) is not None
                except re.error:
                    pattern_valid = False
                    self._issue(
                        result,
                        field_name,
                        "R_SOURCE_ID_001",
                        "Source-contract identity regex is invalid.",
                        severity=Severity.HIGH,
                        action=Action.FLAG,
                        original_value=fc.pattern,
                        review_required=True,
                    )
                if not pattern_valid:
                    self._issue(
                        result,
                        field_name,
                        "R_SOURCE_ID_001",
                        "Pseudonymous source identity does not satisfy the source-contract pattern.",
                        severity=Severity.CRITICAL,
                        action=Action.QUARANTINE,
                        original_value=raw_value,
                        normalized_value=normalized,
                        review_required=True,
                    )
                    reason = "SOURCE_IDENTITY_PATTERN_MISMATCH"
                    if reason not in result.quarantine_reasons:
                        result.quarantine_reasons.append(reason)
            return normalized

        if canonical_name in IDENTITY_FIELD_NAMES or dtype in {"IDENTITY", "IC", "NRIC"}:
            digits, status = identity_format_status(raw_value)
            if digits != as_nullable_text(raw_value):
                self._change(result, field_name, "R_ID_001", raw_value, digits)
            if status not in {"VALID_12_DIGIT", "LEGACY_LENGTH"}:
                self._issue(
                    result,
                    field_name,
                    "R_ID_002",
                    f"Identity value status: {status}.",
                    original_value=raw_value,
                    normalized_value=digits,
                    review_required=True,
                )
            return digits

        if canonical_name == "JANTINA" or dtype == "GENDER":
            # Source-specific controlled codes take precedence. P134 declares
            # JANTINA as L/P, so do not rewrite those codes to MALE/FEMALE.
            if fc.enum_values:
                candidate = normalize_label(raw_value)
                allowed = {
                    normalize_label(value): normalize_label(value)
                    for value in fc.enum_values
                }
                if candidate in allowed:
                    normalized = allowed[candidate]
                    status = "CONTRACT_ENUM"
                else:
                    normalized, status = normalize_gender(raw_value)
            else:
                normalized, status = normalize_gender(raw_value)

            if normalized != as_nullable_text(raw_value):
                self._change(result, field_name, "R_GENDER_001", raw_value, normalized)
            if status == "UNMAPPED":
                self._issue(
                    result,
                    field_name,
                    "R_GENDER_001",
                    "Gender value is not in known mapping vocabulary.",
                    original_value=raw_value,
                    normalized_value=normalized,
                    review_required=True,
                )
            if self.config.mode in {CleanseMode.STANDARD, CleanseMode.STRICT}:
                self.validate_field_contract(field_name, normalized, fc, result)
            return normalized

        if canonical_name == "UMUR" or dtype in {"AGE"}:
            normalized, status = normalize_age(
                raw_value,
                min_age=self.config.min_age,
                max_age=self.config.max_age,
            )
            if normalized is not None and normalized != raw_value:
                self._change(result, field_name, "R_AGE_001", raw_value, normalized)
            if status == "OUT_OF_RANGE":
                self._issue(
                    result,
                    field_name,
                    "R_AGE_002",
                    f"Age is outside configured range {self.config.min_age}-{self.config.max_age}.",
                    original_value=raw_value,
                    normalized_value=normalized,
                    review_required=True,
                )
            elif status == "MISSING_OR_INVALID":
                self._issue(
                    result,
                    field_name,
                    "R_AGE_001",
                    "Age value could not be parsed deterministically.",
                    original_value=raw_value,
                    review_required=True,
                )
            return normalized

        if canonical_name == "TAHUN_LAHIR" or dtype in {"BIRTH_YEAR", "YEAR"}:
            normalized, status = normalize_year(raw_value)
            if normalized is not None and normalized != raw_value:
                self._change(result, field_name, "R_YEAR_001", raw_value, normalized)
            if status == "OUT_OF_RANGE":
                self._issue(
                    result,
                    field_name,
                    "R_YEAR_001",
                    "Birth year is outside plausible range.",
                    original_value=raw_value,
                    normalized_value=normalized,
                    review_required=True,
                )
            return normalized

        if canonical_name == "NO_TEL_HF" or dtype in {"PHONE", "TELEPHONE", "MOBILE"}:
            normalized, status = normalize_phone(raw_value)
            if normalized != as_nullable_text(raw_value):
                self._change(result, field_name, "R_PHONE_001", raw_value, normalized)
            if status == "MULTIPLE_VALUES":
                self._issue(
                    result,
                    field_name,
                    "R_PHONE_002",
                    "Multiple phone values detected in one cell; preserved for review.",
                    original_value=raw_value,
                    review_required=True,
                )
            elif status in {"INVALID", "INVALID_LENGTH"}:
                self._issue(
                    result,
                    field_name,
                    "R_PHONE_001",
                    f"Phone status: {status}.",
                    original_value=raw_value,
                    normalized_value=normalized,
                    review_required=True,
                )
            return normalized

        if canonical_name == "POSKOD" or dtype in {"POSTCODE", "ZIP"}:
            normalized, status = normalize_postcode(raw_value)
            if normalized != as_nullable_text(raw_value):
                self._change(result, field_name, "R_POSTCODE_001", raw_value, normalized)
            if status not in {"VALID", "MISSING"}:
                self._issue(
                    result,
                    field_name,
                    "R_POSTCODE_001",
                    f"Postcode status: {status}; no ambiguous zero-padding applied.",
                    original_value=raw_value,
                    normalized_value=normalized,
                    review_required=True,
                )
            return normalized

        if dtype in {"DATE", "DATETIME", "TIMESTAMP"} or "DATE" in canonical_name or "TARIKH" in canonical_name:
            normalized, status = normalize_date(raw_value)
            if status.startswith("PARSED") and normalized != as_nullable_text(raw_value):
                self._change(result, field_name, "R_DATE_001", raw_value, normalized)
            elif status == "UNPARSED":
                self._issue(
                    result,
                    field_name,
                    "R_DATE_001",
                    "Date value could not be parsed deterministically.",
                    original_value=raw_value,
                    review_required=True,
                )
            return normalized

        if dtype in {"INTEGER", "INT"}:
            parsed = parse_int(raw_value)
            if parsed is not None:
                if parsed != raw_value:
                    self._change(result, field_name, "R_TEXT_001", raw_value, parsed)
                value: Any = parsed
            else:
                value = as_nullable_text(raw_value)
        elif dtype in {"NUMBER", "FLOAT", "DECIMAL"}:
            parsed_f = parse_float(raw_value)
            if parsed_f is not None:
                if parsed_f != raw_value:
                    self._change(result, field_name, "R_TEXT_001", raw_value, parsed_f)
                value = parsed_f
            else:
                value = as_nullable_text(raw_value)
        elif dtype in {"BOOLEAN", "BOOL"}:
            parsed_b, status = normalize_boolean(raw_value)
            value = parsed_b if status == "MAPPED" else as_nullable_text(raw_value)
        else:
            text = as_nullable_text(raw_value)
            if text is None:
                value = None
            else:
                normalized_text = collapse_whitespace(unicodedata.normalize("NFKC", text))
                if normalized_text != text:
                    self._change(
                        result,
                        field_name,
                        "R_TEXT_001",
                        raw_value,
                        normalized_text,
                    )

                if canonical_name in set(ELECTORAL_HIERARCHY_FIELDS) | {
                    "KAUM",
                    "KAUM2",
                    "BANGSA",
                    "AGAMA",
                    "PROFESSION",
                    "KOD_UMUR",
                    "ALAMAT_BANDAR",
                    "ALAMAT_NEGERI",
                }:
                    label = normalize_label(normalized_text)
                    if label != normalized_text:
                        self._change(
                            result,
                            field_name,
                            "R_LABEL_001",
                            normalized_text,
                            label,
                        )
                    value = label
                elif canonical_name == "NAMA":
                    value = normalize_person_name(normalized_text)
                    if value != normalized_text:
                        self._change(
                            result,
                            field_name,
                            "R_TEXT_001",
                            normalized_text,
                            value,
                        )
                else:
                    value = normalized_text

        if self.config.mode in {CleanseMode.STANDARD, CleanseMode.STRICT}:
            self.validate_field_contract(field_name, value, fc, result)

        return value

    def validate_field_contract(
        self,
        field_name: str,
        value: Any,
        fc: FieldContract,
        result: RecordResult,
    ) -> None:
        if value is None:
            return

        if fc.enum_values:
            allowed = {normalize_label(x) for x in fc.enum_values}
            candidate = normalize_label(value)
            if candidate not in allowed:
                self._issue(
                    result,
                    field_name,
                    "R_ENUM_001",
                    "Value is outside ontology enum vocabulary.",
                    original_value=value,
                    review_required=True,
                )

        if fc.pattern:
            try:
                if not re.fullmatch(fc.pattern, str(value)):
                    self._issue(
                        result,
                        field_name,
                        "R_PATTERN_001",
                        "Value does not satisfy ontology regex pattern.",
                        original_value=value,
                        review_required=True,
                    )
            except re.error:
                self._issue(
                    result,
                    field_name,
                    "R_PATTERN_001",
                    "Ontology regex pattern is invalid; validation skipped.",
                    severity=Severity.HIGH,
                    original_value=fc.pattern,
                    review_required=True,
                )

        number = parse_float(value)
        if number is not None:
            if fc.min_value is not None and number < fc.min_value:
                self._issue(
                    result,
                    field_name,
                    "R_PATTERN_001",
                    f"Numeric value below ontology minimum {fc.min_value}.",
                    original_value=value,
                    review_required=True,
                )
            if fc.max_value is not None and number > fc.max_value:
                self._issue(
                    result,
                    field_name,
                    "R_PATTERN_001",
                    f"Numeric value above ontology maximum {fc.max_value}.",
                    original_value=value,
                    review_required=True,
                )

    def validate_record_level(
        self,
        record: Mapping[str, Any],
        result: RecordResult,
    ) -> None:
        age = parse_int(record.get("UMUR"))
        year = parse_int(record.get("TAHUN_LAHIR"))
        if age is not None and year is not None:
            implied_age = self.config.current_year - year
            if abs(implied_age - age) > 2:
                self._issue(
                    result,
                    "UMUR",
                    "R_AGE_YEAR_001",
                    f"UMUR and TAHUN_LAHIR differ by more than two years "
                    f"against reference year {self.config.current_year}.",
                    original_value=age,
                    normalized_value=implied_age,
                    review_required=True,
                )
                if self.config.mode == CleanseMode.STRICT:
                    result.quarantine_reasons.append("AGE_BIRTH_YEAR_CONFLICT")

    def finalize_record_disposition(self, result: RecordResult) -> None:
        if result.disposition == RecordDisposition.REJECTED:
            result.confidence = self.compute_confidence(result)
            return

        if result.quarantine_reasons:
            result.disposition = RecordDisposition.QUARANTINED
        elif any(issue.review_required for issue in result.issues):
            result.disposition = RecordDisposition.CLEAN_WITH_FLAGS
        else:
            result.disposition = RecordDisposition.CLEAN

        result.confidence = self.compute_confidence(result)

    @staticmethod
    def compute_confidence(result: RecordResult) -> float:
        score = 1.0
        severity_penalty = {
            Severity.INFO.value: 0.005,
            Severity.LOW.value: 0.01,
            Severity.MEDIUM.value: 0.03,
            Severity.HIGH.value: 0.08,
            Severity.CRITICAL.value: 0.18,
        }
        for issue in result.issues:
            score -= severity_penalty.get(issue.severity, 0.02)
            if issue.review_required:
                score -= 0.015
        if result.quarantine_reasons:
            score -= 0.15
        if result.cleaned_record.get(CANONICAL_HASH_FIELD) is None:
            score -= 0.2
        return clamp(score)


# ---------------------------------------------------------------------------
# Dataset-level analyses
# ---------------------------------------------------------------------------

def canonical_record_for_duplicate(record: Mapping[str, Any]) -> Dict[str, Any]:
    exclude = set(REPORT_SENSITIVE_IDENTITY_FIELDS) | {
        CANONICAL_HASH_FIELD,
        "__SOURCE_REF",
        "__SOURCE_SHEET",
        "__SOURCE_ROW",
    }
    return {
        k: v for k, v in record.items()
        if canonicalize_column_name(k) not in exclude
    }


def apply_exact_duplicate_analysis(
    results: List[RecordResult],
    config: CleanserConfig,
) -> int:
    groups: Dict[str, List[RecordResult]] = defaultdict(list)
    for result in results:
        fp = row_fingerprint(
            result.cleaned_record,
            exclude_fields={CANONICAL_HASH_FIELD},
        )
        groups[fp].append(result)

    duplicate_count = 0
    for fp, members in groups.items():
        if len(members) <= 1:
            continue
        group_id = f"EXACT_{fp[:20]}"
        for index, result in enumerate(members):
            result.duplicate_group_id = result.duplicate_group_id or group_id
            issue = CleansingIssue(
                issue_id=make_uuid("ISSUE"),
                record_ref=result.record_ref,
                field_name=None,
                rule_id="R_DUP_001",
                severity=Severity.MEDIUM.value,
                action=(
                    Action.DEDUPLICATE.value
                    if config.dedupe_exact_records and index > 0
                    else Action.FLAG.value
                ),
                confidence=RuleConfidence.CERTAIN.value,
                message=f"Exact canonical duplicate group {group_id}.",
                evidence_ref=group_id,
                review_required=not config.dedupe_exact_records,
            )
            result.issues.append(issue)
            if config.dedupe_exact_records and index > 0:
                result.quarantine_reasons.append("EXACT_DUPLICATE_SUPPRESSED")
            duplicate_count += 1
    return duplicate_count


def conflict_signature(record: Mapping[str, Any]) -> Dict[str, Any]:
    fields = [
        "NAMA",
        "JANTINA",
        "TAHUN_LAHIR",
        "LOKALITI",
        "DM",
        "DUN",
        "PARLIMEN",
        "NEGERI",
    ]
    return {f: record.get(f) for f in fields}


def apply_source_identity_duplicate_analysis(
    results: List[RecordResult],
    contract: OntologyContract,
) -> int:
    source_identity_field = canonicalize_column_name(
        contract.source_identity_field or ""
    )
    if not source_identity_field:
        return 0

    groups: Dict[str, List[RecordResult]] = defaultdict(list)
    for result in results:
        value = normalize_pseudonymous_identity(
            result.cleaned_record.get(source_identity_field)
        )
        if value:
            groups[value].append(result)

    duplicate_groups = 0
    for value, members in groups.items():
        if len(members) <= 1:
            continue
        duplicate_groups += 1
        group_id = f"SOURCE_ID_{sha256_text(value)[:20]}"
        for result in members:
            result.duplicate_group_id = result.duplicate_group_id or group_id
            result.issues.append(
                CleansingIssue(
                    issue_id=make_uuid("ISSUE"),
                    record_ref=result.record_ref,
                    field_name=source_identity_field,
                    rule_id="R_SOURCE_ID_001",
                    severity=Severity.CRITICAL.value,
                    action=Action.QUARANTINE.value,
                    confidence=RuleConfidence.CERTAIN.value,
                    message="Pseudonymous source identity is duplicated in the dataset.",
                    evidence_ref=group_id,
                    original_token=privacy_safe_token(source_identity_field, value),
                    normalized_token=None,
                    review_required=True,
                )
            )
            reason = "SOURCE_IDENTITY_DUPLICATE"
            if reason not in result.quarantine_reasons:
                result.quarantine_reasons.append(reason)
            result.disposition = RecordDisposition.QUARANTINED

    return duplicate_groups


def apply_identity_duplicate_analysis(
    results: List[RecordResult],
    config: CleanserConfig,
) -> Tuple[int, int]:
    groups: Dict[str, List[RecordResult]] = defaultdict(list)
    for result in results:
        voter_hash = result.cleaned_record.get(CANONICAL_HASH_FIELD)
        if voter_hash:
            groups[str(voter_hash)].append(result)

    duplicate_groups = 0
    conflict_groups = 0

    for voter_hash, members in groups.items():
        if len(members) <= 1:
            continue

        duplicate_groups += 1
        group_id = f"IDENTITY_{sha256_text(voter_hash)[:20]}"

        signatures = {
            stable_json(conflict_signature(m.cleaned_record))
            for m in members
        }
        has_conflict = len(signatures) > 1
        if has_conflict:
            conflict_groups += 1

        for result in members:
            result.duplicate_group_id = group_id
            result.issues.append(
                CleansingIssue(
                    issue_id=make_uuid("ISSUE"),
                    record_ref=result.record_ref,
                    field_name=CANONICAL_HASH_FIELD,
                    rule_id="R_DUP_002",
                    severity=Severity.HIGH.value,
                    action=Action.FLAG.value,
                    confidence=RuleConfidence.CERTAIN.value,
                    message=f"Repeated canonical voter identity in group {group_id}.",
                    evidence_ref=group_id,
                    review_required=True,
                )
            )

            if has_conflict:
                result.issues.append(
                    CleansingIssue(
                        issue_id=make_uuid("ISSUE"),
                        record_ref=result.record_ref,
                        field_name=CANONICAL_HASH_FIELD,
                        rule_id="R_DUP_003",
                        severity=Severity.CRITICAL.value,
                        action=(
                            Action.QUARANTINE.value
                            if config.quarantine_on_identity_conflict
                            else Action.FLAG.value
                        ),
                        confidence=RuleConfidence.HIGH.value,
                        message="Repeated voter identity has conflicting profile/electoral attributes.",
                        evidence_ref=group_id,
                        review_required=True,
                    )
                )
                if config.quarantine_on_identity_conflict:
                    result.quarantine_reasons.append("IDENTITY_PROFILE_CONFLICT")
                    result.disposition = RecordDisposition.QUARANTINED

    return duplicate_groups, conflict_groups


def hierarchy_pairs() -> List[Tuple[str, str]]:
    # child -> parent
    return [
        ("LOKALITI", "DM"),
        ("DM", "DUN"),
        ("DUN", "PARLIMEN"),
        ("PARLIMEN", "NEGERI"),
    ]


def apply_hierarchy_analysis(
    results: List[RecordResult],
    config: CleanserConfig,
) -> List[Dict[str, Any]]:
    conflicts: List[Dict[str, Any]] = []

    for child_field, parent_field in hierarchy_pairs():
        child_map: Dict[str, Counter] = defaultdict(Counter)
        member_map: Dict[Tuple[str, str], List[RecordResult]] = defaultdict(list)

        for result in results:
            child = normalize_label(result.cleaned_record.get(child_field))
            parent = normalize_label(result.cleaned_record.get(parent_field))
            if child and parent:
                child_map[child][parent] += 1
                member_map[(child, parent)].append(result)

        for child, parent_counts in child_map.items():
            if len(parent_counts) <= 1:
                continue

            total = sum(parent_counts.values())
            dominant_parent, dominant_count = parent_counts.most_common(1)[0]
            dominance = dominant_count / total if total else 0.0

            conflict_id = f"HIER_{sha256_text(child_field + '|' + child)[:20]}"
            conflict = {
                "conflict_id": conflict_id,
                "child_field": child_field,
                "parent_field": parent_field,
                "child_token": privacy_safe_token(child_field, child),
                "parent_distribution": {
                    privacy_safe_token(parent_field, k): v
                    for k, v in parent_counts.items()
                },
                "dominant_parent_token": privacy_safe_token(parent_field, dominant_parent),
                "dominance_ratio": round(dominance, 6),
                "record_count": total,
                "auto_corrected": False,
                "review_required": True,
            }
            conflicts.append(conflict)

            # Important: never silently rewrite hierarchy values. Even when a
            # dominant parent exists, this is evidence for review only.
            for parent_value, member_results in [
                (p, member_map[(child, p)]) for p in parent_counts.keys()
            ]:
                for result in member_results:
                    result.issues.append(
                        CleansingIssue(
                            issue_id=make_uuid("ISSUE"),
                            record_ref=result.record_ref,
                            field_name=parent_field,
                            rule_id="R_HIER_001",
                            severity=Severity.HIGH.value,
                            action=(
                                Action.QUARANTINE.value
                                if config.quarantine_on_hierarchy_conflict
                                else Action.FLAG.value
                            ),
                            confidence=RuleConfidence.HIGH.value,
                            message=(
                                f"{child_field} maps to multiple {parent_field} values; "
                                "no automatic hierarchy correction applied."
                            ),
                            evidence_ref=conflict_id,
                            original_token=privacy_safe_token(parent_field, parent_value),
                            normalized_token=None,
                            review_required=True,
                        )
                    )
                    if config.quarantine_on_hierarchy_conflict:
                        reason = f"HIERARCHY_CONFLICT:{child_field}->{parent_field}"
                        if reason not in result.quarantine_reasons:
                            result.quarantine_reasons.append(reason)
                        result.disposition = RecordDisposition.QUARANTINED

    return conflicts


def detect_privacy_removed_columns(
    columns: Sequence[Any],
    contract: OntologyContract,
) -> List[str]:
    removed = {
        canonicalize_column_name(field)
        for field in contract.privacy_removed_fields
    }
    return [
        str(column)
        for column in columns
        if canonicalize_column_name(column) in removed
    ]


def privacy_violation_rows(
    df: pd.DataFrame,
    violating_columns: Sequence[str],
) -> Dict[Any, List[str]]:
    rows: Dict[Any, List[str]] = defaultdict(list)
    for column in violating_columns:
        if column not in df.columns:
            continue
        for idx, value in df[column].items():
            if not is_nullish(value):
                rows[idx].append(canonicalize_column_name(column))
    return dict(rows)


def apply_privacy_violation_to_result(
    result: RecordResult,
    violating_fields: Sequence[str],
) -> None:
    unique_fields = list(dict.fromkeys(
        canonicalize_column_name(field)
        for field in violating_fields
    ))
    if not unique_fields:
        return

    result.issues.append(
        CleansingIssue(
            issue_id=make_uuid("ISSUE"),
            record_ref=result.record_ref,
            field_name=None,
            rule_id="R_PRIVACY_001",
            severity=Severity.CRITICAL.value,
            action=Action.QUARANTINE.value,
            confidence=RuleConfidence.CERTAIN.value,
            message=(
                "One or more fields declared privacy-removed by the source contract "
                "reappeared with data. Values were not copied into canonical output."
            ),
            evidence_ref=(
                "PRIVACY_FIELDS:"
                + sha256_text("|".join(sorted(unique_fields)))[:20]
            ),
            original_token=None,
            normalized_token=None,
            review_required=True,
        )
    )
    reason = "PRIVACY_REMOVED_FIELD_REAPPEARED"
    if reason not in result.quarantine_reasons:
        result.quarantine_reasons.append(reason)
    result.disposition = RecordDisposition.QUARANTINED


# ---------------------------------------------------------------------------
# Batch normalization and source lineage
# ---------------------------------------------------------------------------

def source_record_ref(
    file_sha256: str,
    sheet: Optional[str],
    row_number: int,
) -> str:
    material = f"{file_sha256}|{sheet or ''}|{row_number}"
    return f"SRCREC_{sha256_text(material)[:24]}"


def make_source_ref(
    batch: InputBatch,
    row_number: int,
    ingestion_ts: str,
) -> SourceRef:
    ref = source_record_ref(
        batch.source_file_sha256,
        batch.source_sheet,
        row_number,
    )
    return SourceRef(
        input_path=str(batch.source_path),
        source_file_name=batch.source_path.name,
        source_file_sha256=batch.source_file_sha256,
        source_sheet=batch.source_sheet,
        source_row_number=row_number,
        ingestion_timestamp_utc=ingestion_ts,
        source_record_ref=ref,
    )


def remap_dataframe(
    df: pd.DataFrame,
    column_mapping: Mapping[str, str],
    contract: OntologyContract,
    preserve_unknown: bool,
) -> pd.DataFrame:
    renamed = df.rename(columns=column_mapping).copy()

    # If a source target is absent, add as null to maintain contract-defined physical shape.
    for field_name in contract.source_fields:
        if field_name not in renamed.columns:
            renamed[field_name] = None

    ordered = list(contract.source_fields)

    if preserve_unknown:
        unknown = [
            c for c in renamed.columns
            if c not in contract.source_fields
        ]
        ordered.extend(unknown)

    return renamed.loc[:, ordered]


# ---------------------------------------------------------------------------
# Output privacy and serialization
# ---------------------------------------------------------------------------

def diagnostics_record(result: RecordResult) -> Dict[str, Any]:
    """
    Privacy-safe quarantine/diagnostic row.
    Raw IC, names, phone and detailed address are not emitted.
    """
    return {
        "record_ref": result.record_ref,
        "voter_id_hash": result.cleaned_record.get(CANONICAL_HASH_FIELD),
        "disposition": result.disposition.value,
        "confidence": round(result.confidence, 6),
        "issue_count": len(result.issues),
        "change_count": len(result.changes),
        "quarantine_reasons": "|".join(result.quarantine_reasons),
        "duplicate_group_id": result.duplicate_group_id,
        "source_record_ref": result.source_ref.source_record_ref,
        "source_file_name": result.source_ref.source_file_name,
        "source_sheet": result.source_ref.source_sheet,
        "source_row_number": result.source_ref.source_row_number,
    }


def cleaned_output_record(
    result: RecordResult,
    include_lineage: bool,
) -> Dict[str, Any]:
    row = dict(result.cleaned_record)
    if include_lineage:
        row.update({
            "__SOURCE_RECORD_REF": result.source_ref.source_record_ref,
            "__SOURCE_FILE_SHA256": result.source_ref.source_file_sha256,
            "__SOURCE_SHEET": result.source_ref.source_sheet,
            "__SOURCE_ROW_NUMBER": result.source_ref.source_row_number,
            "__CLEANSING_DISPOSITION": result.disposition.value,
            "__CLEANSING_CONFIDENCE": round(result.confidence, 6),
            "__EVIDENCE_REFS": "|".join(sorted(set(result.evidence_refs))),
        })
    return row


def validate_no_raw_identity_in_diagnostics(
    payloads: Iterable[Any],
    raw_identity_values: Set[str],
) -> None:
    """
    Validate that diagnostics do not leak raw direct or pseudonymous identities.

    Exact normalized-text checks protect VTR_ID.
    Long-digit checks protect IC/NRIC-like values even when punctuation changes.
    """
    if not raw_identity_values:
        return

    normalized_text_values = {
        collapse_whitespace(unicodedata.normalize("NFKC", str(value))).upper()
        for value in raw_identity_values
        if not is_nullish(value)
    }
    normalized_digit_values = {
        digits
        for value in raw_identity_values
        for digits in [normalize_identity_digits(value)]
        if digits and len(digits) >= 10
    }

    for payload in payloads:
        text = stable_json(payload)
        normalized_text = collapse_whitespace(
            unicodedata.normalize("NFKC", text)
        ).upper()

        for raw in normalized_text_values:
            if raw and raw in normalized_text:
                raise CleanserError(
                    "Privacy validation failed: raw identity text detected in diagnostics."
                )

        digits_only = re.sub(r"\\D", "", text)
        for raw_digits in normalized_digit_values:
            if raw_digits and raw_digits in digits_only:
                raise CleanserError(
                    "Privacy validation failed: raw identity digits detected in diagnostics."
                )



# ---------------------------------------------------------------------------
# Output writers
# ---------------------------------------------------------------------------

def dataframe_safe(records: List[Dict[str, Any]]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records)


def write_csv_atomic(df: pd.DataFrame, path: Path) -> None:
    ensure_directory(path.parent)
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_csv(tmp, index=False, encoding="utf-8-sig")
    tmp.replace(path)


def write_excel_atomic(sheets: Mapping[str, pd.DataFrame], path: Path) -> None:
    ensure_directory(path.parent)
    tmp = path.with_suffix(".tmp.xlsx")
    with pd.ExcelWriter(tmp, engine="openpyxl") as writer:
        for sheet_name, df in sheets.items():
            safe_name = str(sheet_name)[:31] or "Sheet1"
            df.to_excel(writer, sheet_name=safe_name, index=False)
    tmp.replace(path)


def write_jsonl_atomic(records: Sequence[Mapping[str, Any]], path: Path) -> None:
    lines = "\n".join(
        json.dumps(record, ensure_ascii=False, default=str)
        for record in records
    )
    if lines:
        lines += "\n"
    atomic_write_text(path, lines)


# ---------------------------------------------------------------------------
# Main engine
# ---------------------------------------------------------------------------

class VoterDataCleanser:
    def __init__(
        self,
        contract: OntologyContract,
        config: CleanserConfig,
        hash_salt: bytes,
        hash_salt_source: str,
    ) -> None:
        self.contract = contract
        self.config = config
        self.hash_salt = hash_salt
        self.hash_salt_source = hash_salt_source
        self.record_cleanser = RecordCleanser(contract, config, hash_salt)
        self.metrics = RunMetrics()
        self.run_id = f"CLEANRUN_{uuid.uuid4().hex}"
        self.started_at_utc = utc_now_iso()

    def run(
        self,
        input_path: Union[str, Path],
        output_dir: Union[str, Path],
    ) -> Dict[str, Any]:
        input_path = Path(input_path).resolve()
        output_dir = ensure_directory(Path(output_dir).resolve())

        all_results: List[RecordResult] = []
        schema_reports: List[Dict[str, Any]] = []
        raw_identity_values: Set[str] = set()
        ingestion_ts = utc_now_iso()

        for batch in iter_input_batches(input_path):
            mapping, missing, unknown, collisions = resolve_columns(
                list(batch.dataframe.columns),
                self.contract,
            )
            privacy_removed_columns = detect_privacy_removed_columns(
                list(batch.dataframe.columns),
                self.contract,
            )
            privacy_rows = privacy_violation_rows(
                batch.dataframe,
                privacy_removed_columns,
            )

            schema_report = {
                "source_file": batch.source_path.name,
                "source_sheet": batch.source_sheet,
                "input_column_count": len(batch.dataframe.columns),
                "resolved_column_count": len(mapping),
                "missing_source_fields": missing,
                "unknown_columns": unknown,
                "target_collisions": [
                    {"first": a, "second": b}
                    for a, b in collisions
                ],
                "contract_source_field_count": len(self.contract.source_fields),
                "expected_source_field_count": self.contract.expected_source_field_count,
                "expected_source_field_count_source": self.contract.expected_source_field_count_source,
                "contract_id": self.contract.contract_id,
                "contract_type": self.contract.contract_type,
                "source_identity_field": self.contract.source_identity_field,
                "canonical_identity_field": self.contract.canonical_identity_field,
                "privacy_removed_fields": self.contract.privacy_removed_fields,
                "privacy_removed_columns_reappeared": privacy_removed_columns,
                "privacy_violation_row_count": len(privacy_rows),
                "contract_degraded_mode": self.contract.degraded_mode,
            }
            schema_reports.append(schema_report)

            if self.config.strict_contract:
                if missing:
                    raise StrictModeError(
                        f"Strict contract: missing fields in sheet {batch.source_sheet}: {missing}"
                    )
                if collisions:
                    raise StrictModeError(
                        f"Strict contract: target column collisions in sheet {batch.source_sheet}: {collisions}"
                    )
                if privacy_removed_columns:
                    raise StrictModeError(
                        "Strict contract: privacy-removed fields reappeared in sheet "
                        f"{batch.source_sheet}: {privacy_removed_columns}"
                    )

            remapped = remap_dataframe(
                batch.dataframe,
                mapping,
                self.contract,
                preserve_unknown=self.config.preserve_unknown_columns,
            )

            for zero_based_index, row in remapped.iterrows():
                excel_row_number = int(zero_based_index) + 2
                source_ref = make_source_ref(
                    batch,
                    excel_row_number,
                    ingestion_ts,
                )
                raw_record = {
                    str(k): v for k, v in row.to_dict().items()
                }

                for identity_field in REPORT_SENSITIVE_IDENTITY_FIELDS:
                    if identity_field in raw_record and not is_nullish(raw_record[identity_field]):
                        raw_identity_values.add(str(raw_record[identity_field]))

                # Reappeared privacy-removed values are only retained in-memory
                # for leak detection; they are never copied into canonical output.
                for violating_column in privacy_removed_columns:
                    raw_value = batch.dataframe.at[zero_based_index, violating_column]
                    if not is_nullish(raw_value):
                        raw_identity_values.add(str(raw_value))

                result = self.record_cleanser.cleanse_record(
                    raw_record,
                    source_ref,
                )
                apply_privacy_violation_to_result(
                    result,
                    privacy_rows.get(zero_based_index, []),
                )
                all_results.append(result)

        self.metrics.input_records = len(all_results)

        # Dataset-level analyses
        if self.config.mode in {CleanseMode.STANDARD, CleanseMode.STRICT}:
            self.metrics.exact_duplicate_records = apply_exact_duplicate_analysis(
                all_results,
                self.config,
            )
            source_id_duplicate_groups = apply_source_identity_duplicate_analysis(
                all_results,
                self.contract,
            )
            dup_groups, conflict_groups = apply_identity_duplicate_analysis(
                all_results,
                self.config,
            )
            self.metrics.identity_duplicate_groups = max(
                source_id_duplicate_groups,
                dup_groups,
            )
            hierarchy_conflicts = apply_hierarchy_analysis(
                all_results,
                self.config,
            )
            self.metrics.hierarchy_conflicts = len(hierarchy_conflicts)
        else:
            hierarchy_conflicts = []

        # Re-finalize after dataset-level issues/quarantine.
        for result in all_results:
            self.record_cleanser.finalize_record_disposition(result)

        manifest = self.write_outputs(
            input_path=input_path,
            output_dir=output_dir,
            results=all_results,
            schema_reports=schema_reports,
            hierarchy_conflicts=hierarchy_conflicts,
            raw_identity_values=raw_identity_values,
        )
        return manifest

    def write_outputs(
        self,
        *,
        input_path: Path,
        output_dir: Path,
        results: List[RecordResult],
        schema_reports: List[Dict[str, Any]],
        hierarchy_conflicts: List[Dict[str, Any]],
        raw_identity_values: Set[str],
    ) -> Dict[str, Any]:
        cleaned_results = [
            r for r in results
            if r.disposition in {
                RecordDisposition.CLEAN,
                RecordDisposition.CLEAN_WITH_FLAGS,
            }
        ]
        quarantine_results = [
            r for r in results
            if r.disposition == RecordDisposition.QUARANTINED
        ]
        rejected_results = [
            r for r in results
            if r.disposition == RecordDisposition.REJECTED
        ]

        cleaned_records = [
            cleaned_output_record(r, self.config.include_lineage_columns)
            for r in cleaned_results
        ]
        quarantine_rows = [diagnostics_record(r) for r in quarantine_results]
        rejected_rows = [diagnostics_record(r) for r in rejected_results]
        issue_rows = [
            issue.to_dict()
            for result in results
            for issue in result.issues
        ][: self.config.max_issue_rows]
        change_rows = [
            change.to_dict()
            for result in results
            for change in result.changes
        ][: self.config.max_change_rows]
        record_summary_rows = [r.to_summary() for r in results]

        # Validate privacy of diagnostics before writing.
        validate_no_raw_identity_in_diagnostics(
            [
                quarantine_rows,
                rejected_rows,
                issue_rows,
                change_rows,
                hierarchy_conflicts,
                schema_reports,
                record_summary_rows,
            ],
            raw_identity_values,
        )

        self.metrics.clean_records = sum(
            r.disposition == RecordDisposition.CLEAN for r in results
        )
        self.metrics.clean_with_flags_records = sum(
            r.disposition == RecordDisposition.CLEAN_WITH_FLAGS for r in results
        )
        self.metrics.quarantined_records = len(quarantine_results)
        self.metrics.rejected_records = len(rejected_results)
        self.metrics.total_issues = sum(len(r.issues) for r in results)
        self.metrics.total_changes = sum(len(r.changes) for r in results)
        self.metrics.fields_normalized = sum(
            1
            for r in results
            for c in r.changes
            if c.action in {Action.NORMALIZE.value, Action.CORRECT.value}
        )
        self.metrics.fields_nullified = sum(
            1
            for r in results
            for c in r.changes
            if c.action == Action.NULLIFY.value
        )
        self.metrics.records_with_hash = sum(
            bool(r.cleaned_record.get(CANONICAL_HASH_FIELD))
            for r in results
        )

        files: Dict[str, str] = {}

        if self.config.output_csv:
            cleaned_csv = output_dir / "voter-cleaned.csv"
            write_csv_atomic(dataframe_safe(cleaned_records), cleaned_csv)
            files["cleaned_csv"] = cleaned_csv.name

            quarantine_csv = output_dir / "voter-quarantine.csv"
            write_csv_atomic(dataframe_safe(quarantine_rows), quarantine_csv)
            files["quarantine_csv"] = quarantine_csv.name

            issues_csv = output_dir / "cleansing-issues.csv"
            write_csv_atomic(dataframe_safe(issue_rows), issues_csv)
            files["issues_csv"] = issues_csv.name

            changes_csv = output_dir / "cleansing-change-log.csv"
            write_csv_atomic(dataframe_safe(change_rows), changes_csv)
            files["changes_csv"] = changes_csv.name

            schema_csv = output_dir / "cleansing-schema-report.csv"
            write_csv_atomic(dataframe_safe(schema_reports), schema_csv)
            files["schema_csv"] = schema_csv.name

            hierarchy_csv = output_dir / "cleansing-hierarchy-conflicts.csv"
            write_csv_atomic(dataframe_safe(hierarchy_conflicts), hierarchy_csv)
            files["hierarchy_conflicts_csv"] = hierarchy_csv.name

            rejected_csv = output_dir / "voter-rejected.csv"
            write_csv_atomic(dataframe_safe(rejected_rows), rejected_csv)
            files["rejected_csv"] = rejected_csv.name

        if self.config.output_json:
            cleaned_json = output_dir / "voter-cleaned.json"
            atomic_write_json(cleaned_json, cleaned_records)
            files["cleaned_json"] = cleaned_json.name

            cleaned_jsonl = output_dir / "voter-cleaned.jsonl"
            write_jsonl_atomic(cleaned_records, cleaned_jsonl)
            files["cleaned_jsonl"] = cleaned_jsonl.name

            audit_json = output_dir / "cleansing-audit.json"
            atomic_write_json(
                audit_json,
                {
                    "run_id": self.run_id,
                    "issues": issue_rows,
                    "changes": change_rows,
                    "record_summaries": record_summary_rows,
                    "hierarchy_conflicts": hierarchy_conflicts,
                    "schema_reports": schema_reports,
                },
            )
            files["audit_json"] = audit_json.name

        if self.config.output_excel:
            excel_path = output_dir / "voter-cleansing-output.xlsx"
            write_excel_atomic(
                {
                    "Cleaned": dataframe_safe(cleaned_records),
                    "Quarantine": dataframe_safe(quarantine_rows),
                    "Rejected": dataframe_safe(rejected_rows),
                    "Issues": dataframe_safe(issue_rows),
                    "Changes": dataframe_safe(change_rows),
                    "Schema": dataframe_safe(schema_reports),
                    "Hierarchy": dataframe_safe(hierarchy_conflicts),
                    "Record Summary": dataframe_safe(record_summary_rows),
                },
                excel_path,
            )
            files["excel_workbook"] = excel_path.name

        completed_at = utc_now_iso()
        manifest = {
            "artifact": ARTIFACT_NAME,
            "artifact_version": ARTIFACT_VERSION,
            "pipeline_stage": PIPELINE_STAGE,
            "run_id": self.run_id,
            "started_at_utc": self.started_at_utc,
            "completed_at_utc": completed_at,
            "input": {
                "path": str(input_path),
                "file_name": input_path.name,
                "sha256": sha256_file(input_path),
            },
            "contract": {
                "ontology_path": self.contract.ontology_path,
                "ontology_sha256": self.contract.ontology_sha256,
                "ontology_version": self.contract.ontology_version,
                "degraded_mode": self.contract.degraded_mode,
                "contract_id": self.contract.contract_id,
                "contract_type": self.contract.contract_type,
                "source_field_count": len(self.contract.source_fields),
                "expected_source_field_count": self.contract.expected_source_field_count,
                "expected_source_field_count_source": self.contract.expected_source_field_count_source,
                "canonical_hash_field": self.contract.canonical_hash_field,
                "source_identity_field": self.contract.source_identity_field,
                "masked_label_field": self.contract.masked_label_field,
                "canonical_identity_field": self.contract.canonical_identity_field,
                "identity_derivation": self.contract.identity_derivation,
                "privacy_removed_fields": self.contract.privacy_removed_fields,
            },
            "configuration": {
                "mode": self.config.mode.value,
                "strict_contract": self.config.strict_contract,
                "preserve_unknown_columns": self.config.preserve_unknown_columns,
                "include_lineage_columns": self.config.include_lineage_columns,
                "quarantine_on_required_missing": self.config.quarantine_on_required_missing,
                "quarantine_on_hierarchy_conflict": self.config.quarantine_on_hierarchy_conflict,
                "quarantine_on_identity_conflict": self.config.quarantine_on_identity_conflict,
                "dedupe_exact_records": self.config.dedupe_exact_records,
                "hash_salt_source": self.hash_salt_source,
            },
            "metrics": self.metrics.to_dict(),
            "outputs": files,
            "privacy": {
                "raw_identity_in_diagnostics": False,
                "raw_ic_used_as_graph_id": False,
                "graph_identity_field": CANONICAL_HASH_FIELD,
                "diagnostic_sensitive_values_tokenized": True,
            },
            "compatibility": {
                "transformer": "pip-voter-intelligence-transformer-v1.0.js",
                "pipeline": "pip-voter-intelligence-pipeline-v1.1.js",
                "source_contract_adapter": "pip-voter-source-contract-adapter-p134-v1.0.js",
                "network_graph_ready": True,
                "digital_brain_lineage_ready": True,
                "s2d360_lineage_ready": True,
            },
        }

        manifest_path = output_dir / "cleansing-manifest.json"
        atomic_write_json(manifest_path, manifest)
        manifest["outputs"]["manifest"] = manifest_path.name

        # Re-write to include self-reference.
        atomic_write_json(manifest_path, manifest)

        return manifest


# ---------------------------------------------------------------------------
# Self-checks
# ---------------------------------------------------------------------------

def self_check() -> Dict[str, Any]:
    checks: List[Dict[str, Any]] = []

    def add(name: str, passed: bool, detail: Any = "") -> None:
        checks.append({
            "name": name,
            "passed": bool(passed),
            "detail": detail,
        })

    add(
        "legacy_fallback_field_count",
        len(FALLBACK_KNOWN_SOURCE_FIELDS) == LEGACY_EXPECTED_SOURCE_FIELD_COUNT,
        f"count={len(FALLBACK_KNOWN_SOURCE_FIELDS)}",
    )

    ic_a = normalize_identity_digits("900101-01-1234")
    ic_b = normalize_identity_digits("900101011234.0")
    add("legacy_identity_normalization", ic_a == ic_b == "900101011234")

    phone, status = normalize_phone("012-345 6789")
    add("phone_normalization", phone == "+60123456789", f"{phone}/{status}")

    postcode, pstatus = normalize_postcode("43000.0")
    add("postcode_normalization", postcode == "43000", f"{postcode}/{pstatus}")

    age, astatus = normalize_age("56 tahun")
    add("age_parsing", age == 56, f"{age}/{astatus}")

    salt = b"0123456789abcdef0123456789abcdef"

    rec1 = {"IC": "900101-01-1234"}
    rec2 = {"IC": "900101011234"}
    h1 = canonical_voter_hash(rec1, salt)
    h2 = canonical_voter_hash(rec2, salt)
    add("legacy_canonical_hash_consistency", h1 == h2 and h1 is not None)

    p134_a = p134_voter_hash_from_vtr_id("VTR_P134.00001", salt)
    p134_b = p134_voter_hash_from_vtr_id(" vtr_p134.00001 ", salt)
    add(
        "p134_vtr_id_hash_consistency",
        p134_a == p134_b and bool(p134_a and p134_a.startswith("VOTER_")),
        p134_a,
    )
    add(
        "p134_hash_length",
        bool(p134_a and len(p134_a) == len("VOTER_") + 40),
        len(p134_a) if p134_a else None,
    )

    geography = derive_geography_fields({
        "LOKALITI": "001.KG BKT BATU PUTEH",
        "DM": "01.TANJUNG DAHAN",
        "DUN": "01.KUALA LINGGI",
        "PARLIMEN": "134.MASJID TANAH",
        "NEGERI": "12.MELAKA",
    })
    add(
        "geography_derivation",
        geography.get("DUN_CODE") == "01"
        and geography.get("DUN_NAME") == "KUALA LINGGI"
        and geography.get("PARLIMEN_CODE") == "134"
        and geography.get("NEGERI_NAME") == "MELAKA",
        geography,
    )

    synthetic_contract_raw = {
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
            "canonical_identity_derivation": {"algorithm": "HMAC-SHA256"},
        },
        "privacy_model": {
            "privacy_removed_fields": [
                {"field_name": "IC"},
                {"field_name": "NAMA"},
            ],
        },
        "schema": {
            "field_mappings": [
                {
                    "source_field": field_name,
                    "canonical_field": field_name,
                    **(
                        {"pattern": r"^VTR_P134\\.\\d{5,}$"}
                        if field_name == "VTR_ID"
                        else {}
                    ),
                }
                for field_name in (
                    ["VTR_ID", "VTR_LABEL"]
                    + [f"FIELD_{i:02d}" for i in range(3, 42)]
                )
            ],
        },
        "derived_fields": [
            {"derived_field": "VOTER_ID_HASH"},
        ],
    }
    field_contracts = {
        fc.source_field: fc
        for fc in extract_field_contracts(synthetic_contract_raw)
    }
    expected, expected_source = resolve_expected_source_field_count(
        synthetic_contract_raw,
        discovered_count=len(field_contracts),
    )
    model = extract_identity_model(synthetic_contract_raw)
    contract = OntologyContract(
        source_fields=list(field_contracts.keys()),
        field_contracts=field_contracts,
        raw_contract=synthetic_contract_raw,
        expected_source_field_count=expected,
        expected_source_field_count_source=expected_source,
        contract_id=synthetic_contract_raw["contract_id"],
        contract_type=synthetic_contract_raw["contract_type"],
        privacy_removed_fields=extract_privacy_removed_fields(synthetic_contract_raw),
        source_identity_field=model["source_identity_field"],
        masked_label_field=model["masked_label_field"],
        canonical_identity_field=model["canonical_identity_field"],
        identity_derivation=model["identity_derivation"],
    )
    try:
        contract.validate(strict=True)
        p134_contract_valid = True
        p134_contract_error = None
    except Exception as exc:
        p134_contract_valid = False
        p134_contract_error = str(exc)

    add(
        "contract_driven_41_field_validation",
        p134_contract_valid and expected == 41,
        {
            "expected": expected,
            "source": expected_source,
            "error": p134_contract_error,
        },
    )
    add(
        "privacy_removed_fields_extracted",
        set(contract.privacy_removed_fields) == {"IC", "NAMA"},
        contract.privacy_removed_fields,
    )
    add(
        "source_identity_field_extracted",
        contract.source_identity_field == "VTR_ID",
        contract.source_identity_field,
    )

    passed = all(x["passed"] for x in checks)
    return {
        "artifact": ARTIFACT_NAME,
        "version": ARTIFACT_VERSION,
        "passed": passed,
        "checks": checks,
    }



# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=ARTIFACT_NAME,
        description=(
            "Contract-driven PIP voter data cleanser with privacy-safe identity "
            "handling, audit lineage and quarantine workflow."
        ),
    )
    parser.add_argument(
        "input",
        nargs="?",
        help="Input voter dataset (.xlsx/.xls/.xlsm/.csv/.tsv/.txt/.json/.jsonl/.ndjson).",
    )
    parser.add_argument(
        "--ontology",
        "--contract",
        dest="ontology",
        help=(
            f"Path to ontology or source contract JSON, for example "
            f"{DEFAULT_ONTOLOGY_FILENAME} or pip-voter-source-contract-p134-v1.0.json."
        ),
    )
    parser.add_argument(
        "--output-dir",
        default="./clean-output",
        help="Output directory. Default: ./clean-output",
    )
    parser.add_argument(
        "--mode",
        choices=[m.value for m in CleanseMode],
        default=CleanseMode.STANDARD.value,
        help="Cleansing mode: safe, standard or strict.",
    )
    parser.add_argument(
        "--strict-contract",
        action="store_true",
        help=(
            "Require a contract and enforce its own expected physical source-field "
            "count plus canonical identity declaration."
        ),
    )
    parser.add_argument(
        "--expected-source-field-count",
        type=int,
        default=None,
        help=(
            "Optional explicit override. When omitted, v1.1 resolves the expected "
            "count from contract metadata; legacy fallback is 47."
        ),
    )
    parser.add_argument(
        "--preserve-unknown-columns",
        action="store_true",
        help="Preserve unmapped input columns in canonical staging output.",
    )
    parser.add_argument(
        "--no-lineage-columns",
        action="store_true",
        help="Do not append __SOURCE_* lineage columns to cleaned records.",
    )
    parser.add_argument(
        "--no-csv",
        action="store_true",
        help="Disable CSV outputs.",
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Disable JSON/JSONL outputs.",
    )
    parser.add_argument(
        "--no-excel",
        action="store_true",
        help="Disable Excel workbook output.",
    )
    parser.add_argument(
        "--hash-salt",
        help=(
            "Explicit HMAC salt. Prefer environment PIP_VOTER_HASH_SALT or "
            "--hash-salt-file in production."
        ),
    )
    parser.add_argument(
        "--hash-salt-file",
        help="Path to file containing stable HMAC salt.",
    )
    parser.add_argument(
        "--allow-ephemeral-hash-salt",
        action="store_true",
        help="Allow random per-run salt for non-production testing only.",
    )
    parser.add_argument(
        "--dedupe-exact-records",
        action="store_true",
        help=(
            "Mark later exact duplicates as suppressed/quarantined. "
            "Default behavior is flag-only."
        ),
    )
    parser.add_argument(
        "--allow-hierarchy-conflicts",
        action="store_true",
        help="Flag hierarchy conflicts without quarantine.",
    )
    parser.add_argument(
        "--allow-identity-conflicts",
        action="store_true",
        help="Flag repeated identity conflicts without quarantine.",
    )
    parser.add_argument(
        "--reject-no-identity",
        action="store_true",
        help="Reject records for which VOTER_ID_HASH cannot be derived.",
    )
    parser.add_argument(
        "--self-check",
        action="store_true",
        help="Run built-in deterministic self-checks and exit.",
    )
    return parser


def config_from_args(args: argparse.Namespace) -> CleanserConfig:
    return CleanserConfig(
        mode=CleanseMode(args.mode),
        strict_contract=bool(args.strict_contract),
        expected_source_field_count=args.expected_source_field_count,
        preserve_unknown_columns=bool(args.preserve_unknown_columns),
        include_lineage_columns=not bool(args.no_lineage_columns),
        output_csv=not bool(args.no_csv),
        output_json=not bool(args.no_json),
        output_excel=not bool(args.no_excel),
        allow_ephemeral_hash_salt=bool(args.allow_ephemeral_hash_salt),
        quarantine_on_hierarchy_conflict=not bool(args.allow_hierarchy_conflicts),
        quarantine_on_identity_conflict=not bool(args.allow_identity_conflicts),
        reject_on_no_identity=bool(args.reject_no_identity),
        dedupe_exact_records=bool(args.dedupe_exact_records),
    )


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    if (
        args.expected_source_field_count is not None
        and args.expected_source_field_count <= 0
    ):
        parser.error("--expected-source-field-count must be greater than zero")

    if args.self_check:
        report = self_check()
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0 if report["passed"] else 2

    if not args.input:
        parser.error("input is required unless --self-check is used.")

    input_path = Path(args.input).resolve()
    config = config_from_args(args)

    try:
        contract = load_ontology_contract(
            args.ontology,
            strict=config.strict_contract,
            search_dir=input_path.parent,
            expected_source_field_count=config.expected_source_field_count,
        )
        salt, salt_source = resolve_hash_salt(
            explicit_salt=args.hash_salt,
            salt_file=args.hash_salt_file,
            allow_ephemeral=config.allow_ephemeral_hash_salt,
        )

        cleanser = VoterDataCleanser(
            contract=contract,
            config=config,
            hash_salt=salt,
            hash_salt_source=salt_source,
        )
        manifest = cleanser.run(
            input_path=input_path,
            output_dir=args.output_dir,
        )

        print(json.dumps({
            "status": "SUCCESS",
            "run_id": manifest["run_id"],
            "mode": manifest["configuration"]["mode"],
            "input_records": manifest["metrics"]["input_records"],
            "clean_records": manifest["metrics"]["clean_records"],
            "clean_with_flags_records": manifest["metrics"]["clean_with_flags_records"],
            "quarantined_records": manifest["metrics"]["quarantined_records"],
            "rejected_records": manifest["metrics"]["rejected_records"],
            "output_dir": str(Path(args.output_dir).resolve()),
            "manifest": manifest["outputs"]["manifest"],
        }, indent=2, ensure_ascii=False))
        return 0

    except (CleanserError, ContractError, InputFormatError, SecurityConfigurationError) as exc:
        print(json.dumps({
            "status": "ERROR",
            "error_type": type(exc).__name__,
            "message": str(exc),
        }, indent=2, ensure_ascii=False), file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print(json.dumps({
            "status": "CANCELLED",
            "message": "Operation interrupted by user.",
        }, indent=2), file=sys.stderr)
        return 130
    except Exception as exc:  # pragma: no cover
        print(json.dumps({
            "status": "ERROR",
            "error_type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }, indent=2, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
