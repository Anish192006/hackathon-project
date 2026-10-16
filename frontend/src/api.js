
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "");

// Check whether the backend is responding.
export async function getHealth() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error(
      `Cannot connect to backend at ${API_BASE_URL}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Backend health check failed: ${response.status}`
    );
  }

  return response.json();
}

// Fetch the available agents from the backend.
export async function getAgents() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/agents`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    throw new Error("Unable to connect to the agents endpoint.");
  }

  if (!response.ok) {
    throw new Error(
      `Failed to load agents: ${response.status}`
    );
  }

  return response.json();
}
