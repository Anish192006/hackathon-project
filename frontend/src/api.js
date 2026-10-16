
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot connect to ${API_BASE_URL}. Check whether the backend is running and CORS is configured.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error("The backend returned invalid JSON.");
    }
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object"
        ? data.error || data.message || data.details
        : null;

    throw new Error(
      message
        ? `${response.status}: ${message}`
        : `Request failed with HTTP ${response.status}.`
    );
  }

  return data;
}

// GET /api/health
export function getHealth() {
  return requestJson("/api/health");
}

// GET /api/agents
export function getAgents() {
  return requestJson("/api/agents");
}

// POST /api/tasks
export function createTask({ agentId, task, maxBudget }) {
  return requestJson("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      task,
      maxBudget: String(maxBudget),
    }),
  });
}

export { API_BASE_URL };
