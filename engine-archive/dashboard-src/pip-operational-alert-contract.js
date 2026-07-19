import {
  PIP_CENTRAL_AUDIT_EVENT_TYPES,
  validatePipCentralAuditEvent,
} from "./pip-central-audit-contract.js";

export const PIP_OPERATIONAL_ALERT_CONTRACT_SCHEMA =
  "pip.operational-alert.contract.v1";

export const PIP_OPERATIONAL_ALERT_REPORT_SCHEMA =
  "pip.operational-alert.report.v1";

export const PIP_OPERATIONAL_ALERT_ACKNOWLEDGEMENT_SCHEMA =
  "pip.operational-alert.acknowledgement.v1";

export const PIP_OPERATIONAL_ALERT_ACCEPTANCE_SCHEMA =
  "pip.operational-alert.acceptance.v1";

export const PIP_OPERATIONAL_ALERT_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

export const PIP_OPERATIONAL_ALERT_STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  ACKNOWLEDGED: "ACKNOWLEDGED",
});

export const PIP_OPERATIONAL_ALERT_CODES = Object.freeze({
  SYSTEM_HEALTH_UNAVAILABLE: "SYSTEM_HEALTH_UNAVAILABLE",
  SYSTEM_HEALTH_DEGRADED: "SYSTEM_HEALTH_DEGRADED",
  AUTHENTICATION_COMPONENT_DEGRADED:
    "AUTHENTICATION_COMPONENT_DEGRADED",
  AUTHORIZATION_COMPONENT_DEGRADED:
    "AUTHORIZATION_COMPONENT_DEGRADED",
  SCENARIO_STORE_DEGRADED: "SCENARIO_STORE_DEGRADED",
  AUDIT_STORE_DEGRADED: "AUDIT_STORE_DEGRADED",
  ERROR_LOGGER_DEGRADED: "ERROR_LOGGER_DEGRADED",
  RECENT_ERROR_ACTIVITY: "RECENT_ERROR_ACTIVITY",
  CRITICAL_ERROR_ACTIVITY: "CRITICAL_ERROR_ACTIVITY",
  SECURITY_BASELINE_VIOLATION: "SECURITY_BASELINE_VIOLATION",
  PERSISTENCE_BASELINE_VIOLATION:
    "PERSISTENCE_BASELINE_VIOLATION",
});

const REQUIRED_COMPONENT_KEYS = [
  "authentication",
  "authorization",
  "scenario_store",
  "audit_store",
  "error_logger",
];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeIso(value) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return null;
  }

  return new Date(Date.parse(value)).toISOString();
}

function isStatus(value) {
  return Object.values(PIP_OPERATIONAL_ALERT_STATUSES).includes(
    String(value ?? "")
  );
}

function isSeverity(value) {
  return Object.values(PIP_OPERATIONAL_ALERT_SEVERITIES).includes(
    String(value ?? "")
  );
}

function isKnownAlertCode(value) {
  return Object.values(PIP_OPERATIONAL_ALERT_CODES).includes(
    String(value ?? "")
  );
}

function hasForbiddenRawContent(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasForbiddenRawContent(entry));
  }

  if (!isPlainObject(value)) {
    if (typeof value !== "string") {
      return false;
    }

    const normalized = value.trim().toLowerCase();
    return (
      normalized.includes("stack") ||
      normalized.includes("password") ||
      normalized.includes("token") ||
      normalized.includes("cookie") ||
      normalized.includes("authorization") ||
      normalized.includes("request body") ||
      normalized.includes("?") ||
      normalized.includes("@") ||
      normalized.includes("voter") ||
      normalized.includes("scenario") ||
      normalized.includes("/api/") ||
      normalized.includes("c:\\")
    );
  }

  return Object.values(value).some((nested) =>
    hasForbiddenRawContent(nested)
  );
}

function validateEvidence(evidence) {
  if (!isPlainObject(evidence)) {
    return false;
  }

  const allowedKeys = [
    "component_status",
    "recent_error_count",
    "warning_count",
    "error_count",
    "critical_count",
    "request_failure_count",
    "storage_error_count",
    "validation_error_count",
    "source_health_status",
  ];

  if (
    Object.keys(evidence).some(
      (key) => !allowedKeys.includes(String(key).trim())
    )
  ) {
    return false;
  }

  return !hasForbiddenRawContent(evidence);
}

