import { agents } from "../routes/agents.js";
import { runSellerAgent } from "./sellerAgent.js";

export async function executeBuyerTask({
  agentId,
  task,
  maxBudget,
}) {
  const agent = agents.find((item) => item.id === agentId);

  if (!agent) {
    const error = new Error("Agent not found.");
    error.status = 404;
    throw error;
  }

  const budgetText = String(maxBudget ?? "");

  if (!/^\d+(\.\d{1,6})?$/.test(budgetText)) {
    const error = new Error("Enter a valid budget.");
    error.status = 400;
    throw error;
  }

  const budget = Math.round(Number(budgetText) * 1_000_000);
  const price = Math.round(Number(agent.price) * 1_000_000);

  if (budget < price) {
    const error = new Error(
      `Budget too low. This agent costs ${agent.price} ${agent.currency}.`
    );
    error.status = 400;
    throw error;
  }

  const result = await runSellerAgent(agent, task);

  return { agent, result };
}