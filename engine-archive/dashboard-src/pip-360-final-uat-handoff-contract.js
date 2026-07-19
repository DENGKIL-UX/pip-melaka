export const PIP_360_FINAL_UAT_CONTRACT_SCHEMA =
	"pip.360.final-uat-handoff.contract.v1";
export const PIP_360_FINAL_UAT_CHECK_SCHEMA =
	"pip.360.final-uat-handoff.check.v1";
export const PIP_360_FINAL_UAT_DOMAIN_SCHEMA =
	"pip.360.final-uat-handoff.domain.v1";
export const PIP_360_FINAL_UAT_SIGNOFF_SCHEMA =
	"pip.360.final-uat-handoff.signoff.v1";
export const PIP_360_FINAL_UAT_RISK_SCHEMA =
	"pip.360.final-uat-handoff.risk.v1";
export const PIP_360_FINAL_UAT_LIMITATION_SCHEMA =
	"pip.360.final-uat-handoff.limitation.v1";
export const PIP_360_FINAL_UAT_RUNBOOK_SECTION_SCHEMA =
	"pip.360.final-uat-handoff.runbook-section.v1";
export const PIP_360_FINAL_UAT_HANDOFF_PACKAGE_SCHEMA =
	"pip.360.final-uat-handoff.package.v1";
export const PIP_360_FINAL_UAT_COLLECTION_SCHEMA =
	"pip.360.final-uat-handoff.collection.v1";
export const PIP_360_FINAL_UAT_EXPORT_SCHEMA =
	"pip.360.final-uat-handoff.export.v1";

export const PIP_360_FINAL_UAT_DOMAINS = Object.freeze({
	PROTECTED_BASELINE_INTEGRITY: "PROTECTED_BASELINE_INTEGRITY",
	BUILD_AND_MODULE_INTEGRITY: "BUILD_AND_MODULE_INTEGRITY",
	STATIC_VALIDATION_ACCEPTANCE: "STATIC_VALIDATION_ACCEPTANCE",
	RUNTIME_VALIDATION_ACCEPTANCE: "RUNTIME_VALIDATION_ACCEPTANCE",
	AUTHENTICATED_BROWSER_ACCEPTANCE: "AUTHENTICATED_BROWSER_ACCEPTANCE",
	FULL_PIPELINE_ACCEPTANCE: "FULL_PIPELINE_ACCEPTANCE",
	FULL_PIPELINE_RECONCILIATION: "FULL_PIPELINE_RECONCILIATION",
	AUTHENTICATION_AND_AUTHORIZATION: "AUTHENTICATION_AND_AUTHORIZATION",
	AUDIT_AND_OPERATIONAL_GOVERNANCE: "AUDIT_AND_OPERATIONAL_GOVERNANCE",
	DATA_QUALITY_AND_COUNT_RECONCILIATION: "DATA_QUALITY_AND_COUNT_RECONCILIATION",
	PRIVACY_AND_FIXTURE_ISOLATION: "PRIVACY_AND_FIXTURE_ISOLATION",
	HUMAN_REVIEW_AND_PUBLICATION_BOUNDARY: "HUMAN_REVIEW_AND_PUBLICATION_BOUNDARY",
	PERFORMANCE_AND_PAYLOAD_EVIDENCE: "PERFORMANCE_AND_PAYLOAD_EVIDENCE",
	INCIDENT_AND_RECOVERY_READINESS: "INCIDENT_AND_RECOVERY_READINESS",
	OPERATOR_RUNBOOK_READINESS: "OPERATOR_RUNBOOK_READINESS",
	KNOWN_LIMITATIONS_AND_RESIDUAL_RISK: "KNOWN_LIMITATIONS_AND_RESIDUAL_RISK",
	CONTROLLED_PILOT_SIGNOFF: "CONTROLLED_PILOT_SIGNOFF",
	PRODUCTION_ACTIVATION_BOUNDARY: "PRODUCTION_ACTIVATION_BOUNDARY",
});

