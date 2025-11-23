"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Node, Edge, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";

interface WorkflowGraphStage {
  id: string;
  label: string;
  subtitle?: string;
}

interface WorkflowGraphProps {
  stages: WorkflowGraphStage[];
  activeStageId?: string;
  onStageClick?: (stageId: string) => void;
}

export function WorkflowGraph({ stages, activeStageId, onStageClick }: WorkflowGraphProps) {
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);

  const nodes: Node[] = useMemo(() => {
    const baseY = 0;
    const xStep = 220;

    const baseNodes: Node[] = [
      {
        id: "start",
        position: { x: 0, y: baseY },
        data: { label: "Инициатор" },
        type: "input",
        style: {
          borderRadius: 9999,
          padding: "6px 14px",
          background: "#020617",
          color: "#e5e7eb",
          border: "1px solid rgba(148, 163, 184, 0.7)",
          fontSize: 12,
        },
      },
    ];

    const stageNodes = stages.map((stage, index) => {
      const isActive = activeStageId === stage.id;

      return {
        id: stage.id,
        position: { x: (index + 1) * xStep, y: baseY },
        data: { label: stage.label, subtitle: stage.subtitle },
        type: "default",
        style: {
          borderRadius: 16,
          padding: "10px 14px",
          background: "#020617",
          border: isActive
            ? "1px solid rgba(56, 189, 248, 0.9)"
            : "1px solid rgba(148, 163, 184, 0.6)",
          color: "#e5e7eb",
          minWidth: 190,
          fontSize: 12,
          boxShadow: isActive
            ? "0 0 0 1px rgba(56, 189, 248, 0.5), 0 18px 45px rgba(15, 23, 42, 0.9)"
            : "0 16px 35px rgba(15, 23, 42, 0.9)",
          transform: isActive ? "scale(1.02)" : undefined,
          cursor: "pointer",
          transition: "all 160ms ease-out",
        },
      } satisfies Node;
    });

    const executionNode: Node = {
      id: "execution",
      position: { x: (stages.length + 1) * xStep, y: baseY },
      data: { label: "Исполнение", subtitle: "Исполнители" },
      type: "output",
      style: {
        borderRadius: 9999,
        padding: "6px 14px",
        background: "#0f172a",
        color: "#e5e7eb",
        border: "1px solid rgba(56, 189, 248, 0.7)",
        fontSize: 12,
      },
    };

    return [...baseNodes, ...stageNodes, executionNode];
  }, [stages, activeStageId]);

  const edges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    if (stages.length === 0) {
      edges.push({ id: "start-execution", source: "start", target: "execution", animated: true });
      return edges;
    }

    edges.push({ id: "start-stage-0", source: "start", target: stages[0].id, animated: true });

    for (let i = 0; i < stages.length - 1; i++) {
      edges.push({ id: `stage-${i}-stage-${i + 1}`, source: stages[i].id, target: stages[i + 1].id, animated: true });
    }

    edges.push({
      id: `stage-last-execution`,
      source: stages[stages.length - 1].id,
      target: "execution",
      animated: true,
    });

    return edges;
  }, [stages]);

  useEffect(() => {
    if (!instance) return;
    instance.fitView({ padding: 0.25 });
  }, [instance, stages.length]);

  return (
    <div className="h-[22rem] w-full overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 md:h-[24rem]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll
        onInit={(nextInstance) => setInstance(nextInstance)}
        onNodeClick={(_, node) => {
          if (!onStageClick) return;
          // Кликабельны только этапы маршрута, без стартового и узла исполнения
          const isStageNode = stages.some((stage) => stage.id === node.id);
          if (isStageNode) {
            onStageClick(node.id);
          }
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#1f2937" />
        <Controls showInteractive={false} position="bottom-right" style={{ background: "#020617" }} />
      </ReactFlow>
    </div>
  );
}
