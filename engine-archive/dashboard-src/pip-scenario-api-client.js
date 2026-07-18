import {
  PIP_SCENARIO_API_DEFAULT_BASE_URL,
  PIP_SCENARIO_API_ERROR_SCHEMA,
  PIP_SCENARIO_API_RESPONSE_SCHEMA,
  validatePipScenarioApiCreatePayload,
  validatePipScenarioApiPatchPayload,
} from "./pip-scenario-api-contract.js";
import {
  validatePipScenarioCollectionCreatePayload,
  validatePipScenarioCollectionPatchPayload,
} from "./pip-central-storage-contract.js";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl ?? "").trim();
  const fallback = PIP_SCENARIO_API_DEFAULT_BASE_URL;
  const selected = raw.length > 0 ? raw : fallback;
  return selected.replace(/\/+$/, "");
}

function normalizeScenarioId(scenarioId) {
  const value = String(scenarioId ?? "").trim();
  if (!value) {
    throw new Error("Scenario id is required.");
  }
  return encodeURIComponent(value);
}

function normalizeCollectionId(collectionId) {
  const value = String(collectionId ?? "").trim();
  if (!value) {
    throw new Error("Collection id is required.");
  }
  return encodeURIComponent(value);
}

function makeRequestError(message, details = {}) {
  const error = new Error(message);
  error.status = Number(details.status ?? 0);
  error.code = String(details.code ?? "REQUEST_FAILED");
  error.request_id = details.request_id ?? null;
  error.details = details.details ?? null;
  error.etag = details.etag ?? null;
  return error;
}

async function parseJsonResponse(response) {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw makeRequestError("Malformed JSON response.", {
      status: response.status,
      code: "MALFORMED_RESPONSE_JSON",
      request_id:
        response.headers.get("x-pip-request-id") ?? null,
      details: { raw_text: rawText.slice(0, 200) },
      etag: response.headers.get("etag") ?? null,
    });
  }
}

function parseSuccessEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeRequestError("Malformed success envelope.", {
      status: response.status,
      code: "MALFORMED_SUCCESS_ENVELOPE",
      request_id:
        response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
      etag: response.headers.get("etag") ?? null,
    });
  }

  const valid =
    payload.schema === PIP_SCENARIO_API_RESPONSE_SCHEMA &&
    payload.success === true &&
    typeof payload.request_id === "string" &&
    payload.request_id.length > 0 &&
    typeof payload.generated_at === "string";

  if (!valid) {
    throw makeRequestError("Malformed success envelope.", {
      status: response.status,
      code: "INVALID_SUCCESS_ENVELOPE",
      request_id:
        payload.request_id ??
        response.headers.get("x-pip-request-id") ??
        null,
      details: { endpoint, envelope: payload },
      etag: response.headers.get("etag") ?? null,
    });
  }

  return {
    data: payload.data,
    meta: isPlainObject(payload.meta) ? payload.meta : {},
    request_id: payload.request_id,
    generated_at: payload.generated_at,
    etag: response.headers.get("etag") ?? null,
    status: response.status,
  };
}

function parseErrorEnvelope(payload, response, endpoint) {
  if (!isPlainObject(payload)) {
    throw makeRequestError("Malformed error envelope.", {
      status: response.status,
      code: "MALFORMED_ERROR_ENVELOPE",
      request_id:
        response.headers.get("x-pip-request-id") ?? null,
      details: { endpoint },
      etag: response.headers.get("etag") ?? null,
    });
  }

  const hasEnvelope =
    payload.schema === PIP_SCENARIO_API_ERROR_SCHEMA &&
    payload.success === false &&
    typeof payload.request_id === "string" &&
    payload.request_id.length > 0 &&
    isPlainObject(payload.error) &&
    typeof payload.error.code === "string";

  if (!hasEnvelope) {
    throw makeRequestError("Malformed error envelope.", {
      status: response.status,
      code: "INVALID_ERROR_ENVELOPE",
      request_id:
        payload.request_id ??
        response.headers.get("x-pip-request-id") ??
        null,
      details: { endpoint, envelope: payload },
      etag: response.headers.get("etag") ?? null,
    });
  }

  throw makeRequestError(
    String(payload.error.message ?? "API request failed."),
    {
      status: response.status,
      code: payload.error.code,
      request_id: payload.request_id,
      details: payload.error.details ?? null,
      etag: response.headers.get("etag") ?? null,
    }
  );
}