export const PIP_360_FINAL_UAT_DOMAIN_ORDER = Object.freeze([
	PIP_360_FINAL_UAT_DOMAINS.PROTECTED_BASELINE_INTEGRITY,
	PIP_360_FINAL_UAT_DOMAINS.BUILD_AND_MODULE_INTEGRITY,
	PIP_360_FINAL_UAT_DOMAINS.STATIC_VALIDATION_ACCEPTANCE,
	PIP_360_FINAL_UAT_DOMAINS.RUNTIME_VALIDATION_ACCEPTANCE,
	PIP_360_FINAL_UAT_DOMAINS.AUTHENTICATED_BROWSER_ACCEPTANCE,
	PIP_360_FINAL_UAT_DOMAINS.FULL_PIPELINE_ACCEPTANCE,
	PIP_360_FINAL_UAT_DOMAINS.FULL_PIPELINE_RECONCILIATION,
	PIP_360_FINAL_UAT_DOMAINS.AUTHENTICATION_AND_AUTHORIZATION,
	PIP_360_FINAL_UAT_DOMAINS.AUDIT_AND_OPERATIONAL_GOVERNANCE,
	PIP_360_FINAL_UAT_DOMAINS.DATA_QUALITY_AND_COUNT_RECONCILIATION,
	PIP_360_FINAL_UAT_DOMAINS.PRIVACY_AND_FIXTURE_ISOLATION,
	PIP_360_FINAL_UAT_DOMAINS.HUMAN_REVIEW_AND_PUBLICATION_BOUNDARY,
	PIP_360_FINAL_UAT_DOMAINS.PERFORMANCE_AND_PAYLOAD_EVIDENCE,
	PIP_360_FINAL_UAT_DOMAINS.INCIDENT_AND_RECOVERY_READINESS,
	PIP_360_FINAL_UAT_DOMAINS.OPERATOR_RUNBOOK_READINESS,
	PIP_360_FINAL_UAT_DOMAINS.KNOWN_LIMITATIONS_AND_RESIDUAL_RISK,
	PIP_360_FINAL_UAT_DOMAINS.CONTROLLED_PILOT_SIGNOFF,
	PIP_360_FINAL_UAT_DOMAINS.PRODUCTION_ACTIVATION_BOUNDARY,
]);

export const PIP_360_FINAL_UAT_CHECK_STATUSES = Object.freeze({
	PASSED: "PASSED",
	FAILED: "FAILED",
	BLOCKED: "BLOCKED",
	REVIEW_REQUIRED: "REVIEW_REQUIRED",
	WAIVED: "WAIVED",
	NOT_APPLICABLE: "NOT_APPLICABLE",
});

export const PIP_360_FINAL_UAT_DECISIONS = Object.freeze({
	ACCEPTED_FOR_CONTROLLED_PILOT: "ACCEPTED_FOR_CONTROLLED_PILOT",
	ACCEPTED_WITH_LIMITATIONS: "ACCEPTED_WITH_LIMITATIONS",
	REJECTED: "REJECTED",
	BLOCKED: "BLOCKED",
});

export const PIP_360_FINAL_UAT_HANDOFF_STATUSES = Object.freeze({
	READY: "READY",
	READY_WITH_LIMITATIONS: "READY_WITH_LIMITATIONS",
	NOT_READY: "NOT_READY",
	BLOCKED: "BLOCKED",
});

export const PIP_360_FINAL_UAT_SIGNOFF_STATUSES = Object.freeze({
	APPROVED: "APPROVED",
	REJECTED: "REJECTED",
	PENDING: "PENDING",
	NOT_REQUIRED: "NOT_REQUIRED",
});

export const PIP_360_FINAL_UAT_RISK_SEVERITIES = Object.freeze({
	INFO: "INFO",
	LOW: "LOW",
	MEDIUM: "MEDIUM",
	HIGH: "HIGH",
	CRITICAL: "CRITICAL",
});

