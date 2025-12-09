import { useEffect } from "react";
import { NODE_STATUS, NODE_TYPES } from "../types";

/*
  useWorkflowValidation
  - Centralizes all workflow validation logic.
  - Applies node status and border styling based on structural rules.
  - Runs automatically whenever nodes or edges change (post-hydration).
*/

export function useWorkflowValidation({
  nodes,
  edges,
  setNodes,
  isHydratedRef,
}) {
  function validateGraph(nodesArr, edgesArr) {
    const updated = nodesArr.map((n) => ({
      ...n,
      data: { ...(n.data || {}), status: NODE_STATUS.VALID },
      style: { ...(n.style || {}), border: "2px solid #999" },
    }));

    const starts = updated.filter((n) => n.data.nodeType === NODE_TYPES.START);

    if (starts.length !== 1) {
      starts.forEach((s) => {
        s.data.status = NODE_STATUS.INVALID;
        s.style = { ...(s.style || {}), border: "2px solid red" };
      });
    } else {
      const startId = starts[0].id;
      const hasOutgoing = edgesArr.some((e) => e.source === startId);

      if (!hasOutgoing) {
        starts[0].data.status = NODE_STATUS.INVALID;
        starts[0].style = {
          ...(starts[0].style || {}),
          border: "2px solid red",
        };
      }
    }

    updated.forEach((n) => {
      const hasIn = edgesArr.some((e) => e.target === n.id);
      const hasOut = edgesArr.some((e) => e.source === n.id);

      if (!hasIn && !hasOut) {
        n.data.status = NODE_STATUS.INVALID;
        n.style = { ...(n.style || {}), border: "2px solid red" };
      }
    });

    return updated;
  }

  useEffect(() => {
    if (!isHydratedRef?.current) return;

    const validated = validateGraph(nodes, edges);

    const needsUpdate = validated.some((v) => {
      const current = nodes.find((n) => n.id === v.id);
      if (!current) return true;

      return (
        current.data?.status !== v.data?.status ||
        current.style?.border !== v.style?.border
      );
    });

    if (needsUpdate) {
      setNodes(validated);
    }
  }, [nodes, edges, setNodes, isHydratedRef]);
}
