import { Router } from "express";
import { randomUUID } from "node:crypto";
import { executeBuyerTask } from "../agents/buyerAgent.js";

const router = Router();
const taskHistory = [];

router.get("/", (req, res) => {
  res.json({ tasks: taskHistory });
});

router.post("/", async (req, res, next) => {
  try {
    const { agentId, task, maxBudget } = req.body ?? {};

    if (
      typeof task !== "string" ||
      !task.trim() ||
      task.length > 5000
    ) {
      return res.status(400).json({
        error: {
          message: "Enter a task between 1 and 5000 characters.",
        },
      });
    }

    if (typeof agentId !== "string") {
      return res.status(400).json({
        error: { message: "A valid agentId is required." },
      });
    }

    const { agent, result } = await executeBuyerTask({
      agentId,
      task: task.trim(),
      maxBudget,
    });

    const record = {
      requestId: `REQ-${randomUUID()}`,
      status: "completed",
      agent: {
        id: agent.id,
        name: agent.name,
      },
      payment: {
        mode: "mock",
        status: "simulated",
        amount: agent.price,
        currency: agent.currency,
      },
      result,
    };

    taskHistory.unshift(record);

    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
});

export default router;