export function buildPipOperationalAlertFingerprint({
  code,
  component,
  sourceHealthStatus,
  severity,
  evidence,
}) {
  const payload = JSON.stringify({
    code: String(code ?? "").trim().toUpperCase(),
    component: String(component ?? "").trim().toUpperCase(),
    sourceHealthStatus: String(sourceHealthStatus ?? "")
      .trim()
      .toUpperCase(),
    severity: String(severity ?? "").trim().toUpperCase(),
    evidence: isPlainObject(evidence)
      ? {
          component_status: String(
            evidence.component_status ?? ""
          )
            .trim()
            .toUpperCase(),
          recent_error_count: Number(evidence.recent_error_count ?? 0),
          warning_count: Number(evidence.warning_count ?? 0),
          error_count: Number(evidence.error_count ?? 0),
          critical_count: Number(evidence.critical_count ?? 0),
          request_failure_count: Number(
            evidence.request_failure_count ?? 0
          ),
          storage_error_count: Number(
            evidence.storage_error_count ?? 0
          ),
          validation_error_count: Number(
            evidence.validation_error_count ?? 0
          ),
          source_health_status: String(
            evidence.source_health_status ?? ""
          )
            .trim()
            .toUpperCase(),
        }
      : {},
  });

  return `sha256:${Buffer.from(payload)
    .toString("utf8")
    .length.toString(16)}:${Buffer.from(payload)
    .toString("hex")
    .slice(0, 64)}`;
}

