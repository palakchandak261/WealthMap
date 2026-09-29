import React, { useEffect, useState, useCallback } from 'react';
import {
  Network, RefreshCw, AlertTriangle, Info,
} from 'lucide-react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import type { DependencyGraph } from '../../types';
import './DependencyGraph.css';

// Node colors by type
const nodeTypeStyle: Record<string, { bg: string; border: string; color: string }> = {
  INCOME:   { bg: '#D0F5F3', border: '#4ECDC4', color: '#2BA89F' },
  CASH:     { bg: '#EEF0FF', border: '#7B8CDE', color: '#4D5BA8' },
  BUDGET:   { bg: '#EEF0FF', border: '#A5B4FC', color: '#4D5BA8' },
  EXPENSES: { bg: '#FFE5E5', border: '#FF6B6B', color: '#CC4444' },
  SAVINGS:  { bg: '#D0F5F3', border: '#4ECDC4', color: '#2BA89F' },
  BUFFER:   { bg: '#FFF3D8', border: '#FFB347', color: '#E09020' },
  EMI:      { bg: '#FFE5E5', border: '#FF6B6B', color: '#CC4444' },
  RENT:     { bg: '#FFE5E5', border: '#E63946', color: '#B02030' },
  DEBT:     { bg: '#FFDDE0', border: '#E63946', color: '#B02030' },
  GOALS:    { bg: '#EEF0FF', border: '#7B8CDE', color: '#4D5BA8' },
  RISK:     { bg: '#FFE5E5', border: '#FF6B6B', color: '#CC4444' },
};

const edgeSeverityColor: Record<string, string> = {
  LOW: '#4ECDC4', MEDIUM: '#7B8CDE', HIGH: '#FFB347', CRITICAL: '#FF6B6B',
};

// Custom node component
const FinancialNode: React.FC<{ data: any }> = ({ data }) => {
  const style = nodeTypeStyle[data.nodeType] ?? nodeTypeStyle['CASH'];
  return (
    <div
      style={{
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: 14,
        padding: '10px 16px',
        minWidth: 130,
        textAlign: 'center',
        boxShadow: `4px 4px 12px rgba(0,0,0,0.08), -2px -2px 8px rgba(255,255,255,0.8)`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: style.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {data.nodeType}
      </div>
      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1A1F36', marginBottom: 2 }}>
        {data.label}
      </div>
      {data.value !== null && data.value !== undefined && (
        <div style={{ fontSize: '0.8rem', color: style.color, fontWeight: 600 }}>
          {formatCurrency(data.value)}
        </div>
      )}
    </div>
  );
};

const nodeTypes = { financial: FinancialNode };

const DependencyGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchGraph = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/engine/dependency-graph');
      const gd: DependencyGraph = data.data;
      setGraphData(gd);

      // Build React Flow nodes
      const rfNodes: Node[] = gd.nodes.map(n => ({
        id: n.id,
        type: 'financial',
        position: { x: n.positionX, y: n.positionY },
        data: { label: n.label, nodeType: n.type, value: n.value },
      }));

      // Build React Flow edges
      const rfEdges: Edge[] = gd.edges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.relationship,
        animated: e.severity === 'CRITICAL' || e.severity === 'HIGH',
        style: { stroke: edgeSeverityColor[e.severity] ?? '#7B8CDE', strokeWidth: 1.5 + e.weight * 0.5 },
        labelStyle: { fill: '#4A5578', fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85, borderRadius: 4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeSeverityColor[e.severity] ?? '#7B8CDE' },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (e: any) {
      // If no nodes/edges from backend, show a helpful default
      setError('Could not load dependency graph. Make sure you have financial data set up and the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  return (
    <div className="graph-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Financial Dependency Graph</h1>
            <p>Visualize how your income, budget, expenses, savings, obligations, and goals are interconnected</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchGraph} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="neu-raised graph-legend fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Info size={14} color="var(--primary-500)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Node Legend</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Edge colors: Teal=Low, Blue=Medium, Amber=High, Red=Critical impact</span>
        </div>
        <div className="graph-legend-nodes">
          {Object.entries(nodeTypeStyle).map(([type, style]) => (
            <div key={type} className="legend-item">
              <div
                className="legend-dot"
                style={{ background: style.bg, border: `2px solid ${style.border}` }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{type}</span>
            </div>
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
          <button className="btn btn-primary" onClick={fetchGraph}><RefreshCw size={16} /> Retry</button>
        </div>
      ) : nodes.length === 0 ? (
        <div className="empty-state graph-empty">
          <Network size={56} color="var(--text-muted)" />
          <h3>No graph data yet</h3>
          <p>Add income, budgets, obligations, and goals to see your financial dependency graph.</p>
        </div>
      ) : (
        <div className="neu-raised graph-container fade-in">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="var(--bg-subtle)" gap={20} size={1.5} />
            <Controls style={{ boxShadow: 'var(--neu-raised-sm)', borderRadius: 'var(--radius-md)' }} />
            <MiniMap
              nodeColor={(n) => {
                const t = (n.data as any)?.nodeType ?? 'CASH';
                return nodeTypeStyle[t]?.border ?? '#7B8CDE';
              }}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--bg-subtle)',
              }}
            />
          </ReactFlow>
        </div>
      )}

      {/* Stats below graph */}
      {graphData && (
        <div className="graph-stats fade-in">
          <div className="neu-raised-sm graph-stat-pill">
            <Network size={15} color="var(--primary-500)" />
            <span>{graphData.nodes.length} Nodes</span>
          </div>
          <div className="neu-raised-sm graph-stat-pill">
            <Network size={15} color="var(--success-dark)" />
            <span>{graphData.edges.length} Connections</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyGraphPage;