export const PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS = Object.freeze({
	VALIDATION_FIXTURE_ONLY: "VALIDATION_FIXTURE_ONLY",
	EXTERNAL_SERVICE_DISABLED: "EXTERNAL_SERVICE_DISABLED",
	PRODUCTION_DATABASE_UNBOUND: "PRODUCTION_DATABASE_UNBOUND",
	SECRET_PROVIDER_UNCONFIGURED: "SECRET_PROVIDER_UNCONFIGURED",
	PRODUCTION_CUTOVER_DISABLED: "PRODUCTION_CUTOVER_DISABLED",
	AUTOMATIC_SYNCHRONISATION_DISABLED: "AUTOMATIC_SYNCHRONISATION_DISABLED",
	MANUAL_PUBLICATION_ONLY: "MANUAL_PUBLICATION_ONLY",
	HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
	LIVE_ANALYTICS_DISABLED: "LIVE_ANALYTICS_DISABLED",
	LEGACY_BROWSER_STORAGE_AUTHORITATIVE: "LEGACY_BROWSER_STORAGE_AUTHORITATIVE",
	P999_NON_PRODUCTION_ONLY: "P999_NON_PRODUCTION_ONLY",
	NO_TARGETING_OR_PERSUASION: "NO_TARGETING_OR_PERSUASION",
	OTHER: "OTHER",
});

export const PIP_360_FINAL_UAT_TEST_MODES = Object.freeze({
	BASELINE_ACCEPTED: "BASELINE_ACCEPTED",
	PROTECTED_BASELINE_DRIFT: "PROTECTED_BASELINE_DRIFT",
	VALIDATOR_EVIDENCE_INCOMPLETE: "VALIDATOR_EVIDENCE_INCOMPLETE",
	RECONCILIATION_NOT_READY: "RECONCILIATION_NOT_READY",
	SIGNOFF_INCOMPLETE: "SIGNOFF_INCOMPLETE",
	PROHIBITED_CAPABILITY_ENABLED: "PROHIBITED_CAPABILITY_ENABLED",
});

export const PIP_360_FINAL_UAT_REASON_CODES = Object.freeze({
	MISSING_REQUIRED_EVIDENCE: "MISSING_REQUIRED_EVIDENCE",
	PROTECTED_BASELINE_MISMATCH: "PROTECTED_BASELINE_MISMATCH",
	VALIDATOR_RECEIPT_MISSING: "VALIDATOR_RECEIPT_MISSING",
	BATCH66B_NOT_RECONCILED: "BATCH66B_NOT_RECONCILED",
	SIGNOFF_INCOMPLETE: "SIGNOFF_INCOMPLETE",
	PROHIBITED_CAPABILITY_ENABLED: "PROHIBITED_CAPABILITY_ENABLED",
	UNRESOLVED_CRITICAL_RISK: "UNRESOLVED_CRITICAL_RISK",
	UNRESOLVED_HIGH_RISK: "UNRESOLVED_HIGH_RISK",
	PRODUCTION_BOUNDARY_VIOLATION: "PRODUCTION_BOUNDARY_VIOLATION",
	PRIVACY_BOUNDARY_VIOLATION: "PRIVACY_BOUNDARY_VIOLATION",
	FIXTURE_LEAKAGE: "FIXTURE_LEAKAGE",
	SANITIZATION_REQUIRED: "SANITIZATION_REQUIRED",
});

export const PIP_360_FINAL_UAT_SIGNOFF_ROLES = Object.freeze({
	PRODUCT_OWNER: "PRODUCT_OWNER",
	TECHNICAL_OWNER: "TECHNICAL_OWNER",
	SECURITY_REVIEWER: "SECURITY_REVIEWER",
	DATA_GOVERNANCE_REVIEWER: "DATA_GOVERNANCE_REVIEWER",
	OPERATIONS_OWNER: "OPERATIONS_OWNER",
});