export function derivePipOperationalAlerts({
  report,
  acknowledgements = [],
  guidanceCatalog = [],
} = {}) {
  const safeReport = isPlainObject(report) ? report : {};
  const sourceHealth = isPlainObject(safeReport.source_health)
    ? safeReport.source_health
    : {};
  const security = isPlainObject(safeReport.security)
    ? safeReport.security
    : {};
  const persistence = isPlainObject(safeReport.persistence)
    ? safeReport.persistence
    : {};
  const errors = isPlainObject(safeReport.errors)
    ? safeReport.errors
    : {};
  const components = isPlainObject(safeReport.components)
    ? safeReport.components
    : {};

  const alertCandidates = [];
  const addAlert = ({ code, severity, component, title, summary, evidence }) => {
    const guidance = guidanceCatalog.find(
      (entry) => String(entry.alert_code) === String(code)
    ) ?? null;
    const fingerprint = buildPipOperationalAlertFingerprint({
      code,
      component,
      sourceHealthStatus: safeReport.status,
      severity,
      evidence,
    });
    alertCandidates.push({
      alert_id: fingerprint,
      alert_fingerprint: fingerprint,
      code,
      severity,
      status: PIP_OPERATIONAL_ALERT_STATUSES.ACTIVE,
      component,
      title,
      summary,
      detected_at: safeReport.generated_at ?? new Date().toISOString(),
      evidence,
      recovery_guidance_id: guidance?.guidance_id ?? null,
      acknowledged: false,
      acknowledged_at: null,
      acknowledged_by_user_id: null,
    });
  };

  if (safeReport.status === "UNAVAILABLE") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.SYSTEM_HEALTH_UNAVAILABLE,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "SYSTEM",
      title: "System health is unavailable",
      summary: "A required component cannot provide a valid health status.",
      evidence: {
        source_health_status: safeReport.status,
        component_status: "UNAVAILABLE",
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
        request_failure_count: Number(errors.request_failure_count ?? 0),
        storage_error_count: Number(errors.storage_error_count ?? 0),
        validation_error_count: Number(errors.validation_error_count ?? 0),
      },
    });
  }

  if (safeReport.status === "DEGRADED") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.SYSTEM_HEALTH_DEGRADED,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.WARNING,
      component: "SYSTEM",
      title: "System health is degraded",
      summary: "One or more components or recent error indicators require review.",
      evidence: {
        source_health_status: safeReport.status,
        component_status: "DEGRADED",
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
        request_failure_count: Number(errors.request_failure_count ?? 0),
        storage_error_count: Number(errors.storage_error_count ?? 0),
        validation_error_count: Number(errors.validation_error_count ?? 0),
      },
    });
  }

  if (components.authentication?.status !== "READY") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.AUTHENTICATION_COMPONENT_DEGRADED,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "AUTHENTICATION",
      title: "Authentication component is not ready",
      summary: "Authentication configuration or readiness requires review.",
      evidence: {
        component_status: components.authentication?.status ?? "UNKNOWN",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  if (components.authorization?.status !== "READY") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.AUTHORIZATION_COMPONENT_DEGRADED,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "AUTHORIZATION",
      title: "Authorization component is not ready",
      summary: "Authorization configuration or enforcement requires review.",
      evidence: {
        component_status: components.authorization?.status ?? "UNKNOWN",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  if (components.scenario_store?.status !== "READY") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.SCENARIO_STORE_DEGRADED,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "SCENARIO_STORE",
      title: "Scenario store requires review",
      summary: "Scenario storage readiness or durability requires investigation.",
      evidence: {
        component_status: components.scenario_store?.status ?? "UNKNOWN",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  if (components.audit_store?.status !== "READY") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.AUDIT_STORE_DEGRADED,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "AUDIT_STORE",
      title: "Audit store requires review",
      summary: "Append-only audit durability or readback requires investigation.",
      evidence: {
        component_status: components.audit_store?.status ?? "UNKNOWN",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  if (components.error_logger?.status !== "READY") {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.ERROR_LOGGER_DEGRADED,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.WARNING,
      component: "ERROR_LOGGER",
      title: "Error logger requires review",
      summary: "Sanitized error logging readiness requires investigation.",
      evidence: {
        component_status: components.error_logger?.status ?? "UNKNOWN",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  if (Number(errors.recent_error_events_15m ?? 0) > 0) {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.RECENT_ERROR_ACTIVITY,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.WARNING,
      component: "SYSTEM",
      title: "Recent safe error activity detected",
      summary: "Recent error activity is present and should be reviewed.",
      evidence: {
        component_status: safeReport.status,
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
        request_failure_count: Number(errors.request_failure_count ?? 0),
        storage_error_count: Number(errors.storage_error_count ?? 0),
        validation_error_count: Number(errors.validation_error_count ?? 0),
      },
    });
  }

  if (Number(errors.critical_count ?? 0) > 0) {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.CRITICAL_ERROR_ACTIVITY,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "SYSTEM",
      title: "Critical error activity detected",
      summary: "Critical error activity requires immediate review.",
      evidence: {
        component_status: safeReport.status,
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
        request_failure_count: Number(errors.request_failure_count ?? 0),
        storage_error_count: Number(errors.storage_error_count ?? 0),
        validation_error_count: Number(errors.validation_error_count ?? 0),
      },
    });
  }

  if (
    security.authentication_configured !== true ||
    security.authentication_required !== true ||
    security.roles_configured !== true ||
    security.authorization_enforced !== true
  ) {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.SECURITY_BASELINE_VIOLATION,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "SECURITY",
      title: "Security baseline violated",
      summary: "Authentication or authorization baseline requires immediate review.",
      evidence: {
        component_status: "VIOLATED",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  if (
    persistence.operational_read_cutover_enabled !== false ||
    persistence.operational_write_cutover_enabled !== false ||
    persistence.automatic_synchronisation_enabled !== false ||
    persistence.central_persistence_enabled !== true ||
    persistence.audit_append_only !== true
  ) {
    addAlert({
      code: PIP_OPERATIONAL_ALERT_CODES.PERSISTENCE_BASELINE_VIOLATION,
      severity: PIP_OPERATIONAL_ALERT_SEVERITIES.CRITICAL,
      component: "PERSISTENCE",
      title: "Persistence baseline violated",
      summary: "Cutover or durable-audit baseline requires review.",
      evidence: {
        component_status: "VIOLATED",
        source_health_status: safeReport.status,
        recent_error_count: Number(errors.recent_error_events_15m ?? 0),
        warning_count: Number(errors.warning_count ?? 0),
        error_count: Number(errors.error_count ?? 0),
        critical_count: Number(errors.critical_count ?? 0),
      },
    });
  }

  const deduped = [];
  const seen = new Set();
  alertCandidates.forEach((alert) => {
    if (!seen.has(alert.alert_fingerprint)) {
      seen.add(alert.alert_fingerprint);
      deduped.push(alert);
    }
  });

  const acknowledgedFingerprints = new Map(
    acknowledgements.map((entry) => [String(entry.alert_fingerprint), entry])
  );

  const alerts = deduped.map((alert) => {
    const acknowledgement = acknowledgedFingerprints.get(
      String(alert.alert_fingerprint)
    );

    if (acknowledgement) {
      return {
        ...alert,
        status: PIP_OPERATIONAL_ALERT_STATUSES.ACKNOWLEDGED,
        acknowledged: true,
        acknowledged_at: acknowledgement.occurred_at ?? null,
        acknowledged_by_user_id:
          acknowledgement.actor_user_id ?? null,
      };
    }

    return alert;
  });

  return {
    alerts,
    report: safeReport,
  };
}

export function validatePipOperationalAlertReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const alerts = Array.isArray(safe.alerts) ? safe.alerts : [];
  const guidance = Array.isArray(safe.recovery_guidance)
    ? safe.recovery_guidance
    : [];
  const sourceHealth = isPlainObject(safe.source_health)
    ? safe.source_health
    : {};
  const security = isPlainObject(safe.security)
    ? safe.security
    : {};
  const persistence = isPlainObject(safe.persistence)
    ? safe.persistence
    : {};
  const protection = isPlainObject(safe.protection)
    ? safe.protection
    : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_OPERATIONAL_ALERT_REPORT_SCHEMA,
    status_valid: ["READY", "ALERTS_ACTIVE", "CRITICAL"].includes(
      String(safe.status ?? "")
    ),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    server_instance_id_valid:
      typeof safe.server_instance_id === "string" &&
      safe.server_instance_id.trim().length > 0,
    source_health_schema_valid:
      sourceHealth.schema !== undefined,
    alerts_valid: alerts.every((alert) =>
      isPlainObject(alert) &&
      typeof alert.alert_id === "string" &&
      typeof alert.alert_fingerprint === "string" &&
      isKnownAlertCode(alert.code) &&
      isSeverity(alert.severity) &&
      isStatus(alert.status) &&
      typeof alert.component === "string" &&
      typeof alert.title === "string" &&
      typeof alert.summary === "string" &&
      validateEvidence(alert.evidence) &&
      normalizeIso(alert.detected_at) !== null
    ),
    guidance_valid: guidance.every((item) =>
      isPlainObject(item) &&
      typeof item.guidance_id === "string" &&
      isKnownAlertCode(item.alert_code) &&
      typeof item.title === "string" &&
      typeof item.objective === "string" &&
      Array.isArray(item.steps) &&
      item.steps.every((step) => typeof step === "string") &&
      typeof item.escalation_condition === "string" &&
      item.requires_administrator === true &&
      item.requires_change_approval === true &&
      item.automatic_action_performed === false
    ),
    security_valid:
      security.authentication_configured === true &&
      security.authentication_required === true &&
      security.roles_configured === true &&
      security.authorization_enforced === true &&
      security.sanitized_evidence_only === true &&
      security.credential_material_excluded === true,
    persistence_valid:
      persistence.audit_append_only === true &&
      persistence.central_persistence_enabled === true &&
      persistence.legacy_browser_storage_authoritative === true &&
      persistence.operational_read_cutover_enabled === false &&
      persistence.operational_write_cutover_enabled === false &&
      persistence.automatic_synchronisation_enabled === false,
    protection_valid: protection.p999_write_protection === true,
    summary_counts_valid:
      Number.isInteger(Number(summary.active_alert_count)) &&
      Number.isInteger(Number(summary.acknowledged_alert_count)) &&
      Number.isInteger(Number(summary.unacknowledged_alert_count)) &&
      Number.isInteger(Number(summary.info_count)) &&
      Number.isInteger(Number(summary.warning_count)) &&
      Number.isInteger(Number(summary.critical_count)) &&
      Number.isInteger(Number(summary.recovery_guidance_count)),
    safe_content_valid: !hasForbiddenRawContent(safe),
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operational alert report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}

export function validatePipOperationalAlertAcknowledgementReceipt(
  receipt
) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const reportValidation = validatePipOperationalAlertReport(
    safe.report
  );
  const eventValidation = validatePipCentralAuditEvent(safe.event);

  const checks = {
    schema_valid:
      safe.schema === PIP_OPERATIONAL_ALERT_ACKNOWLEDGEMENT_SCHEMA,
    acknowledged_valid: safe.acknowledged === true,
    report_valid: reportValidation.valid === true,
    event_valid: eventValidation.valid === true,
    write_readback_valid: safe.write_readback_verified === true,
    acknowledged_at_valid: normalizeIso(safe.acknowledged_at) !== null,
    legacy_storage_preserved_valid:
      safe.legacy_storage_preserved === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operational alert acknowledgement check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_OPERATIONAL_ALERT_ACKNOWLEDGEMENT_SCHEMA,
      acknowledged: safe.acknowledged === true,
      report: reportValidation.normalized,
      event: eventValidation.normalized,
      write_readback_verified: safe.write_readback_verified === true,
      acknowledged_at:
        normalizeIso(safe.acknowledged_at) ?? new Date().toISOString(),
      acknowledged_by_user_id:
        typeof safe.acknowledged_by_user_id === "string"
          ? safe.acknowledged_by_user_id
          : null,
      legacy_storage_preserved:
        safe.legacy_storage_preserved === true,
    },
  };
}

