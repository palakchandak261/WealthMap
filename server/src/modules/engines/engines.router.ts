import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  getFinancialState,
  getForecast,
  getRisk,
  getHealthScore,
  getSafeToSpend,
  getDependencyGraph,
  simulate,
  getAnomalies,
  getRiskHistory,
} from "./engines.controller";

export const enginesRouter = Router();

enginesRouter.use(authenticate);

// Core engine endpoints
enginesRouter.get("/financial-state",  getFinancialState);   // full digital twin
enginesRouter.get("/forecast",         getForecast);          // expense prediction
enginesRouter.get("/risk",             getRisk);              // risk score + alerts
enginesRouter.get("/health-score",     getHealthScore);       // health score breakdown
enginesRouter.get("/safe-to-spend",    getSafeToSpend);       // safe daily amount
enginesRouter.get("/dependency-graph", getDependencyGraph);   // nodes + edges
enginesRouter.get("/anomalies",        getAnomalies);         // unusual expenses
enginesRouter.get("/risk-history",     getRiskHistory);       // past risk logs

// What-If simulator (POST because it takes a hypothetical expense body)
enginesRouter.post("/simulate", simulate);