const PIP_360_FINAL_UAT_MANIFEST_SUMMARY = Object.freeze({
	final_uat_enabled: true,
	controlled_pilot_acceptance_enabled: true,
	production_activation_enabled: false,
	production_activation_blocked_by_default: true,
	production_activation_requires_separate_external_authorization: true,
	batch66a_dependency_required: true,
	batch66b_dependency_required: true,
	batch66b_reconciled_status_required: true,
	protected_baseline_verification_required: true,
	protected_snapshot_immutability_required: true,
	full_validator_chain_required: true,
	authenticated_browser_acceptance_required: true,
	explicit_browser_acceptance_receipt_required: true,
	explicit_validator_receipts_required: true,
	explicit_reconciliation_receipt_required: true,
	explicit_signoff_receipts_required: true,
	explicit_risk_register_required: true,
	explicit_known_limitations_required: true,
	explicit_operator_runbook_required: true,
	explicit_recovery_runbook_required: true,
	explicit_incident_escalation_required: true,
	explicit_handoff_timestamp_required: true,
	deterministic_check_identifiers_required: true,
	deterministic_package_fingerprint_required: true,
	human_signoff_required: true,
	minimum_required_signoff_roles: 5,
	separation_of_duties_required: true,
	opaque_signoff_aliases_only: true,
	raw_personal_names_prohibited: true,
	raw_email_addresses_prohibited: true,
	signoff_auto_approval_enabled: false,
	signoff_auto_generation_enabled: false,
	waiver_requires_reason: true,
	high_risk_waiver_enabled: false,
	critical_risk_waiver_enabled: false,
	unresolved_critical_risk_blocks_acceptance: true,
	unresolved_high_risk_blocks_unqualified_acceptance: true,
	accepted_with_limitations_requires_explicit_limitations: true,
	controlled_pilot_scope_required: true,
	controlled_pilot_exit_criteria_required: true,
	controlled_pilot_rollback_criteria_required: true,
	production_database_binding_required_for_production: true,
	secret_provider_binding_required_for_production: true,
	production_change_package_required_for_production: true,
	independent_go_no_go_required_for_production: true,
	production_activation_permit_required_for_production: true,
	controlled_pilot_acceptance_does_not_authorize_production: true,
	handoff_package_read_only: true,
	handoff_package_sanitized: true,
	handoff_package_export_enabled: true,
	handoff_package_persistence_enabled: false,
	central_audit_append_performed: false,
	browser_storage_modified: false,
	central_repository_modified: false,
	production_records_modified: false,
	external_network_access_enabled: false,
	live_apify_execution_enabled: false,
	live_s2d_execution_enabled: false,
	social_platform_api_enabled: false,
	platform_authentication_enabled: false,
	automated_ingestion_enabled: false,
	automated_approval_enabled: false,
	automated_publication_enabled: false,
	publication_scheduling_enabled: false,
	production_response_case_generation_enabled: false,
	production_content_generation_enabled: false,
	production_analytics_ingestion_enabled: false,
	database_driver_invoked: false,
	database_adapter_invoked: false,
	connection_probe_invoked: false,
	dns_resolution_invoked: false,
	outbound_network_invoked: false,
	sql_execution_invoked: false,
	ddl_execution_invoked: false,
	schema_creation_invoked: false,
	migration_invoked: false,
	repository_cutover_enabled: false,
	operational_read_cutover_enabled: false,
	operational_write_cutover_enabled: false,
	automatic_synchronisation_enabled: false,
	automatic_remediation_enabled: false,
	automatic_recovery_enabled: false,
	automatic_restart_enabled: false,
	shell_execution_enabled: false,
	child_process_execution_enabled: false,
	environment_file_write_enabled: false,
	credential_values_excluded: true,
	secret_values_excluded: true,
	secret_reference_values_excluded: true,
	connection_values_excluded: true,
	environment_values_excluded: true,
	infrastructure_values_excluded: true,
	user_identity_values_excluded: true,
	request_content_excluded: true,
	raw_errors_excluded: true,
	raw_public_content_excluded: true,
	public_account_identity_excluded: true,
	personal_data_excluded: true,
	voter_records_excluded: true,
	voter_identifiers_excluded: true,
	demographic_profiles_excluded: true,
	political_affiliation_inference_enabled: false,
	voter_preference_inference_enabled: false,
	election_prediction_enabled: false,
	individual_targeting_enabled: false,
	demographic_targeting_enabled: false,
	voter_targeting_enabled: false,
	locality_persuasion_ranking_enabled: false,
	individual_persuasion_optimisation_enabled: false,
	political_persuasion_optimisation_enabled: false,
	engagement_optimisation_enabled: false,
	causal_attribution_enabled: false,
	validation_fixture_separated: true,
	p999_fixture_separated: true,
	production_totals_exclude_validation_fixtures: true,
});

function isPlainObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
	return Array.isArray(value) ? value : [];
}

