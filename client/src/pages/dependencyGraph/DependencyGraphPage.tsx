import React, { useEffect, useState, useCallback } from 'react';
import {
  Network, RefreshCw, AlertTriangle, Info, ZoomIn, Workflow,
} from 'lucide-react';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { formatCurrency } from '../../utils/formatters';
import type { DependencyGraph, GraphNode, GraphNodeType } from '../../types';
import './DependencyGraph.css';

// Node colors by type
const nodeTypeStyle: Record<string, { bg: string; border: string; color: string }> = {
  INCOME:   { bg: 'var(--success-light)', border: 'var(--success)', color: 'var(--success-dark)' },
  CASH:     { bg: 'var(--primary-100)', border: 'var(--primary-500)', color: 'var(--primary-700)' },
  BUDGET:   { bg: 'var(--primary-100)', border: 'var(--primary-300)', color: 'var(--primary-700)' },
  EXPENSES: { bg: 'var(--danger-light)', border: 'var(--danger)', color: 'var(--danger-dark)' },
  SAVINGS:  { bg: 'var(--success-light)', border: 'var(--success)', color: 'var(--success-dark)' },
  BUFFER:   { bg: 'var(--warning-light)', border: 'var(--warning)', color: 'var(--warning-dark)' },
  EMI:      { bg: 'var(--danger-light)', border: 'var(--danger)', color: 'var(--danger-dark)' },
  RENT:     { bg: 'var(--primary-100)', border: 'var(--primary-500)', color: 'var(--primary-700)' },
  DEBT:     { bg: 'var(--critical-light)', border: 'var(--critical)', color: 'var(--critical)' },
  GOALS:    { bg: 'var(--primary-100)', border: 'var(--primary-500)', color: 'var(--primary-700)' },
  RISK:     { bg: 'var(--danger-light)', border: 'var(--danger)', color: 'var(--danger-dark)' },
};

const edgeSeverityColor: Record<string, string> = {
  LOW: 'var(--success)', MEDIUM: 'var(--primary-500)', HIGH: 'var(--warning)', CRITICAL: 'var(--danger)',
};

// Custom node component
interface FinancialNodeData extends Record<string, unknown> {
  label: string;
  nodeType: GraphNodeType;
  value?: number;
}

