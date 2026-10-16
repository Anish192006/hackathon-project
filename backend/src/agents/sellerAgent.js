import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const FALLBACK_MODEL = "gemini-3.6-flash";
const MAX_GEMINI_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1000];

const mockResponses = {
  research:
    "Research task received. Identify reliable sources and verify facts.",
  data:
    "Data analysis task received. Identify trends and validate findings.",
  writing:
    "Writing task received. Prepare a clear, useful summary.",
};

function isTemporaryError(error) {
  const status = Number(
    error?.status ?? error?.statusCode ?? 0
  );

  const message = String(error?.message ?? "");

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|temporarily unavailable|ECONNRESET/i.test(
      message
    )
  );
}

async function generateWithRetry(ai, prompt) {
  let lastError;

  for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }

    const model = attempt === 0 ? config.geminiModel : FALLBACK_MODEL;

    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.4,
          maxOutputTokens: 600,
        },
      });
    } catch (error) {
      lastError = error;

      if (
        !isTemporaryError(error) ||
        attempt === MAX_GEMINI_ATTEMPTS - 1
      ) {
        throw error;
      }

      console.warn(
        `Gemini request attempt ${attempt + 1}/${MAX_GEMINI_ATTEMPTS} failed temporarily. ` +
          `Retrying in ${RETRY_DELAYS_MS[attempt]} ms.`
      );
    }
  }

  throw lastError;
}

export async function runSellerAgent(agent, task) {
  if (config.aiMode !== "gemini") {
    return {
      text: [
        `Demo result from ${agent.name}`,
        "",
        `Task: ${task}`,
        "",
        mockResponses[agent.capability] ??
          "Task received. Prepare a suitable response.",
        "",
        "This is a simulated response.",
      ].join("\n"),
    };
  }

  if (!config.geminiApiKey) {
    const error = new Error(
      "Gemini API key is missing in backend configuration."
    );
    error.status = 500;
    throw error;
  }

  const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: {
      // Keep retries in this module so the total request count is bounded.
      retryOptions: { attempts: 1 },
    },
  });

  const prompt = `
You are ${agent.name}, an AI service in AgentPay.

Your capability is ${agent.capability}.

Complete the user's task accurately.
Do not claim to have inspected files or data that were not provided.
Explain when more information is needed.

User task:
${task}
`;

  try {
    const response = await generateWithRetry(ai, prompt);

    const text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return { text };
  } catch (cause) {
    const temporarilyUnavailable = isTemporaryError(cause);
    const upstreamStatus = Number(cause?.status ?? cause?.statusCode);

    console.error(
      `Gemini request failed after at most ${MAX_GEMINI_ATTEMPTS} attempt(s)` +
        (Number.isInteger(upstreamStatus) && upstreamStatus > 0
          ? ` (upstream HTTP ${upstreamStatus}).`
          : ".")
    );

    const error = new Error(
      temporarilyUnavailable
        ? `Gemini is temporarily unavailable after ${MAX_GEMINI_ATTEMPTS} attempts. Please try again shortly.`
        : "Gemini could not complete the request. Check the model and backend configuration."
    );

    error.status = temporarilyUnavailable ? 503 : 502;
    error.publicMessage = error.message;
    throw error;
  }
}
