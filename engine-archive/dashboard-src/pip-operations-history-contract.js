export const PIP_OPERATIONS_HISTORY_CONTRACT_SCHEMA =
  "pip.operations-history.contract.v1";
export const PIP_OPERATIONS_HISTORY_REPORT_SCHEMA =
  "pip.operations-history.report.v1";
export const PIP_OPERATIONS_TREND_REPORT_SCHEMA =
  "pip.operations-trend.report.v1";
export const PIP_INCIDENT_TIMELINE_REPORT_SCHEMA =
  "pip.incident-timeline.report.v1";

export const PIP_OPERATIONS_HISTORY_STATUSES = Object.freeze({
  READY: "READY",
  EMPTY: "EMPTY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
});

export const PIP_OPERATIONS_TREND_DIRECTIONS = Object.freeze({
  IMPROVED: "IMPROVED",
  STABLE: "STABLE",
  DEGRADED: "DEGRADED",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
});

export const PIP_INCIDENT_TIMELINE_SOURCES = Object.freeze({
  OBSERVABILITY_SNAPSHOT: "OBSERVABILITY_SNAPSHOT",
  OPERATIONAL_ALERT: "OPERATIONAL_ALERT",
  SANITIZED_ERROR: "SANITIZED_ERROR",
  SYSTEM_HEALTH: "SYSTEM_HEALTH",
  RELEASE_GATE: "RELEASE_GATE",
  CENTRAL_AUDIT: "CENTRAL_AUDIT",
});

export const PIP_INCIDENT_TIMELINE_SEVERITIES = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeIso(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(Date.parse(value)).toISOString();
}

function toSafeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n;
}

function toSafeInteger(value) {
  return Math.max(0, Math.floor(toSafeNumber(value)));
}

function isEnumMember(value, enumObject) {
  return Object.values(enumObject).includes(String(value ?? ""));
}

function validateRouteGroupEntry(entry) {
  const safe = isPlainObject(entry) ? entry : {};
  return (
    typeof safe.route_group === "string" &&
    safe.route_group.trim().length > 0 &&
    Number.isFinite(Number(safe.request_count)) &&
    Number.isFinite(Number(safe.success_count)) &&
    Number.isFinite(Number(safe.client_error_count)) &&
    Number.isFinite(Number(safe.server_error_count)) &&
    Number.isFinite(Number(safe.average_response_ms)) &&
    Number.isFinite(Number(safe.p95_response_ms)) &&
    Number.isFinite(Number(safe.slow_request_count))
  );
}

function validateTimelineItem(item) {
  const safe = isPlainObject(item) ? item : {};
  return (
    typeof safe.event_id === "string" &&
    safe.event_id.trim().length > 0 &&
    normalizeIso(safe.occurred_at) !== null &&
    isEnumMember(safe.source, PIP_INCIDENT_TIMELINE_SOURCES) &&
    typeof safe.event_type === "string" &&
    safe.event_type.trim().length > 0 &&
    isEnumMember(safe.severity, PIP_INCIDENT_TIMELINE_SEVERITIES) &&
    typeof safe.status === "string" &&
    safe.status.trim().length > 0 &&
    typeof safe.safe_summary === "string"
  );
}

function validateTrendCheckEntry(check) {
  const safe = isPlainObject(check) ? check : {};
  return (
    typeof safe.check_id === "string" &&
    safe.check_id.trim().length > 0 &&
    typeof safe.label === "string" &&
    safe.label.trim().length > 0 &&
    typeof safe.result === "string" &&
    safe.result.trim().length > 0
  );
}

