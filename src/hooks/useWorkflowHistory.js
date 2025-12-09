import { useRef } from "react";

/*
  useWorkflowHistory
  - Manages undo/redo history using snapshots.
  - Exposes helpers for undo, redo, duplicate and delete.
  - Designed to stay UI-agnostic and reusable.
*/

export function useWorkflowHistory({
  nodes,
  edges,
  setNodes,
  setEdges,
  maxHistory = 60,
}) {
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const isApplyingRef = useRef(false);

  function pushHistory(prevNodes, prevEdges) {
    if (isApplyingRef.current) return;

    try {
      undoStack.current.push({
        nodes: JSON.parse(JSON.stringify(prevNodes)),
        edges: JSON.parse(JSON.stringify(prevEdges)),
      });

      if (undoStack.current.length > maxHistory) {
        undoStack.current.shift();
      }

      redoStack.current = [];
    } catch (e) {
      console.warn("pushHistory failed", e);
    }
  }

  function undo() {
    if (!undoStack.current.length) return;

    const prev = undoStack.current.pop();
    isApplyingRef.current = true;

    redoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    setNodes(prev.nodes || []);
    setEdges(prev.edges || []);

    setTimeout(() => {
      isApplyingRef.current = false;
    }, 20);
  }

  function redo() {
    if (!redoStack.current.length) return;

    const next = redoStack.current.pop();
    isApplyingRef.current = true;

    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });

    setNodes(next.nodes || []);
    setEdges(next.edges || []);

    setTimeout(() => {
      isApplyingRef.current = false;
    }, 20);
  }

  function duplicateSelected() {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (!selectedNodes.length) return;

    pushHistory(nodes, edges);

    const idMap = {};
    const newNodes = selectedNodes.map((n) => {
      const newId = crypto.randomUUID();
      idMap[n.id] = newId;

      return {
        ...JSON.parse(JSON.stringify(n)),
        id: newId,
        position: {
          x: n.position.x + 24,
          y: n.position.y + 24,
        },
        selected: false,
      };
    });

    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    const newEdges = edges
      .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
      .map((e) => ({
        ...JSON.parse(JSON.stringify(e)),
        id: crypto.randomUUID(),
        source: idMap[e.source],
        target: idMap[e.target],
      }));

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  }

  function deleteSelected() {
    const selectedIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id)
    );

    if (!selectedIds.size) return;

    pushHistory(nodes, edges);

    setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)
      )
    );
  }

  return {
    pushHistory,
    undo,
    redo,
    duplicateSelected,
    deleteSelected,
  };
}