function stableStringify(value, seen = new Set(), depth = 0) {
	if (depth > 8) return '"[DepthLimit]"';
	if (value === null || value === undefined) return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableStringify(entry, seen, depth + 1)).join(",")}]`;
	}
	if (typeof value !== "object") return JSON.stringify(value);
	if (seen.has(value)) return '"[Circular]"';
	seen.add(value);
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen, depth + 1)}`)
		.join(",")}}`;
}

function deterministicHash(value) {
	const text = stableStringify(value);
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return `fp-${(hash >>> 0).toString(16).padStart(8, "0")}${text.length
		.toString(16)
		.padStart(8, "0")}`;
}

function envelope(valid, checks, errors, normalized) {
	return {
		valid,
		checks,
		errors,
		normalized,
		summary: {
			passed_checks: Object.values(checks).filter(Boolean).length,
			total_checks: Object.keys(checks).length,
			error_count: errors.length,
		},
	};
}

function containsProhibitedIdentity(value) {
	const text = String(value ?? "").trim();
	if (!text) return false;
	if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text)) return true;
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true;
	return false;
}

function sanitizeRecord(value, seen = new Set(), depth = 0) {
	if (depth > 8) return "[DepthLimit]";
	if (value === null || value === undefined) return value;
	if (typeof value === "string") {
		return value
			.replace(/bearer\s+[a-z0-9._-]+/gi, "[REDACTED_TOKEN]")
			.replace(/cookie\s*[:=]\s*[^;\n]+/gi, "cookie=[REDACTED]")
			.replace(/csrf[_-]?token\s*[:=]\s*[^;\n]+/gi, "csrf_token=[REDACTED]")
			.replace(/password\s*[:=]\s*[^;\n]+/gi, "password=[REDACTED]")
			.replace(/(api[_-]?key|secret|token)\s*[:=]\s*[^;\n]+/gi, "$1=[REDACTED]");
	}
	if (typeof value !== "object") return value;
	if (seen.has(value)) return "[Circular]";
	seen.add(value);

	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeRecord(entry, seen, depth + 1));
	}

	const forbiddenKeyPattern =
		/(password|secret|token|cookie|csrf|authorization|credential|email|phone|address|username|user_name|account_handle|voter_identifier|connection_string|signature)/i;
	const output = {};
	Object.keys(value).forEach((key) => {
		if (forbiddenKeyPattern.test(key)) return;
		output[key] = sanitizeRecord(value[key], seen, depth + 1);
	});
	return output;
}

function validateSchemaAndArrays(record = {}) {
	const checks = {
		schema: record.schema === PIP_360_FINAL_UAT_CONTRACT_SCHEMA,
		check_schema: record.check_schema === PIP_360_FINAL_UAT_CHECK_SCHEMA,
		domain_schema: record.domain_schema === PIP_360_FINAL_UAT_DOMAIN_SCHEMA,
		signoff_schema: record.signoff_schema === PIP_360_FINAL_UAT_SIGNOFF_SCHEMA,
		risk_schema: record.risk_schema === PIP_360_FINAL_UAT_RISK_SCHEMA,
		limitation_schema: record.limitation_schema === PIP_360_FINAL_UAT_LIMITATION_SCHEMA,
		runbook_section_schema:
			record.runbook_section_schema === PIP_360_FINAL_UAT_RUNBOOK_SECTION_SCHEMA,
		handoff_package_schema:
			record.handoff_package_schema === PIP_360_FINAL_UAT_HANDOFF_PACKAGE_SCHEMA,
		collection_schema: record.collection_schema === PIP_360_FINAL_UAT_COLLECTION_SCHEMA,
		export_schema: record.export_schema === PIP_360_FINAL_UAT_EXPORT_SCHEMA,
		domain_count: Object.values(record.domains ?? {}).length === 18,
		domain_order:
			JSON.stringify(toArray(record.domain_order)) ===
			JSON.stringify(PIP_360_FINAL_UAT_DOMAIN_ORDER),
		check_statuses:
			JSON.stringify(Object.values(record.check_statuses ?? {}).sort()) ===
			JSON.stringify(Object.values(PIP_360_FINAL_UAT_CHECK_STATUSES).sort()),
		decisions:
			JSON.stringify(Object.values(record.decisions ?? {}).sort()) ===
			JSON.stringify(Object.values(PIP_360_FINAL_UAT_DECISIONS).sort()),
		handoff_statuses:
			JSON.stringify(Object.values(record.handoff_statuses ?? {}).sort()) ===
			JSON.stringify(Object.values(PIP_360_FINAL_UAT_HANDOFF_STATUSES).sort()),
		signoff_statuses:
			JSON.stringify(Object.values(record.signoff_statuses ?? {}).sort()) ===
			JSON.stringify(Object.values(PIP_360_FINAL_UAT_SIGNOFF_STATUSES).sort()),
		risk_severities:
			JSON.stringify(Object.values(record.risk_severities ?? {}).sort()) ===
			JSON.stringify(Object.values(PIP_360_FINAL_UAT_RISK_SEVERITIES).sort()),
		limitation_classifications:
			JSON.stringify(Object.values(record.limitation_classifications ?? {}).sort()) ===
			JSON.stringify(
				Object.values(PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS).sort()
			),
		test_modes:
			JSON.stringify(Object.values(record.test_modes ?? {}).sort()) ===
			JSON.stringify(Object.values(PIP_360_FINAL_UAT_TEST_MODES).sort()),
	};
	return checks;
}

function validateSummary(summary = {}) {
	const checks = {};
	Object.keys(PIP_360_FINAL_UAT_MANIFEST_SUMMARY).forEach((key) => {
		checks[`summary_${key}`] = summary[key] === PIP_360_FINAL_UAT_MANIFEST_SUMMARY[key];
	});
	return checks;
}

export function buildPip360FinalUatHandoffContractManifest({ generatedAt } = {}) {
	return {
		schema: PIP_360_FINAL_UAT_CONTRACT_SCHEMA,
		generated_at: String(generatedAt ?? "2027-01-04T10:00:00.000Z"),
		check_schema: PIP_360_FINAL_UAT_CHECK_SCHEMA,
		domain_schema: PIP_360_FINAL_UAT_DOMAIN_SCHEMA,
		signoff_schema: PIP_360_FINAL_UAT_SIGNOFF_SCHEMA,
		risk_schema: PIP_360_FINAL_UAT_RISK_SCHEMA,
		limitation_schema: PIP_360_FINAL_UAT_LIMITATION_SCHEMA,
		runbook_section_schema: PIP_360_FINAL_UAT_RUNBOOK_SECTION_SCHEMA,
		handoff_package_schema: PIP_360_FINAL_UAT_HANDOFF_PACKAGE_SCHEMA,
		collection_schema: PIP_360_FINAL_UAT_COLLECTION_SCHEMA,
		export_schema: PIP_360_FINAL_UAT_EXPORT_SCHEMA,
		domains: { ...PIP_360_FINAL_UAT_DOMAINS },
		domain_order: [...PIP_360_FINAL_UAT_DOMAIN_ORDER],
		check_statuses: { ...PIP_360_FINAL_UAT_CHECK_STATUSES },
		decisions: { ...PIP_360_FINAL_UAT_DECISIONS },
		handoff_statuses: { ...PIP_360_FINAL_UAT_HANDOFF_STATUSES },
		signoff_statuses: { ...PIP_360_FINAL_UAT_SIGNOFF_STATUSES },
		risk_severities: { ...PIP_360_FINAL_UAT_RISK_SEVERITIES },
		limitation_classifications: {
			...PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS,
		},
		test_modes: { ...PIP_360_FINAL_UAT_TEST_MODES },
		reason_codes: { ...PIP_360_FINAL_UAT_REASON_CODES },
		required_signoff_roles: { ...PIP_360_FINAL_UAT_SIGNOFF_ROLES },
		summary: {
			...PIP_360_FINAL_UAT_MANIFEST_SUMMARY,
		},
	};
}

export function validatePip360FinalUatHandoffContractManifest(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const summary = isPlainObject(safe.summary) ? safe.summary : {};
	const checks = {
		...validateSchemaAndArrays(safe),
		...validateSummary(summary),
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `Manifest check failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, {
		...safe,
		domain_order: [...PIP_360_FINAL_UAT_DOMAIN_ORDER],
		summary: { ...PIP_360_FINAL_UAT_MANIFEST_SUMMARY, ...summary },
	});
}

