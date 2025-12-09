import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_NODE_DATA, NODE_TYPES, NODE_STATUS } from "../types";

import { useWorkflowHistory } from "../hooks/useWorkflowHistory";
import { useWorkflowPersistence } from "../hooks/useWorkflowPersistence";
import { useWorkflowValidation } from "../hooks/useWorkflowValidation";

export default function FlowCanvas({
  onSelectNode,
  nodeEdits,
  clearNodeEdits,
  setWorkflowGetter,
  setWorkflowLoader,
  setNodeFocusHandler,
  setAutoLayoutHandler,
  setUndoRedoHandlers,
}) {
  const wrapperRef = useRef(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);

  const { pushHistory, undo, redo, duplicateSelected, deleteSelected } =
    useWorkflowHistory({
      nodes,
      edges,
      setNodes,
      setEdges,
    });

  const { isHydratedRef } = useWorkflowPersistence({
    nodes,
    edges,
    setNodes,
    setEdges,
  });

  useWorkflowValidation({
    nodes,
    edges,
    setNodes,
    isHydratedRef,
  });

  useEffect(() => {
    if (!setWorkflowGetter) return;

    setWorkflowGetter(() => ({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }));
  }, [nodes, edges, setWorkflowGetter]);

  useEffect(() => {
    if (!setWorkflowLoader) return;

    setWorkflowLoader(() => (wf) => {
      pushHistory(nodes, edges);
      setNodes(wf.nodes || []);
      setEdges(wf.edges || []);
    });
  }, [setWorkflowLoader, nodes, edges, pushHistory]);

  useEffect(() => {
    if (!setUndoRedoHandlers) return;

    setUndoRedoHandlers({
      undo,
      redo,
      duplicate: duplicateSelected,
      deleteSelected,
    });
  }, [setUndoRedoHandlers, undo, redo, duplicateSelected, deleteSelected]);

  const onConnect = useCallback(
    (params) => {
      pushHistory(nodes, edges);
      setEdges((eds) => addEdge(params, eds));
    },
    [nodes, edges, pushHistory]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (!rfInstance) return;

      pushHistory(nodes, edges);

      const bounds = wrapperRef.current.getBoundingClientRect();
      const type = e.dataTransfer.getData("application/reactflow");

      const position = rfInstance.project({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const id = uuidv4();
      const baseData = DEFAULT_NODE_DATA[type] || { label: type };

      const newNode = {
        id,
        type: "default",
        position,
        data: {
          ...baseData,
          nodeType: type,
          status: NODE_STATUS.VALID,
        },
        style: { border: "2px solid #999" },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, nodes, edges, pushHistory]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onNodeClick = (_, node) => {
    onSelectNode && onSelectNode(node);
  };

  useEffect(() => {
    if (!nodeEdits) return;

    pushHistory(nodes, edges);

    if (nodeEdits.__delete) {
      setNodes((nds) => nds.filter((n) => n.id !== nodeEdits.id));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== nodeEdits.id && e.target !== nodeEdits.id
        )
      );
      clearNodeEdits && clearNodeEdits();
      return;
    }

    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeEdits.id ? { ...n, data: nodeEdits.data } : n
      )
    );

    clearNodeEdits && clearNodeEdits();
  }, [nodeEdits, nodes, edges, pushHistory]);

  const wrappedOnNodesChange = useCallback(
    (changes) => onNodesChange(changes),
    [onNodesChange]
  );

  const wrappedOnEdgesChange = useCallback(
    (changes) => {
      pushHistory(nodes, edges);
      onEdgesChange(changes);
    },
    [nodes, edges, onEdgesChange, pushHistory]
  );

  const onInit = (rfi) => setRfInstance(rfi);

  return (
    <div ref={wrapperRef} style={{ flex: 1 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        onNodesChange={wrappedOnNodesChange}
        onEdgesChange={wrappedOnEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onNodeDragStart={() => pushHistory(nodes, edges)}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