function collectForbiddenTokens(value, path = "root") {
  const matches = [];

  const forbiddenSnippets = [
    "@",
    "authorization:",
    "bearer ",
    "set-cookie",
    "cookie",
    "csrf",
    "password",
    "secret",
    "token",
    "stack",
    "exception",
    "query",
    "url",
    "http://",
    "https://",
    "session",
    "user_id",
    "email",
    "hostname",
    "domain",
    "proxy",
    "cidr",
    "process.env",
    "db_path",
    "database",
    "/users/",
    ":\\",
  ];

  const forbiddenKeys = new Set([
    "user",
    "user_id",
    "user_identity",
    "email",
    "session",
    "session_id",
    "request_path",
    "request_url",
    "query",
    "headers",
    "body",
    "request_body",
    "response_body",
    "stack",
    "stack_trace",
    "exception_message",
    "raw_message",
    "message_raw",
    "origin",
    "domain",
    "host",
    "hostname",
    "env",
    "environment_value",
    "credential",
    "secret",
    "password",
    "process_id",
    "pid",
    "absolute_path",
    "scenario_content",
    "voter",
    "voter_record",
    "browser_storage",
    "browser_storage_payload",
    "local_storage",
    "session_storage",
    "ip",
    "ip_address",
    "device_identifier",
  ]);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      matches.push(...collectForbiddenTokens(entry, `${path}[${index}]`));
    });
    return matches;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nested]) => {
      const normalizedKey = String(key).trim().toLowerCase();
      if (forbiddenKeys.has(normalizedKey)) {
        matches.push(`${path}.${normalizedKey}`);
      }
      matches.push(...collectForbiddenTokens(nested, `${path}.${String(key)}`));
    });
    return matches;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (forbiddenSnippets.some((snippet) => normalized.includes(snippet))) {
      matches.push(path);
    }
  }

  return matches;
}

export function buildPipOperationsHistoryContractManifest({ generatedAt } = {}) {
  return {
    schema: PIP_OPERATIONS_HISTORY_CONTRACT_SCHEMA,
    generated_at: normalizeIso(generatedAt) ?? new Date().toISOString(),
    history_report_schema: PIP_OPERATIONS_HISTORY_REPORT_SCHEMA,
    trend_report_schema: PIP_OPERATIONS_TREND_REPORT_SCHEMA,
    incident_timeline_report_schema: PIP_INCIDENT_TIMELINE_REPORT_SCHEMA,
    statuses: { ...PIP_OPERATIONS_HISTORY_STATUSES },
    trend_directions: { ...PIP_OPERATIONS_TREND_DIRECTIONS },
    timeline_sources: { ...PIP_INCIDENT_TIMELINE_SOURCES },
    timeline_severities: { ...PIP_INCIDENT_TIMELINE_SEVERITIES },
    summary: {
      authentication_configured: true,
      authentication_required: true,
      roles_configured: true,
      authorization_enforced: true,
      durable_central_history_enabled: true,
      history_append_only: true,
      legacy_browser_storage_authoritative: true,
      operational_read_cutover_enabled: false,
      operational_write_cutover_enabled: false,
      automatic_synchronisation_enabled: false,
      p999_write_protection: true,
      diagnostic_only: true,
      manual_history_retrieval_only: true,
      automatic_polling_enabled: false,
      recurring_timer_enabled: false,
      external_telemetry_export_enabled: false,
      automatic_incident_creation_enabled: false,
      automatic_alert_dispatch_enabled: false,
      automatic_remediation_enabled: false,
      automatic_recovery_enabled: false,
      automatic_restart_enabled: false,
      shell_execution_enabled: false,
      child_process_execution_enabled: false,
      outbound_network_check_enabled: false,
      environment_file_write_enabled: false,
      credential_values_redacted: true,
      environment_values_redacted: true,
      infrastructure_values_redacted: true,
      user_identity_values_redacted: true,
      request_content_excluded: true,
      voter_data_excluded: true,
      scenario_content_excluded: true,
      browser_storage_content_excluded: true,
    },
  };
}