function withTimeout(fetchImpl, request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    credentials: request.credentials,
    signal: controller.signal,
  })
    .catch((error) => {
      if (error?.name === "AbortError") {
        throw makeRequestError("API request timed out.", {
          status: 0,
          code: "REQUEST_TIMEOUT",
          request_id: null,
          details: {
            endpoint: request.endpoint,
            timeout_ms: timeoutMs,
          },
          etag: null,
        });
      }

      throw makeRequestError("API connection failed.", {
        status: 0,
        code: "CONNECTION_FAILED",
        request_id: null,
        details: {
          endpoint: request.endpoint,
          reason: String(error?.message ?? error),
        },
        etag: null,
      });
    })
    .finally(() => {
      clearTimeout(timer);
    });
}

export function createPipScenarioApiClient({
  baseUrl,
  fetchImpl,
  timeoutMs,
  getCsrfToken,
  getAuthorizationSnapshot,
  onAuthenticationRequired,
  onAuthorizationDenied,
} = {}) {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const resolvedFetch =
    fetchImpl ??
    (typeof globalThis !== "undefined" ? globalThis.fetch : null);

  if (typeof resolvedFetch !== "function") {
    throw new Error(
      "PIP scenario API client requires a fetch implementation."
    );
  }

  const resolvedTimeoutMs =
    Number.isFinite(timeoutMs) && Number(timeoutMs) > 0
      ? Number(timeoutMs)
      : 5000;

  const request = async ({
    method,
    endpoint,
    query,
    body,
    etag,
    requiresCsrf = false,
  }) => {
    const url = new URL(`${resolvedBaseUrl}${endpoint}`);

    if (isPlainObject(query)) {
      Object.entries(query).forEach(([key, value]) => {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }

        url.searchParams.set(key, String(value));
      });
    }

    const headers = {
      Accept: "application/json",
    };

    let bodyText;

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyText = JSON.stringify(body);
    }

    if (etag !== undefined) {
      const ifMatch = String(etag ?? "").trim();
      if (!ifMatch) {
        throw makeRequestError("If-Match is required.", {
          status: 0,
          code: "MISSING_IF_MATCH",
          request_id: null,
          details: { endpoint },
          etag: null,
        });
      }
      headers["If-Match"] = ifMatch;
    }

    if (requiresCsrf === true) {
      const csrfToken =
        typeof getCsrfToken === "function"
          ? String(getCsrfToken() ?? "").trim()
          : "";

      if (!csrfToken) {
        throw makeRequestError("CSRF token is required for this request.", {
          status: 0,
          code: "MISSING_CSRF_TOKEN",
          request_id: null,
          details: { endpoint },
          etag: null,
        });
      }

      headers["X-PIP-CSRF"] = csrfToken;
    }

    // Snapshot is available for UI context but is never sent to the API.
    if (typeof getAuthorizationSnapshot === "function") {
      getAuthorizationSnapshot();
    }

    const response = await withTimeout(
      resolvedFetch,
      {
        url: url.toString(),
        method,
        headers,
        body: bodyText,
        credentials: "include",
        endpoint,
      },
      resolvedTimeoutMs
    );

    let parsed;
    try {
      parsed = await parseJsonResponse(response);
    } catch (error) {
      if (Number(error?.status) === 401) {
        if (typeof onAuthenticationRequired === "function") {
          onAuthenticationRequired({
            status: 401,
            code: "AUTHENTICATION_REQUIRED",
            endpoint,
          });
        }
      }
      throw error;
    }

    if (response.ok) {
      return parseSuccessEnvelope(parsed, response, endpoint);
    }

    try {
      return parseErrorEnvelope(parsed, response, endpoint);
    } catch (error) {
      const status = Number(error?.status ?? response.status ?? 0);
      if (
        status === 401 ||
        String(error?.code ?? "") === "AUTHENTICATION_REQUIRED"
      ) {
        if (typeof onAuthenticationRequired === "function") {
          onAuthenticationRequired({
            status,
            code: String(error?.code ?? "AUTHENTICATION_REQUIRED"),
            endpoint,
            details: error?.details ?? null,
          });
        }
      }

      if (
        status === 403 &&
        String(error?.code ?? "") === "AUTHORIZATION_DENIED"
      ) {
        if (typeof onAuthorizationDenied === "function") {
          onAuthorizationDenied({
            status,
            code: "AUTHORIZATION_DENIED",
            endpoint,
            message: String(
              error?.message ??
                "You do not have permission to perform this operation."
            ),
            details: error?.details ?? null,
          });
        }

        throw makeRequestError(
          String(
            error?.message ??
              "You do not have permission to perform this operation."
          ),
          {
            status,
            code: "AUTHORIZATION_DENIED",
            request_id: error?.request_id ?? null,
            details: error?.details ?? null,
            etag: error?.etag ?? null,
          }
        );
      }

      throw error;
    }
  };

  return {
    async checkHealth() {
      return request({ method: "GET", endpoint: "/health" });
    },

    async listScenarios(query = {}) {
      return request({
        method: "GET",
        endpoint: "/scenarios",
        query,
      });
    },

    async createScenario(payload) {
      const validation = validatePipScenarioApiCreatePayload(payload);

      if (validation.valid !== true) {
        throw makeRequestError(
          validation.errors?.[0] ?? "Create payload is invalid.",
          {
            status: 0,
            code: "INVALID_CREATE_PAYLOAD",
            request_id: null,
            details: { errors: validation.errors ?? [] },
            etag: null,
          }
        );
      }

      return request({
        method: "POST",
        endpoint: "/scenarios",
        body: validation.normalized,
        requiresCsrf: true,
      });
    },

    async readScenario(scenarioId) {
      return request({
        method: "GET",
        endpoint: `/scenarios/${normalizeScenarioId(scenarioId)}`,
      });
    },

    async replaceScenario(scenarioId, payload, etag) {
      const validation = validatePipScenarioApiCreatePayload(payload);
      if (validation.valid !== true) {
        throw makeRequestError(
          validation.errors?.[0] ?? "Replace payload is invalid.",
          {
            status: 0,
            code: "INVALID_REPLACE_PAYLOAD",
            request_id: null,
            details: { errors: validation.errors ?? [] },
            etag: null,
          }
        );
      }

      return request({
        method: "PUT",
        endpoint: `/scenarios/${normalizeScenarioId(scenarioId)}`,
        body: validation.normalized,
        etag,
        requiresCsrf: true,
      });
    },

    async patchScenario(scenarioId, payload, etag) {
      const validation = validatePipScenarioApiPatchPayload(payload);
      if (validation.valid !== true) {
        throw makeRequestError(
          validation.errors?.[0] ?? "Patch payload is invalid.",
          {
            status: 0,
            code: "INVALID_PATCH_PAYLOAD",
            request_id: null,
            details: { errors: validation.errors ?? [] },
            etag: null,
          }
        );
      }

      return request({
        method: "PATCH",
        endpoint: `/scenarios/${normalizeScenarioId(scenarioId)}`,
        body: validation.normalized,
        etag,
        requiresCsrf: true,
      });
    },

    async deleteScenario(scenarioId, etag) {
      return request({
        method: "DELETE",
        endpoint: `/scenarios/${normalizeScenarioId(scenarioId)}`,
        etag,
        requiresCsrf: true,
      });
    },

    async listCollections(query = {}) {
      return request({
        method: "GET",
        endpoint: "/collections",
        query,
      });
    },

    async createCollection(payload) {
      const validation =
        validatePipScenarioCollectionCreatePayload(payload);

      if (validation.valid !== true) {
        throw makeRequestError(
          validation.errors?.[0] ??
            "Collection create payload is invalid.",
          {
            status: 0,
            code: "INVALID_COLLECTION_CREATE_PAYLOAD",
            request_id: null,
            details: { errors: validation.errors ?? [] },
            etag: null,
          }
        );
      }

      return request({
        method: "POST",
        endpoint: "/collections",
        body: validation.normalized,
        requiresCsrf: true,
      });
    },

    async readCollection(collectionId) {
      return request({
        method: "GET",
        endpoint: `/collections/${normalizeCollectionId(collectionId)}`,
      });
    },

    async replaceCollection(collectionId, payload, etag) {
      const validation =
        validatePipScenarioCollectionCreatePayload(payload);

      if (validation.valid !== true) {
        throw makeRequestError(
          validation.errors?.[0] ??
            "Collection replace payload is invalid.",
          {
            status: 0,
            code: "INVALID_COLLECTION_REPLACE_PAYLOAD",
            request_id: null,
            details: { errors: validation.errors ?? [] },
            etag: null,
          }
        );
      }

      return request({
        method: "PUT",
        endpoint: `/collections/${normalizeCollectionId(collectionId)}`,
        body: validation.normalized,
        etag,
        requiresCsrf: true,
      });
    },

    async patchCollection(collectionId, payload, etag) {
      const validation =
        validatePipScenarioCollectionPatchPayload(payload);

      if (validation.valid !== true) {
        throw makeRequestError(
          validation.errors?.[0] ??
            "Collection patch payload is invalid.",
          {
            status: 0,
            code: "INVALID_COLLECTION_PATCH_PAYLOAD",
            request_id: null,
            details: { errors: validation.errors ?? [] },
            etag: null,
          }
        );
      }

      return request({
        method: "PATCH",
        endpoint: `/collections/${normalizeCollectionId(collectionId)}`,
        body: validation.normalized,
        etag,
        requiresCsrf: true,
      });
    },

    async deleteCollection(collectionId, etag) {
      return request({
        method: "DELETE",
        endpoint: `/collections/${normalizeCollectionId(collectionId)}`,
        etag,
        requiresCsrf: true,
      });
    },
  };
}

