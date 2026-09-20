/**
 * Dependency Graph Engine
 * ────────────────────────
 * Builds (or rebuilds) the weighted directed graph for a user.
 * Nodes = financial entities   Edges = relationships with weight + severity
 *
 * Also runs BFS-based cascading impact when a hypothetical delta is applied.
 */

import prisma from "../../lib/prisma";
import { FinancialState } from "./financialState.service";
import { GraphNodeType, GraphSeverity } from "@prisma/client";

// ── Build / refresh graph from current financial state ───────────────────────
export const buildDependencyGraph = async (
  userId: string,
  state:  FinancialState
) => {
  // Wipe and rebuild so it always reflects reality
  await prisma.graphEdge.deleteMany({
    where: {
      sourceNode: { userId },
    },
  });
  await prisma.graphNode.deleteMany({ where: { userId } });

  // Helper to create a node
  const makeNode = async (type: GraphNodeType, label: string, value: number, x: number, y: number) =>
    prisma.graphNode.create({ data: { userId, type, label, value, positionX: x, positionY: y } });

  // Nodes
  const income   = await makeNode("INCOME",   "Income",            state.totalIncomeThisMonth || state.declaredMonthlyIncome, 0,   0);
  const cash     = await makeNode("CASH",     "Cash Balance",      state.cashBalance,                                          300, 0);
  const budget   = await makeNode("BUDGET",   "Monthly Budget",    state.totalBudget,                                          300, 150);
  const expenses = await makeNode("EXPENSES", "Monthly Expenses",  state.totalSpent,                                           600, 150);
  const savings  = await makeNode("SAVINGS",  "Savings",           state.savingsBalance,                                       600, -150);
  const risk     = await makeNode("RISK",     "Risk",              0,                                                           900, 0);

  // Obligation nodes
  const obligNodes: { node: Awaited<ReturnType<typeof makeNode>>; amount: number }[] = [];
  let yOff = -100;
  for (const ob of state.upcomingObligations.slice(0, 5)) {
    const nodeType: GraphNodeType = ob.type === "EMI" ? "EMI" : ob.type === "RENT" ? "RENT" : "BUFFER";
    const n = await makeNode(nodeType, ob.name, ob.amount, 600, yOff);
    obligNodes.push({ node: n, amount: ob.amount });
    yOff += 100;
  }

  // ── Edges ─────────────────────────────────────────────────────────────────────
  const makeEdge = (sourceNodeId: string, targetNodeId: string, rel: string, weight: number, sev: GraphSeverity) =>
    prisma.graphEdge.create({ data: { sourceNodeId, targetNodeId, relationship: rel, weight, severity: sev } });

  await makeEdge(income.id,   cash.id,    "deposits_into", 1.0,  "CRITICAL");
  await makeEdge(cash.id,     budget.id,  "funds",         1.0,  "HIGH");
  await makeEdge(budget.id,   expenses.id,"allocates_to",  1.0,  "MEDIUM");
  await makeEdge(expenses.id, cash.id,    "reduces",       1.0,  "HIGH");
  await makeEdge(cash.id,     savings.id, "transfers_to",  0.2,  "LOW");
  await makeEdge(expenses.id, risk.id,    "increases",     0.3,  "MEDIUM");

  for (const { node, amount } of obligNodes) {
    const w = state.cashBalance > 0 ? amount / state.cashBalance : 1;
    const sev: GraphSeverity = w > 0.4 ? "CRITICAL" : w > 0.2 ? "HIGH" : "MEDIUM";
    await makeEdge(cash.id, node.id, "funds", w, sev);
    await makeEdge(node.id, risk.id, "increases", Math.min(w * 1.5, 1), sev);
  }

  // Return the graph for the response
  return getGraphForUser(userId);
};

// ── Read current graph ────────────────────────────────────────────────────────
export const getGraphForUser = async (userId: string) => {
  const nodes = await prisma.graphNode.findMany({ where: { userId } });
  const edges = await prisma.graphEdge.findMany({
    where:   { sourceNode: { userId } },
    include: { sourceNode: true, targetNode: true },
  });

  return {
    nodes: nodes.map((n) => ({
      id:       n.id,
      type:     n.type,
      label:    n.label,
      value:    Number(n.value ?? 0),
      position: { x: n.positionX, y: n.positionY },
    })),
    edges: edges.map((e) => ({
      id:           e.id,
      source:       e.sourceNodeId,
      target:       e.targetNodeId,
      relationship: e.relationship,
      weight:       e.weight,
      severity:     e.severity,
    })),
  };
};

// ── Cascading impact: BFS from a changed node ─────────────────────────────────
export const getCascadingImpact = async (
  userId: string,
  startNodeType: GraphNodeType,
  deltaAmount:   number  // positive = increase in that node's value
) => {
  const { nodes, edges } = await getGraphForUser(userId);

  const nodeMap   = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap   = new Map<string, typeof edges>();  // sourceId → edges

  for (const e of edges) {
    if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
    edgeMap.get(e.source)!.push(e);
  }

  const startNode = nodes.find((n) => n.type === startNodeType);
  if (!startNode) return { impacts: [], summary: "No matching node found" };

  // BFS
  const visited = new Set<string>();
  const queue: { nodeId: string; propagatedDelta: number; depth: number }[] = [
    { nodeId: startNode.id, propagatedDelta: deltaAmount, depth: 0 },
  ];
  const impacts: { node: string; type: string; delta: number; depth: number; severity: string }[] = [];

  while (queue.length > 0) {
    const { nodeId, propagatedDelta, depth } = queue.shift()!;
    if (visited.has(nodeId) || depth > 5) continue;
    visited.add(nodeId);

    const outEdges = edgeMap.get(nodeId) ?? [];
    for (const edge of outEdges) {
      const childDelta = propagatedDelta * edge.weight * (edge.relationship === "reduces" ? -1 : 1);
      const childNode  = nodeMap.get(edge.target);
      if (!childNode) continue;

      impacts.push({
        node:     childNode.label,
        type:     childNode.type,
        delta:    Math.round(childDelta),
        depth:    depth + 1,
        severity: edge.severity,
      });
      queue.push({ nodeId: edge.target, propagatedDelta: childDelta, depth: depth + 1 });
    }
  }

  const severity = impacts.some((i) => i.severity === "CRITICAL") ? "CRITICAL"
    : impacts.some((i) => i.severity === "HIGH")                  ? "HIGH"
    : impacts.some((i) => i.severity === "MEDIUM")                ? "MEDIUM" : "LOW";

  return {
    impacts,
    severity,
    summary: `A change of ₹${Math.abs(deltaAmount).toLocaleString("en-IN")} in ${startNode.label} cascades through ${impacts.length} nodes`,
  };
};
