import express from "express";
import cors from "cors";
import { config } from "./config.js";
import agentsRouter from "./routes/agents.js";
import tasksRouter from "./routes/tasks.js";

const app = express();

// Allow requests from our frontend.
app.use(
  cors({
    origin: config.frontendOrigin,
  })
);

// Parse JSON request bodies.
app.use(express.json({ limit: "100kb" }));

// Health check.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "agentpay-api",
    message: "AgentPay backend is running!",
  });
});

// API routes.
app.use("/api/agents", agentsRouter);
app.use("/api/tasks", tasksRouter);

// Handle errors in JSON format.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status)
    ? error.status
    : 500;

  console.error("[AgentPay API error]", error.message);

  res.status(status).json({
    error: {
      message:
        status < 500
          ? error.message
          : error.publicMessage ??
            "Request failed. Check the backend terminal.",
    },
  });
});

// Start the server.
app.listen(config.port, () => {
  console.log(
    `AgentPay backend running at http://localhost:${config.port}`
  );
  console.log(`AI mode: ${config.aiMode}`);
  console.log(`Payment mode: ${config.paymentMode}`);
});