export function validatePipOperationsHistoryContractManifest(manifest) {
  const safe = isPlainObject(manifest) ? manifest : {};
  const summary = isPlainObject(safe.summary) ? safe.summary : {};

  const checks = {
    schema_valid: safe.schema === PIP_OPERATIONS_HISTORY_CONTRACT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    history_report_schema_valid:
      safe.history_report_schema === PIP_OPERATIONS_HISTORY_REPORT_SCHEMA,
    trend_report_schema_valid:
      safe.trend_report_schema === PIP_OPERATIONS_TREND_REPORT_SCHEMA,
    incident_timeline_report_schema_valid:
      safe.incident_timeline_report_schema === PIP_INCIDENT_TIMELINE_REPORT_SCHEMA,
    statuses_valid:
      isPlainObject(safe.statuses) &&
      Object.values(PIP_OPERATIONS_HISTORY_STATUSES).every((value) =>
        Object.values(safe.statuses).includes(value)
      ),
    trend_directions_valid:
      isPlainObject(safe.trend_directions) &&
      Object.values(PIP_OPERATIONS_TREND_DIRECTIONS).every((value) =>
        Object.values(safe.trend_directions).includes(value)
      ),
    timeline_sources_valid:
      isPlainObject(safe.timeline_sources) &&
      Object.values(PIP_INCIDENT_TIMELINE_SOURCES).every((value) =>
        Object.values(safe.timeline_sources).includes(value)
      ),
    timeline_severities_valid:
      isPlainObject(safe.timeline_severities) &&
      Object.values(PIP_INCIDENT_TIMELINE_SEVERITIES).every((value) =>
        Object.values(safe.timeline_severities).includes(value)
      ),
    authentication_configured: summary.authentication_configured === true,
    authentication_required: summary.authentication_required === true,
    roles_configured: summary.roles_configured === true,
    authorization_enforced: summary.authorization_enforced === true,
    durable_central_history_enabled: summary.durable_central_history_enabled === true,
    history_append_only: summary.history_append_only === true,
    legacy_browser_storage_authoritative:
      summary.legacy_browser_storage_authoritative === true,
    operational_read_cutover_enabled:
      summary.operational_read_cutover_enabled === false,
    operational_write_cutover_enabled:
      summary.operational_write_cutover_enabled === false,
    automatic_synchronisation_enabled:
      summary.automatic_synchronisation_enabled === false,
    p999_write_protection: summary.p999_write_protection === true,
    diagnostic_only: summary.diagnostic_only === true,
    manual_history_retrieval_only: summary.manual_history_retrieval_only === true,
    automatic_polling_enabled: summary.automatic_polling_enabled === false,
    recurring_timer_enabled: summary.recurring_timer_enabled === false,
    external_telemetry_export_enabled:
      summary.external_telemetry_export_enabled === false,
    automatic_incident_creation_enabled:
      summary.automatic_incident_creation_enabled === false,
    automatic_alert_dispatch_enabled:
      summary.automatic_alert_dispatch_enabled === false,
    automatic_remediation_enabled:
      summary.automatic_remediation_enabled === false,
    automatic_recovery_enabled: summary.automatic_recovery_enabled === false,
    automatic_restart_enabled: summary.automatic_restart_enabled === false,
    shell_execution_enabled: summary.shell_execution_enabled === false,
    child_process_execution_enabled:
      summary.child_process_execution_enabled === false,
    outbound_network_check_enabled:
      summary.outbound_network_check_enabled === false,
    environment_file_write_enabled:
      summary.environment_file_write_enabled === false,
    credential_values_redacted: summary.credential_values_redacted === true,
    environment_values_redacted: summary.environment_values_redacted === true,
    infrastructure_values_redacted:
      summary.infrastructure_values_redacted === true,
    user_identity_values_redacted: summary.user_identity_values_redacted === true,
    request_content_excluded: summary.request_content_excluded === true,
    voter_data_excluded: summary.voter_data_excluded === true,
    scenario_content_excluded: summary.scenario_content_excluded === true,
    browser_storage_content_excluded:
      summary.browser_storage_content_excluded === true,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operations history contract check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_OPERATIONS_HISTORY_CONTRACT_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      summary: { ...summary },
    },
  };
}

