import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 4000),

  frontendOrigin:
    process.env.FRONTEND_ORIGIN || "http://localhost:5173",

  aiMode: process.env.AI_MODE || "mock",

  paymentMode: process.env.PAYMENT_MODE || "mock",

  geminiApiKey: process.env.GEMINI_API_KEY,

  geminiModel:
    process.env.GEMINI_MODEL || "gemini-flash-latest",
};