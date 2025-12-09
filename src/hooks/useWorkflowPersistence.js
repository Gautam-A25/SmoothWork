import { useEffect, useRef } from "react";

/*
  useWorkflowPersistence
  - Handles loading and saving the workflow to localStorage.
  - Exposes a hydration flag so the caller can avoid premature saves.
*/

export function useWorkflowPersistence({
  nodes,
  edges,
  setNodes,
  setEdges,
  storageKey = "smoothwork-workflow",
}) {
  const isHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
      }
    } catch (e) {
      console.warn("Failed to restore workflow:", e);
    } finally {
      isHydratedRef.current = true;
    }
  }, [setNodes, setEdges, storageKey]);

  useEffect(() => {
    if (!isHydratedRef.current) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }));
    } catch (e) {
      console.warn("Failed to save workflow:", e);
    }
  }, [nodes, edges, storageKey]);

  return {
    isHydratedRef,
  };
}
