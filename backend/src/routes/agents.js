import { Router } from "express";

const router = Router();

export const agents = [
  {
    id: "research-scout",
    name: "Research Scout",
    description: "Find information and prepare research briefs.",
    price: "0.015",
    currency: "tUSDC",
    status: "available",
    capability: "research",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Analyse data and identify useful trends.",
    price: "0.020",
    currency: "tUSDC",
    status: "available",
    capability: "data",
  },
  {
    id: "content-studio",
    name: "Content Studio",
    description: "Create summaries and clear written content.",
    price: "0.010",
    currency: "tUSDC",
    status: "available",
    capability: "writing",
  },
];

router.get("/", (req, res) => {
  res.json({ agents });
});

export default router;