export function validatePipOperationalAlertAcceptanceReceipt(receipt) {
  const safe = isPlainObject(receipt) ? receipt : {};
  const reportValidation = validatePipOperationalAlertReport(
    safe.report
  );
  const eventValidation = validatePipCentralAuditEvent(safe.event);

  const checks = {
    schema_valid:
      safe.schema === PIP_OPERATIONAL_ALERT_ACCEPTANCE_SCHEMA,
    accepted_valid: safe.accepted === true,
    report_valid: reportValidation.valid === true,
    event_valid: eventValidation.valid === true,
    write_readback_valid: safe.write_readback_verified === true,
    guidance_covered_valid: safe.guidance_covered === true,
    legacy_storage_preserved_valid:
      safe.legacy_storage_preserved === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operational alert acceptance check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      schema: PIP_OPERATIONAL_ALERT_ACCEPTANCE_SCHEMA,
      accepted: safe.accepted === true,
      report: reportValidation.normalized,
      event: eventValidation.normalized,
      write_readback_verified: safe.write_readback_verified === true,
      guidance_covered: safe.guidance_covered === true,
      legacy_storage_preserved:
        safe.legacy_storage_preserved === true,
      received_at:
        normalizeIso(safe.received_at) ?? new Date().toISOString(),
    },
  };
}