export async function preparePipCentralStorageDurabilityFixture({
  client,
  constituencyKey = "p134",
  parliamentCode = "P134",
} = {}) {
  if (!client || typeof client.createScenario !== "function") {
    throw new Error("Durability fixture requires a valid API client.");
  }

  const now = Date.now();
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${now}`;

  const scenarioId = `batch52b-durable-scenario-${suffix}`;
  const collectionId = `batch52b-durable-collection-${suffix}`;

  const scenarioResult = await client.createScenario({
    id: scenarioId,
    constituency_key: constituencyKey,
    parliament_code: parliamentCode,
    name: "Batch 52B Durability Scenario",
    locality_keys: ["P134-L001", "P134-L002"],
    description: "Durability fixture scenario for restart verification.",
    operational_notes:
      "Created by preparePipCentralStorageDurabilityFixture.",
    owner: "PIP API Durability",
    workflow_status: "DRAFT",
    review_date: null,
    tags: ["batch-52b", "durable"],
    pinned: false,
    source_legacy_id: null,
    acceptance_fixture: true,
    metadata: {
      batch: "52B",
      fixture: "DURABILITY",
    },
  });

  const collectionResult = await client.createCollection({
    id: collectionId,
    constituency_key: constituencyKey,
    parliament_code: parliamentCode,
    name: "Batch 52B Durability Collection",
    description:
      "Durability fixture collection referencing the fixture scenario.",
    scenario_ids: [scenarioId],
    tags: ["batch-52b", "durable"],
    pinned: false,
    acceptance_fixture: true,
    metadata: {
      batch: "52B",
      fixture: "DURABILITY",
    },
  });

  const healthResult = await client.checkHealth();

  return {
    prepared: true,
    scenario_id: scenarioId,
    scenario_etag: scenarioResult.etag,
    collection_id: collectionId,
    collection_etag: collectionResult.etag,
    request_ids: [
      scenarioResult.request_id,
      collectionResult.request_id,
      healthResult.request_id,
    ].filter(Boolean),
    health: healthResult.data ?? null,
    prepared_at: new Date().toISOString(),
  };
}

export async function verifyPipCentralStorageDurabilityFixture({
  client,
  fixture,
} = {}) {
  if (!client || typeof client.readScenario !== "function") {
    throw new Error("Durability verification requires a valid API client.");
  }

  if (!fixture || !fixture.scenario_id || !fixture.collection_id) {
    throw new Error("Durability verification requires fixture identifiers.");
  }

  const scenarioResult = await client.readScenario(fixture.scenario_id);
  const collectionResult = await client.readCollection(
    fixture.collection_id
  );
  const includeDeletedScenarios = await client.listScenarios({
    include_deleted: true,
    limit: 100,
  });
  const includeDeletedCollections = await client.listCollections({
    include_deleted: true,
    limit: 100,
  });
  const healthResult = await client.checkHealth();

  const scenarioIds = Array.isArray(includeDeletedScenarios?.data?.items)
    ? includeDeletedScenarios.data.items.map((entry) => String(entry?.id ?? ""))
    : [];

  const collectionIds = Array.isArray(includeDeletedCollections?.data?.items)
    ? includeDeletedCollections.data.items.map((entry) => String(entry?.id ?? ""))
    : [];

  const passed =
    String(scenarioResult?.data?.id ?? "") === fixture.scenario_id &&
    String(collectionResult?.data?.id ?? "") === fixture.collection_id &&
    scenarioIds.includes(fixture.scenario_id) &&
    collectionIds.includes(fixture.collection_id) &&
    healthResult?.data?.status === "READY" &&
    healthResult?.data?.storage_mode === "DURABLE_FILE" &&
    healthResult?.data?.central_persistence_enabled === true;

  return {
    passed,
    scenario_present: scenarioIds.includes(fixture.scenario_id),
    collection_present: collectionIds.includes(fixture.collection_id),
    scenario_record: scenarioResult.data ?? null,
    collection_record: collectionResult.data ?? null,
    health: healthResult.data ?? null,
    request_ids: [
      scenarioResult.request_id,
      collectionResult.request_id,
      includeDeletedScenarios.request_id,
      includeDeletedCollections.request_id,
      healthResult.request_id,
    ].filter(Boolean),
    verified_at: new Date().toISOString(),
  };
}

export async function cleanupPipCentralStorageDurabilityFixture({
  client,
  fixture,
} = {}) {
  if (!client || typeof client.readScenario !== "function") {
    throw new Error("Durability cleanup requires a valid API client.");
  }

  if (!fixture || !fixture.scenario_id || !fixture.collection_id) {
    return {
      cleaned: false,
      reason: "Missing durability fixture identifiers.",
      request_ids: [],
    };
  }

  const requestIds = [];
  const errors = [];

  try {
    const currentCollection = await client.readCollection(
      fixture.collection_id
    );
    requestIds.push(currentCollection.request_id);

    const deletedCollection = await client.deleteCollection(
      fixture.collection_id,
      currentCollection.etag
    );
    requestIds.push(deletedCollection.request_id);
  } catch (error) {
    if (Number(error?.status) !== 404) {
      errors.push(String(error?.message ?? error));
    }
  }

  try {
    const currentScenario = await client.readScenario(fixture.scenario_id);
    requestIds.push(currentScenario.request_id);

    const deletedScenario = await client.deleteScenario(
      fixture.scenario_id,
      currentScenario.etag
    );
    requestIds.push(deletedScenario.request_id);
  } catch (error) {
    if (Number(error?.status) !== 404) {
      errors.push(String(error?.message ?? error));
    }
  }

  return {
    cleaned: errors.length === 0,
    request_ids: requestIds,
    errors,
    cleaned_at: new Date().toISOString(),
  };
}

export async function runPipScenarioApiCrudAcceptance({
  client,
  scenarioPayload,
}) {
  const startedAt = new Date().toISOString();
  const requestIds = [];
  const stages = {
    health: "pending",
    create: "pending",
    read: "pending",
    patch: "pending",
    stale_patch: "pending",
    delete: "pending",
  };

  const report = {
    passed: false,
    health: null,
    stages,
    created_record: null,
    updated_record: null,
    deleted_record: null,
    stale_revision_rejected: false,
    soft_delete_verified: false,
    request_ids: requestIds,
    started_at: startedAt,
    completed_at: null,
    errors: [],
  };

  if (!client || typeof client.checkHealth !== "function") {
    report.errors.push("CRUD acceptance requires a valid API client.");
    report.completed_at = new Date().toISOString();
    return report;
  }

  try {
    const healthResult = await client.checkHealth();
    report.health = healthResult?.data ?? null;
    requestIds.push(healthResult?.request_id ?? null);
    stages.health = "passed";

    const createResult = await client.createScenario(scenarioPayload);
    report.created_record = createResult?.data ?? null;
    requestIds.push(createResult?.request_id ?? null);
    stages.create = "passed";

    const createdId = report.created_record?.id;
    const createdEtag = createResult?.etag;

    const readResult = await client.readScenario(createdId);
    requestIds.push(readResult?.request_id ?? null);
    stages.read = "passed";

    const patchResult = await client.patchScenario(
      createdId,
      {
        name: "Batch 52A CRUD Acceptance Updated",
        workflow_status: "UNDER_REVIEW",
      },
      readResult.etag
    );

    report.updated_record = patchResult?.data ?? null;
    requestIds.push(patchResult?.request_id ?? null);
    stages.patch = "passed";

    try {
      await client.patchScenario(
        createdId,
        {
          name: "Batch 52A stale patch",
        },
        createdEtag
      );
      stages.stale_patch = "failed";
      report.errors.push(
        "Stale patch unexpectedly succeeded."
      );
    } catch (error) {
      if (Number(error?.status) === 412) {
        stages.stale_patch = "passed";
        report.stale_revision_rejected = true;
      } else {
        stages.stale_patch = "failed";
        report.errors.push(
          `Unexpected stale patch result: ${String(
            error?.message ?? error
          )}`
        );
      }
    }

    const deleteResult = await client.deleteScenario(
      createdId,
      patchResult.etag
    );

    report.deleted_record = deleteResult?.data ?? null;
    requestIds.push(deleteResult?.request_id ?? null);
    stages.delete = "passed";

    let deletedRead404 = false;
    try {
      await client.readScenario(createdId);
    } catch (error) {
      deletedRead404 = Number(error?.status) === 404;
    }

    const includeDeletedResult = await client.listScenarios({
      include_deleted: true,
      limit: 100,
    });

    requestIds.push(includeDeletedResult?.request_id ?? null);

    const includeDeletedItems = Array.isArray(
      includeDeletedResult?.data?.items
    )
      ? includeDeletedResult.data.items
      : [];

    const deletedInList = includeDeletedItems.some(
      (entry) => String(entry?.id ?? "") === String(createdId)
    );

    report.soft_delete_verified =
      deletedRead404 &&
      deletedInList &&
      typeof report.deleted_record?.deleted_at === "string";

    report.passed =
      stages.health === "passed" &&
      stages.create === "passed" &&
      stages.read === "passed" &&
      stages.patch === "passed" &&
      report.stale_revision_rejected === true &&
      report.soft_delete_verified === true;
  } catch (error) {
    report.errors.push(String(error?.message ?? error));
  }

  report.completed_at = new Date().toISOString();
  return report;
}