export function validatePip360FinalUatCheck(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined || safe.schema === PIP_360_FINAL_UAT_CHECK_SCHEMA,
		test_mode: Object.values(PIP_360_FINAL_UAT_TEST_MODES).includes(
			String(safe.test_mode ?? "")
		),
		domain: PIP_360_FINAL_UAT_DOMAIN_ORDER.includes(String(safe.domain ?? "")),
		status: Object.values(PIP_360_FINAL_UAT_CHECK_STATUSES).includes(
			String(safe.status ?? "")
		),
		severity: Object.values(PIP_360_FINAL_UAT_RISK_SEVERITIES).includes(
			String(safe.severity ?? "")
		),
		arrays:
			Array.isArray(safe.reason_codes) &&
			Array.isArray(safe.evidence_ids) &&
			Array.isArray(safe.source_receipt_ids) &&
			Array.isArray(safe.source_report_ids) &&
			Array.isArray(safe.source_fingerprints) &&
			Array.isArray(safe.validation_errors),
		fixed_safety_flags:
			safe.validation_fixture === true &&
			safe.production_operation_performed === false &&
			safe.external_network_request_performed === false &&
			safe.browser_storage_modified === false &&
			safe.central_repository_modified === false &&
			safe.production_authorization_granted === false,
		explicit_values_for_passed:
			String(safe.status ?? "") !== PIP_360_FINAL_UAT_CHECK_STATUSES.PASSED ||
			safe.expected_value !== undefined,
		checked_at: String(safe.checked_at ?? "").length > 0,
		check_fingerprint: String(safe.check_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT check validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatDomain(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined || safe.schema === PIP_360_FINAL_UAT_DOMAIN_SCHEMA,
		domain: PIP_360_FINAL_UAT_DOMAIN_ORDER.includes(String(safe.domain ?? "")),
		checks_array: Array.isArray(safe.checks),
		has_checks: toArray(safe.checks).length > 0,
		status: Object.values(PIP_360_FINAL_UAT_CHECK_STATUSES).includes(
			String(safe.status ?? "")
		),
		validation_fixture: safe.validation_fixture === true,
		domain_fingerprint: String(safe.domain_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT domain validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatSignoff(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const alias = String(safe.opaque_reviewer_alias ?? "");
	const checks = {
		schema:
			safe.schema === undefined || safe.schema === PIP_360_FINAL_UAT_SIGNOFF_SCHEMA,
		role: Object.values(PIP_360_FINAL_UAT_SIGNOFF_ROLES).includes(
			String(safe.signoff_role ?? "")
		),
		status: Object.values(PIP_360_FINAL_UAT_SIGNOFF_STATUSES).includes(
			String(safe.status ?? "")
		),
		decision_scope: String(safe.decision_scope ?? "").length > 0,
		arrays:
			Array.isArray(safe.reviewed_evidence_ids) &&
			Array.isArray(safe.reviewed_risk_ids) &&
			Array.isArray(safe.reviewed_limitation_ids) &&
			Array.isArray(safe.conditions) &&
			Array.isArray(safe.rejection_reasons),
		validation_fixture: safe.validation_fixture === true,
		production_authorization_granted:
			safe.production_authorization_granted === false,
		opaque_alias: /^REVIEWER-[A-Z-]+-\d{3,}$/.test(alias),
		no_personal_identity: !containsProhibitedIdentity(alias),
		signed_at: String(safe.signed_at ?? "").length > 0,
		receipt_fingerprint: String(safe.receipt_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT signoff validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatRisk(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined || safe.schema === PIP_360_FINAL_UAT_RISK_SCHEMA,
		risk_id: String(safe.risk_id ?? "").length > 0,
		severity: Object.values(PIP_360_FINAL_UAT_RISK_SEVERITIES).includes(
			String(safe.severity ?? "")
		),
		accepted_for_production: safe.accepted_for_production === false,
		validation_arrays:
			Array.isArray(safe.related_evidence_ids) &&
			Array.isArray(safe.related_limitation_ids),
		risk_fingerprint: String(safe.risk_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT risk validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatLimitation(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined || safe.schema === PIP_360_FINAL_UAT_LIMITATION_SCHEMA,
		limitation_id: String(safe.limitation_id ?? "").length > 0,
		classification: Object.values(
			PIP_360_FINAL_UAT_LIMITATION_CLASSIFICATIONS
		).includes(String(safe.classification ?? "")),
		affected_modules: Array.isArray(safe.affected_modules),
		validation_fixture: safe.validation_fixture === true,
		limitation_fingerprint: String(safe.limitation_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT limitation validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatRunbookSection(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined ||
			safe.schema === PIP_360_FINAL_UAT_RUNBOOK_SECTION_SCHEMA,
		section_key: String(safe.section_key ?? "").length > 0,
		arrays:
			Array.isArray(safe.prerequisites) &&
			Array.isArray(safe.manual_steps) &&
			Array.isArray(safe.expected_evidence) &&
			Array.isArray(safe.failure_conditions) &&
			Array.isArray(safe.prohibited_actions),
		validation_fixture: safe.validation_fixture === true,
		no_executable_commands: !toArray(safe.manual_steps).some((step) =>
			/npm\s+run|node\s+|powershell|bash|curl\s+|wget\s+|sql\s+/i.test(
				String(step)
			)
		),
		section_fingerprint: String(safe.section_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT runbook section validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatHandoffPackage(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined ||
			safe.schema === PIP_360_FINAL_UAT_HANDOFF_PACKAGE_SCHEMA,
		domain_order:
			JSON.stringify(toArray(safe.uat_domain_order)) ===
			JSON.stringify(PIP_360_FINAL_UAT_DOMAIN_ORDER),
		domains_count: toArray(safe.uat_domains).length === 18,
		required_flags:
			safe.validation_fixture === true &&
			safe.fixtures_excluded_from_production_totals === true &&
			safe.production_authorization_granted === false,
		production_counts_zero:
			Number(safe.production_operation_count ?? -1) === 0 &&
			Number(safe.external_network_request_count ?? -1) === 0 &&
			Number(safe.browser_storage_mutation_count ?? -1) === 0 &&
			Number(safe.central_repository_mutation_count ?? -1) === 0 &&
			Number(safe.central_audit_append_count ?? -1) === 0,
		decision: Object.values(PIP_360_FINAL_UAT_DECISIONS).includes(
			String(safe.controlled_pilot_decision ?? "")
		),
		handoff_status: Object.values(PIP_360_FINAL_UAT_HANDOFF_STATUSES).includes(
			String(safe.controlled_pilot_handoff_status ?? "")
		),
		fingerprint: String(safe.package_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT handoff package validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function validatePip360FinalUatCollection(input = {}) {
	const safe = isPlainObject(input) ? input : {};
	const checks = {
		schema:
			safe.schema === undefined || safe.schema === PIP_360_FINAL_UAT_COLLECTION_SCHEMA,
		package_array: Array.isArray(safe.handoff_packages),
		package_count: toArray(safe.handoff_packages).length >= 1,
		test_mode: Object.values(PIP_360_FINAL_UAT_TEST_MODES).includes(
			String(safe.test_mode ?? "")
		),
		validation_fixture: safe.validation_fixture === true,
		collection_fingerprint: String(safe.collection_fingerprint ?? "").length >= 12,
	};
	const errors = Object.entries(checks)
		.filter(([, ok]) => !ok)
		.map(([key]) => `UAT collection validation failed: ${key}`);
	return envelope(errors.length === 0, checks, errors, safe);
}

export function sanitizePip360FinalUatExport(input = {}) {
	const sanitized = sanitizeRecord(isPlainObject(input) ? input : {});
	const manifest = isPlainObject(sanitized.safety_manifest)
		? sanitized.safety_manifest
		: { ...PIP_360_FINAL_UAT_MANIFEST_SUMMARY };
	return {
		schema: PIP_360_FINAL_UAT_EXPORT_SCHEMA,
		generated_at: String(input.generated_at ?? "2027-01-04T10:00:00.000Z"),
		safety_manifest: { ...PIP_360_FINAL_UAT_MANIFEST_SUMMARY, ...manifest },
		payload: sanitized,
		export_fingerprint: deterministicHash(sanitized),
	};
}