const FinancialNode: React.FC<{ data: FinancialNodeData }> = ({ data }) => {
  const style = nodeTypeStyle[data.nodeType] ?? nodeTypeStyle['CASH'];
  return (
    <div className="financial-node" style={{ '--node-color': style.border, '--node-tint': style.bg, '--node-ink': style.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="financial-node-handle" />
      <div className="financial-node-type">
        <span />
        {data.nodeType}
      </div>
      <div className="financial-node-label">
        {data.label}
      </div>
      {data.value !== null && data.value !== undefined && (
        <div className="financial-node-value">
          {formatCurrency(data.value)}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="financial-node-handle" />
    </div>
  );
};

const nodeTypes = { financial: FinancialNode };

const graphColumn: Record<GraphNodeType, number> = {
  INCOME: 0,
  CASH: 1,
  BUDGET: 2,
  SAVINGS: 2,
  EXPENSES: 3,
  BUFFER: 3,
  EMI: 3,
  RENT: 3,
  DEBT: 3,
  GOALS: 3,
  RISK: 4,
};

const getGraphLayout = (items: GraphNode[]): Node<FinancialNodeData>[] => {
  const columns = new Map<number, GraphNode[]>();
  items.forEach((item) => {
    const column = graphColumn[item.type] ?? 3;
    columns.set(column, [...(columns.get(column) ?? []), item]);
  });

  const columnX = [72, 340, 620, 930, 1240];
  const nodeHeight = 112;
  const verticalGap = 46;

  return items.map((item) => {
    const column = graphColumn[item.type] ?? 3;
    const columnItems = columns.get(column) ?? [item];
    const index = columnItems.findIndex((entry) => entry.id === item.id);
    const height = columnItems.length * nodeHeight + (columnItems.length - 1) * verticalGap;
    const startY = Math.max(80, (height < 500 ? 500 - height : 0) / 2);

    return {
      id: item.id,
      type: 'financial',
      position: {
        x: columnX[column] ?? columnX[3],
        y: startY + index * (nodeHeight + verticalGap),
      },
      data: { label: item.label, nodeType: item.type, value: item.value },
    };
  });
};

const DependencyGraphPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FinancialNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchGraph = useCallback(async () => {
    try {
      const { data } = await api.get('/engine/dependency-graph');
      const gd: DependencyGraph = data.data;

      const rfNodes = getGraphLayout(gd.nodes);
      const rfEdges: Edge[] = gd.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        label: e.relationship.replaceAll('_', ' '),
        animated: e.severity === 'CRITICAL',
        style: { stroke: edgeSeverityColor[e.severity] ?? 'var(--primary-500)', strokeWidth: 1.75 + e.weight },
        labelStyle: { fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        labelBgStyle: { fill: 'var(--bg-surface)', fillOpacity: 0.96 },
        labelBgPadding: [6, 4] as [number, number],
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeSeverityColor[e.severity] ?? 'var(--primary-500)' },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not load the financial dependency graph.'));
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    void fetchGraph();
  };

  return (
    <div className="graph-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Financial Dependency Graph</h1>
            <p>Visualize how your income, budget, expenses, savings, obligations, and goals are interconnected</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="graph-intro">
        <div className="graph-intro-icon"><Workflow size={18} /></div>
        <div>
          <strong>Follow the flow of your money</strong>
          <p>Read each connection from left to right. Drag nodes to explore, or use the controls to zoom and fit the graph.</p>
        </div>
      </div>

      {/* Legend */}
      <div className="neu-raised graph-legend fade-in">
        <div className="graph-legend-heading">
          <span className="graph-legend-title"><Info size={15} /> Map key</span>
          <span className="graph-legend-caption">Connection colour shows impact severity</span>
        </div>
        <div className="graph-legend-nodes">
          {Object.entries(nodeTypeStyle).map(([type, style]) => (
            <div key={type} className="legend-item">
              <span className="legend-dot" style={{ background: style.bg, borderColor: style.border }} />
              <span>{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
        <div className="graph-severity-key">
          {Object.entries(edgeSeverityColor).map(([severity, color]) => (
            <span key={severity}><i style={{ background: color }} />{severity.toLowerCase()}</span>
          ))}
        </div>
      </div>

      {/* Graph Container */}
      {loading ? (
        <div className="graph-loading">
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
          <p>Building your financial dependency graph…</p>
        </div>
      ) : error ? (
        <div className="empty-state graph-empty">
          <AlertTriangle size={48} color="var(--warning)" />
          <h3>Graph Not Available</h3>
          <p style={{ maxWidth: 400 }}>{error}</p>
          <button className="btn btn-primary" onClick={handleRefresh}><RefreshCw size={16} /> Retry</button>
        </div>
      ) : nodes.length === 0 ? (
        <div className="empty-state graph-empty">
          <Network size={56} color="var(--text-muted)" />
          <h3>No graph data yet</h3>
          <p>Add income, budgets, obligations, and goals to see your financial dependency graph.</p>
        </div>
      ) : (
        <section className="graph-canvas-panel fade-in" aria-label="Financial dependency graph">
          <div className="graph-canvas-toolbar">
            <div><ZoomIn size={16} /><span>Interactive money map</span></div>
            <span>Scroll to zoom · Drag to move</span>
          </div>
          <div className="graph-container">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2, minZoom: 0.45, maxZoom: 1.15 }}
              minZoom={0.35}
              maxZoom={2}
            >
              <Background color="#DCE9E1" gap={24} size={1.2} />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={(n) => {
                  const t = (n.data as FinancialNodeData).nodeType ?? 'CASH';
                  return nodeTypeStyle[t]?.border ?? 'var(--primary-500)';
                }}
                maskColor="rgba(19, 47, 35, 0.08)"
              />
            </ReactFlow>
          </div>
          <div className="graph-canvas-footer">
            <span><i /> {nodes.length} financial items</span>
            <span>{edges.length} money flows</span>
          </div>
        </section>
      )}

    </div>
  );
};

export default DependencyGraphPage;