export function validatePipOperationsHistoryRecord(record) {
  const safe = isPlainObject(record) ? record : {};

  const checks = {
    schema_valid: safe.schema === PIP_OPERATIONS_HISTORY_REPORT_SCHEMA,
    snapshot_id_valid:
      typeof safe.snapshot_id === "string" && safe.snapshot_id.trim().length > 0,
    accepted_at_valid: normalizeIso(safe.accepted_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" &&
      safe.target_environment.trim().length > 0,
    observability_status_valid:
      typeof safe.observability_status === "string" &&
      safe.observability_status.trim().length > 0,
    runtime_valid:
      isPlainObject(safe.runtime) &&
      Number.isFinite(Number(safe.runtime?.application_uptime_seconds)) &&
      Number.isFinite(Number(safe.runtime?.process_memory_rss_mb)) &&
      Number.isFinite(Number(safe.runtime?.process_heap_used_mb)) &&
      Number.isFinite(Number(safe.runtime?.process_heap_total_mb)) &&
      typeof safe.runtime?.memory_measurements_available === "boolean",
    request_metrics_valid:
      isPlainObject(safe.request_metrics) &&
      Number.isFinite(Number(safe.request_metrics?.total_requests)) &&
      Number.isFinite(Number(safe.request_metrics?.successful_requests)) &&
      Number.isFinite(Number(safe.request_metrics?.client_error_requests)) &&
      Number.isFinite(Number(safe.request_metrics?.server_error_requests)) &&
      Number.isFinite(Number(safe.request_metrics?.average_response_ms)) &&
      Number.isFinite(Number(safe.request_metrics?.p50_response_ms)) &&
      Number.isFinite(Number(safe.request_metrics?.p95_response_ms)) &&
      Number.isFinite(Number(safe.request_metrics?.maximum_response_ms)) &&
      Number.isFinite(Number(safe.request_metrics?.slow_request_count)) &&
      Array.isArray(safe.request_metrics?.route_groups) &&
      safe.request_metrics.route_groups.every(validateRouteGroupEntry),
    error_metrics_valid:
      isPlainObject(safe.error_metrics) &&
      Number.isFinite(Number(safe.error_metrics?.total_logged_events)) &&
      Number.isFinite(Number(safe.error_metrics?.info_events)) &&
      Number.isFinite(Number(safe.error_metrics?.warning_events)) &&
      Number.isFinite(Number(safe.error_metrics?.error_events)) &&
      Number.isFinite(Number(safe.error_metrics?.critical_events)) &&
      typeof safe.error_metrics?.recent_critical_event_present === "boolean",
    operational_alerts_valid:
      isPlainObject(safe.operational_alerts) &&
      Number.isFinite(Number(safe.operational_alerts?.total_alerts)) &&
      Number.isFinite(Number(safe.operational_alerts?.active_alerts)) &&
      Number.isFinite(Number(safe.operational_alerts?.active_warning_alerts)) &&
      Number.isFinite(Number(safe.operational_alerts?.active_high_alerts)) &&
      Number.isFinite(Number(safe.operational_alerts?.active_critical_alerts)) &&
      Number.isFinite(Number(safe.operational_alerts?.acknowledged_alerts)),
    system_health_valid:
      isPlainObject(safe.system_health) &&
      typeof safe.system_health?.overall_status === "string" &&
      typeof safe.system_health?.authentication_status === "string" &&
      typeof safe.system_health?.authorization_status === "string" &&
      typeof safe.system_health?.scenario_store_status === "string" &&
      typeof safe.system_health?.audit_store_status === "string" &&
      typeof safe.system_health?.error_logger_status === "string",
    governance_valid:
      isPlainObject(safe.governance) &&
      typeof safe.governance?.deployment_readiness_status === "string" &&
      typeof safe.governance?.edge_security_status === "string" &&
      typeof safe.governance?.release_gate_status === "string" &&
      typeof safe.governance?.release_gate_decision === "string" &&
      safe.governance?.p999_write_protection === true,
    security_valid:
      isPlainObject(safe.security) &&
      safe.security?.authentication_configured === true &&
      safe.security?.authentication_required === true &&
      safe.security?.roles_configured === true &&
      safe.security?.authorization_enforced === true &&
      safe.security?.sensitive_values_excluded === true,
    persistence_valid:
      isPlainObject(safe.persistence) &&
      safe.persistence?.legacy_browser_storage_authoritative === true &&
      safe.persistence?.operational_read_cutover_enabled === false &&
      safe.persistence?.operational_write_cutover_enabled === false &&
      safe.persistence?.automatic_synchronisation_enabled === false,
    forbidden_content_absent: collectForbiddenTokens(safe).length === 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operations history record check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_OPERATIONS_HISTORY_REPORT_SCHEMA,
      snapshot_id: String(safe.snapshot_id ?? "").trim(),
      accepted_at: normalizeIso(safe.accepted_at) ?? new Date().toISOString(),
      target_environment: String(safe.target_environment ?? "").trim().toUpperCase(),
      observability_status: String(safe.observability_status ?? "").trim().toUpperCase(),
      runtime: {
        application_uptime_seconds: toSafeInteger(safe.runtime?.application_uptime_seconds),
        process_memory_rss_mb: Number(toSafeNumber(safe.runtime?.process_memory_rss_mb).toFixed(2)),
        process_heap_used_mb: Number(toSafeNumber(safe.runtime?.process_heap_used_mb).toFixed(2)),
        process_heap_total_mb: Number(toSafeNumber(safe.runtime?.process_heap_total_mb).toFixed(2)),
        memory_measurements_available: safe.runtime?.memory_measurements_available === true,
      },
      request_metrics: {
        total_requests: toSafeInteger(safe.request_metrics?.total_requests),
        successful_requests: toSafeInteger(safe.request_metrics?.successful_requests),
        client_error_requests: toSafeInteger(safe.request_metrics?.client_error_requests),
        server_error_requests: toSafeInteger(safe.request_metrics?.server_error_requests),
        average_response_ms: Number(toSafeNumber(safe.request_metrics?.average_response_ms).toFixed(2)),
        p50_response_ms: Number(toSafeNumber(safe.request_metrics?.p50_response_ms).toFixed(2)),
        p95_response_ms: Number(toSafeNumber(safe.request_metrics?.p95_response_ms).toFixed(2)),
        maximum_response_ms: Number(toSafeNumber(safe.request_metrics?.maximum_response_ms).toFixed(2)),
        slow_request_count: toSafeInteger(safe.request_metrics?.slow_request_count),
        route_groups: Array.isArray(safe.request_metrics?.route_groups)
          ? safe.request_metrics.route_groups.map((entry) => ({
              route_group: String(entry?.route_group ?? "OTHER").trim().toUpperCase() || "OTHER",
              request_count: toSafeInteger(entry?.request_count),
              success_count: toSafeInteger(entry?.success_count),
              client_error_count: toSafeInteger(entry?.client_error_count),
              server_error_count: toSafeInteger(entry?.server_error_count),
              average_response_ms: Number(toSafeNumber(entry?.average_response_ms).toFixed(2)),
              p95_response_ms: Number(toSafeNumber(entry?.p95_response_ms).toFixed(2)),
              slow_request_count: toSafeInteger(entry?.slow_request_count),
            }))
          : [],
      },
      error_metrics: {
        total_logged_events: toSafeInteger(safe.error_metrics?.total_logged_events),
        info_events: toSafeInteger(safe.error_metrics?.info_events),
        warning_events: toSafeInteger(safe.error_metrics?.warning_events),
        error_events: toSafeInteger(safe.error_metrics?.error_events),
        critical_events: toSafeInteger(safe.error_metrics?.critical_events),
        recent_critical_event_present:
          safe.error_metrics?.recent_critical_event_present === true,
      },
      operational_alerts: {
        total_alerts: toSafeInteger(safe.operational_alerts?.total_alerts),
        active_alerts: toSafeInteger(safe.operational_alerts?.active_alerts),
        active_warning_alerts: toSafeInteger(
          safe.operational_alerts?.active_warning_alerts
        ),
        active_high_alerts: toSafeInteger(safe.operational_alerts?.active_high_alerts),
        active_critical_alerts: toSafeInteger(
          safe.operational_alerts?.active_critical_alerts
        ),
        acknowledged_alerts: toSafeInteger(safe.operational_alerts?.acknowledged_alerts),
      },
      system_health: {
        overall_status: String(safe.system_health?.overall_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        authentication_status:
          String(safe.system_health?.authentication_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        authorization_status:
          String(safe.system_health?.authorization_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        scenario_store_status:
          String(safe.system_health?.scenario_store_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        audit_store_status:
          String(safe.system_health?.audit_store_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        error_logger_status:
          String(safe.system_health?.error_logger_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
      },
      governance: {
        deployment_readiness_status:
          String(safe.governance?.deployment_readiness_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        edge_security_status:
          String(safe.governance?.edge_security_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        release_gate_status:
          String(safe.governance?.release_gate_status ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        release_gate_decision:
          String(safe.governance?.release_gate_decision ?? "UNKNOWN").trim().toUpperCase() || "UNKNOWN",
        p999_write_protection: safe.governance?.p999_write_protection === true,
      },
      security: {
        authentication_configured: safe.security?.authentication_configured === true,
        authentication_required: safe.security?.authentication_required === true,
        roles_configured: safe.security?.roles_configured === true,
        authorization_enforced: safe.security?.authorization_enforced === true,
        sensitive_values_excluded: safe.security?.sensitive_values_excluded === true,
      },
      persistence: {
        legacy_browser_storage_authoritative:
          safe.persistence?.legacy_browser_storage_authoritative === true,
        operational_read_cutover_enabled:
          safe.persistence?.operational_read_cutover_enabled === true,
        operational_write_cutover_enabled:
          safe.persistence?.operational_write_cutover_enabled === true,
        automatic_synchronisation_enabled:
          safe.persistence?.automatic_synchronisation_enabled === true,
      },
    },
  };
}

export function validatePipOperationsHistoryReport(report) {
  const safe = isPlainObject(report) ? report : {};
  const records = Array.isArray(safe.records) ? safe.records : [];
  const recordValidations = records.map((entry) =>
    validatePipOperationsHistoryRecord(entry)
  );

  const checks = {
    schema_valid: safe.schema === PIP_OPERATIONS_HISTORY_REPORT_SCHEMA,
    status_valid: isEnumMember(safe.status, PIP_OPERATIONS_HISTORY_STATUSES),
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" &&
      safe.target_environment.trim().length > 0,
    total_records_valid:
      Number.isInteger(Number(safe.total_records)) && Number(safe.total_records) >= 0,
    returned_records_valid:
      Number.isInteger(Number(safe.returned_records)) &&
      Number(safe.returned_records) >= 0,
    durable_store_ready: safe.durable_store_ready === true,
    append_only: safe.append_only === true,
    records_valid: recordValidations.every((result) => result.valid === true),
    security_valid:
      isPlainObject(safe.security) &&
      safe.security?.authentication_configured === true &&
      safe.security?.authentication_required === true &&
      safe.security?.roles_configured === true &&
      safe.security?.authorization_enforced === true,
    persistence_valid:
      isPlainObject(safe.persistence) &&
      safe.persistence?.legacy_browser_storage_authoritative === true &&
      safe.persistence?.operational_read_cutover_enabled === false &&
      safe.persistence?.operational_write_cutover_enabled === false &&
      safe.persistence?.automatic_synchronisation_enabled === false,
    operations_valid:
      isPlainObject(safe.operations) &&
      safe.operations?.diagnostic_only === true &&
      safe.operations?.manual_history_retrieval_only === true &&
      safe.operations?.automatic_polling_enabled === false &&
      safe.operations?.recurring_timer_enabled === false &&
      safe.operations?.external_telemetry_export_enabled === false &&
      safe.operations?.automatic_incident_creation_enabled === false &&
      safe.operations?.automatic_alert_dispatch_enabled === false &&
      safe.operations?.automatic_remediation_enabled === false &&
      safe.operations?.automatic_recovery_enabled === false &&
      safe.operations?.automatic_restart_enabled === false &&
      safe.operations?.shell_execution_enabled === false &&
      safe.operations?.child_process_execution_enabled === false &&
      safe.operations?.outbound_network_check_enabled === false &&
      safe.operations?.environment_file_write_enabled === false,
    forbidden_content_absent: collectForbiddenTokens(safe).length === 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operations history report check failed: ${key}`);
    }
  });

  recordValidations.forEach((result, index) => {
    if (result.valid !== true) {
      errors.push(
        result.errors?.[0] ??
          `Operations history record validation failed at index ${index}.`
      );
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_OPERATIONS_HISTORY_REPORT_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      target_environment: String(safe.target_environment ?? "").trim().toUpperCase(),
      total_records: toSafeInteger(safe.total_records),
      returned_records: toSafeInteger(safe.returned_records),
      oldest_snapshot_at: normalizeIso(safe.oldest_snapshot_at) ?? null,
      newest_snapshot_at: normalizeIso(safe.newest_snapshot_at) ?? null,
      durable_store_ready: safe.durable_store_ready === true,
      append_only: safe.append_only === true,
      records: recordValidations.map((entry) => entry.normalized),
      security: isPlainObject(safe.security) ? { ...safe.security } : {},
      persistence: isPlainObject(safe.persistence) ? { ...safe.persistence } : {},
      operations: isPlainObject(safe.operations) ? { ...safe.operations } : {},
      summary: isPlainObject(safe.summary) ? { ...safe.summary } : {},
    },
  };
}

export function validatePipOperationsTrendReport(report) {
  const safe = isPlainObject(report) ? report : {};

  const checks = {
    schema_valid: safe.schema === PIP_OPERATIONS_TREND_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" &&
      safe.target_environment.trim().length > 0,
    baseline_snapshot_id_valid:
      typeof safe.baseline_snapshot_id === "string" &&
      safe.baseline_snapshot_id.trim().length > 0,
    current_snapshot_id_valid:
      typeof safe.current_snapshot_id === "string" &&
      safe.current_snapshot_id.trim().length > 0,
    baseline_accepted_at_valid: normalizeIso(safe.baseline_accepted_at) !== null,
    current_accepted_at_valid: normalizeIso(safe.current_accepted_at) !== null,
    baseline_status_valid:
      typeof safe.baseline_status === "string" &&
      safe.baseline_status.trim().length > 0,
    current_status_valid:
      typeof safe.current_status === "string" &&
      safe.current_status.trim().length > 0,
    status_transition_valid:
      typeof safe.status_transition === "string" &&
      safe.status_transition.trim().length > 0,
    direction_valid: isEnumMember(safe.direction, PIP_OPERATIONS_TREND_DIRECTIONS),
    counter_reset_detected_valid: typeof safe.counter_reset_detected === "boolean",
    metric_deltas_valid: isPlainObject(safe.metric_deltas),
    rate_changes_valid: isPlainObject(safe.rate_changes),
    checks_valid:
      Array.isArray(safe.checks) && safe.checks.every(validateTrendCheckEntry),
    summary_valid: isPlainObject(safe.summary),
    forbidden_content_absent: collectForbiddenTokens(safe).length === 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Operations trend report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_OPERATIONS_TREND_REPORT_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      target_environment: String(safe.target_environment ?? "").trim().toUpperCase(),
      baseline_snapshot_id: String(safe.baseline_snapshot_id ?? "").trim(),
      current_snapshot_id: String(safe.current_snapshot_id ?? "").trim(),
      baseline_accepted_at:
        normalizeIso(safe.baseline_accepted_at) ?? new Date().toISOString(),
      current_accepted_at:
        normalizeIso(safe.current_accepted_at) ?? new Date().toISOString(),
      baseline_status: String(safe.baseline_status ?? "").trim().toUpperCase(),
      current_status: String(safe.current_status ?? "").trim().toUpperCase(),
      status_transition: String(safe.status_transition ?? "").trim().toUpperCase(),
      direction: String(safe.direction ?? "").trim().toUpperCase(),
      counter_reset_detected: safe.counter_reset_detected === true,
      metric_deltas: isPlainObject(safe.metric_deltas) ? { ...safe.metric_deltas } : {},
      rate_changes: isPlainObject(safe.rate_changes) ? { ...safe.rate_changes } : {},
      checks: Array.isArray(safe.checks) ? safe.checks.map((entry) => ({ ...entry })) : [],
      summary: isPlainObject(safe.summary) ? { ...safe.summary } : {},
    },
  };
}

export function validatePipIncidentTimelineReport(report) {
  const safe = isPlainObject(report) ? report : {};

  const checks = {
    schema_valid: safe.schema === PIP_INCIDENT_TIMELINE_REPORT_SCHEMA,
    generated_at_valid: normalizeIso(safe.generated_at) !== null,
    target_environment_valid:
      typeof safe.target_environment === "string" &&
      safe.target_environment.trim().length > 0,
    requested_limit_valid:
      Number.isInteger(Number(safe.requested_limit)) && Number(safe.requested_limit) > 0,
    returned_items_valid:
      Number.isInteger(Number(safe.returned_items)) && Number(safe.returned_items) >= 0,
    filters_valid: isPlainObject(safe.filters),
    source_filter_valid:
      String(safe.filters?.source ?? "ALL") === "ALL" ||
      isEnumMember(safe.filters?.source, PIP_INCIDENT_TIMELINE_SOURCES),
    severity_filter_valid:
      String(safe.filters?.severity ?? "ALL") === "ALL" ||
      isEnumMember(safe.filters?.severity, PIP_INCIDENT_TIMELINE_SEVERITIES),
    items_valid:
      Array.isArray(safe.items) && safe.items.every(validateTimelineItem),
    summary_valid: isPlainObject(safe.summary),
    security_valid:
      isPlainObject(safe.security) &&
      safe.security?.authentication_configured === true &&
      safe.security?.authentication_required === true &&
      safe.security?.roles_configured === true &&
      safe.security?.authorization_enforced === true &&
      safe.security?.user_identity_values_redacted === true &&
      safe.security?.request_content_excluded === true,
    operations_valid:
      isPlainObject(safe.operations) &&
      safe.operations?.diagnostic_only === true &&
      safe.operations?.manual_history_retrieval_only === true &&
      safe.operations?.automatic_incident_creation_enabled === false &&
      safe.operations?.automatic_alert_dispatch_enabled === false,
    forbidden_content_absent: collectForbiddenTokens(safe).length === 0,
  };

  const errors = [];
  Object.entries(checks).forEach(([key, passed]) => {
    if (passed !== true) {
      errors.push(`Incident timeline report check failed: ${key}`);
    }
  });

  return {
    valid: errors.length === 0,
    checks,
    errors,
    normalized: {
      ...safe,
      schema: PIP_INCIDENT_TIMELINE_REPORT_SCHEMA,
      generated_at: normalizeIso(safe.generated_at) ?? new Date().toISOString(),
      target_environment: String(safe.target_environment ?? "").trim().toUpperCase(),
      requested_limit: toSafeInteger(safe.requested_limit),
      returned_items: toSafeInteger(safe.returned_items),
      filters: {
        source: String(safe.filters?.source ?? "ALL").trim().toUpperCase() || "ALL",
        severity:
          String(safe.filters?.severity ?? "ALL").trim().toUpperCase() || "ALL",
      },
      items: Array.isArray(safe.items)
        ? safe.items.map((item) => ({
            event_id: String(item?.event_id ?? "").trim(),
            occurred_at: normalizeIso(item?.occurred_at) ?? new Date().toISOString(),
            source: String(item?.source ?? "CENTRAL_AUDIT").trim().toUpperCase(),
            event_type: String(item?.event_type ?? "UNKNOWN_EVENT").trim().toUpperCase(),
            severity: String(item?.severity ?? "INFO").trim().toUpperCase(),
            status: String(item?.status ?? "UNKNOWN").trim().toUpperCase(),
            safe_summary: String(item?.safe_summary ?? "").trim(),
            snapshot_id:
              typeof item?.snapshot_id === "string"
                ? String(item.snapshot_id).trim()
                : null,
          }))
        : [],
      summary: isPlainObject(safe.summary) ? { ...safe.summary } : {},
      security: isPlainObject(safe.security) ? { ...safe.security } : {},
      operations: isPlainObject(safe.operations) ? { ...safe.operations } : {},
    },
  };
}
