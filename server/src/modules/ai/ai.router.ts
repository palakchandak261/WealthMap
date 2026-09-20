import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { getRecommendations } from "./ai.controller";

export const aiRouter = Router();

aiRouter.use(authenticate);

// POST so the frontend can optionally send extra context
aiRouter.post("/recommendations", getRecommendations);