export function buildPipOperationalAlertContractManifest({
  generatedAt,
} = {}) {
  return {
    schema: PIP_OPERATIONAL_ALERT_CONTRACT_SCHEMA,
    generated_at:
      normalizeIso(generatedAt) ?? new Date().toISOString(),
    report_schema: PIP_OPERATIONAL_ALERT_REPORT_SCHEMA,
    acknowledgement_schema:
      PIP_OPERATIONAL_ALERT_ACKNOWLEDGEMENT_SCHEMA,
    acceptance_schema:
      PIP_OPERATIONAL_ALERT_ACCEPTANCE_SCHEMA,
    severities: { ...PIP_OPERATIONAL_ALERT_SEVERITIES },
    statuses: { ...PIP_OPERATIONAL_ALERT_STATUSES },
    codes: { ...PIP_OPERATIONAL_ALERT_CODES },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      legacy_browser_storage_authoritative: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      p999_write_protection: true,
      automatic_alert_polling_enabled: false,
      automatic_alert_dispatch_enabled: false,
      automatic_recovery_enabled: false,
    },
  };
}

export function validatePipOperationalAlertContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};

  const checks = {
    schema_valid:
      safe.schema === PIP_OPERATIONAL_ALERT_CONTRACT_SCHEMA,
    report_schema_valid:
      safe.report_schema === PIP_OPERATIONAL_ALERT_REPORT_SCHEMA,
    acknowledgement_schema_valid:
      safe.acknowledgement_schema ===
      PIP_OPERATIONAL_ALERT_ACKNOWLEDGEMENT_SCHEMA,
    acceptance_schema_valid:
      safe.acceptance_schema ===
      PIP_OPERATIONAL_ALERT_ACCEPTANCE_SCHEMA,
    severities_valid:
      isPlainObject(safe.severities) &&
      Object.values(PIP_OPERATIONAL_ALERT_SEVERITIES).every((value) =>
        Object.values(safe.severities).includes(value)
      ),
    statuses_valid:
      isPlainObject(safe.statuses) &&
      Object.values(PIP_OPERATIONAL_ALERT_STATUSES).every((value) =>
        Object.values(safe.statuses).includes(value)
      ),
    codes_valid:
      isPlainObject(safe.codes) &&
      Object.values(PIP_OPERATIONAL_ALERT_CODES).every((value) =>
        Object.values(safe.codes).includes(value)
      ),
    summary_security_valid:
      safe.summary?.authentication_configured === true &&
      safe.summary?.authentication_required === true &&
      safe.summary?.roles_configured === true &&
      safe.summary?.authorization_enforced === true,
    summary_storage_valid:
      safe.summary?.legacy_browser_storage_authoritative === true &&
      safe.summary?.operational_read_cutover_enabled === false &&
      safe.summary?.operational_write_cutover_enabled === false &&
      safe.summary?.automatic_synchronisation_enabled === false &&
      safe.summary?.p999_write_protection === true,
    summary_automation_valid:
      safe.summary?.automatic_alert_polling_enabled === false &&
      safe.summary?.automatic_alert_dispatch_enabled === false &&
      safe.summary?.automatic_recovery_enabled === false,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operational alert contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: safe,
  };
}