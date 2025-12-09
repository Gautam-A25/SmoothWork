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

/**
 * Robust FlowCanvas with defensive focus/flash behavior.
 * Focus handler will:
 *  - attempt rfInstance.setCenter(...) (best effort)
 *  - if that fails, fall back to highlighting the node DOM element
 */
export default function FlowCanvas({
  onSelectNode,
  nodeEdits,
  clearNodeEdits,
  setWorkflowGetter,
  setWorkflowLoader,
  setNodeFocusHandler,
  setAutoLayoutHandler,
}) {
  const wrapperRef = useRef(null);
  const isHydratedRef = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);

  // ---------- Persistence: load once, save after hydration ----------
  useEffect(() => {
    try {
      const saved = localStorage.getItem("smoothwork-workflow");
      if (saved) {
        const parsed = JSON.parse(saved);
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
      }
    } catch (e) {
      console.error("Failed to restore workflow:", e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    const payload = { nodes, edges };
    try {
      localStorage.setItem("smoothwork-workflow", JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save workflow:", e);
    }
  }, [nodes, edges]);

  // expose getter/loader
  useEffect(() => {
    if (setWorkflowGetter) {
      setWorkflowGetter(() => ({
        nodes: nodes.map((n) => ({ ...n })),
        edges: edges.map((e) => ({ ...e })),
      }));
    }
  }, [nodes, edges, setWorkflowGetter]);

  useEffect(() => {
    if (setWorkflowLoader) {
      setWorkflowLoader(() => (wf) => {
        setNodes(wf.nodes || []);
        setEdges(wf.edges || []);
      });
    }
  }, [setWorkflowLoader]);

  // ---------- validation helper ----------
  function validateGraph(nodesArr, edgesArr) {
    const updated = nodesArr.map((n) => ({
      ...n,
      data: { ...n.data, status: NODE_STATUS.VALID },
      style: { ...n.style, border: "2px solid #999" },
    }));

    const starts = updated.filter((n) => n.data.nodeType === NODE_TYPES.START);

    if (starts.length !== 1) {
      starts.forEach((s) => {
        s.data.status = NODE_STATUS.INVALID;
        s.style = { ...s.style, border: "2px solid red" };
      });
    } else {
      const startId = starts[0].id;
      const hasOutgoing = edgesArr.some((e) => e.source === startId);
      if (!hasOutgoing) {
        starts[0].data.status = NODE_STATUS.INVALID;
        starts[0].style = { ...starts[0].style, border: "2px solid red" };
      }
    }

    updated.forEach((n) => {
      const hasIn = edgesArr.some((e) => e.target === n.id);
      const hasOut = edgesArr.some((e) => e.source === n.id);
      if (!hasIn && !hasOut) {
        n.data.status = NODE_STATUS.INVALID;
        n.style = { ...n.style, border: "2px solid red" };
      }
    });

    return [...updated];
  }

  // ---------- Node / Edge callbacks ----------
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (!rfInstance) return;

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

      setNodes((nds) => validateGraph([...nds, newNode], edges));
    },
    [rfInstance, edges, setNodes]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onNodeClick = (_, node) => {
    onSelectNode && onSelectNode(node);
  };

  // apply edits
  useEffect(() => {
    if (!nodeEdits) return;

    // ✅ DELETE HANDLING
    if (nodeEdits.__delete) {
      setNodes((nds) => nds.filter((n) => n.id !== nodeEdits.id));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== nodeEdits.id && e.target !== nodeEdits.id
        )
      );
      clearNodeEdits();
      return;
    }

    // ✅ NORMAL UPDATE HANDLING
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeEdits.id ? { ...n, data: nodeEdits.data } : n
      );
      return validateGraph(updated, edges);
    });

    clearNodeEdits();
  }, [nodeEdits, edges, clearNodeEdits, setEdges]);

  // revalidate on edges change (after hydration)
  useEffect(() => {
    if (!isHydratedRef.current) return;
    setNodes((nds) => validateGraph(nds, edges));
  }, [edges, setNodes]);

  // ---------- focus + flash handler ----------
  // This registers a focus handler only when rfInstance exists.
  useEffect(() => {
    if (!setNodeFocusHandler) return;

    const focusFn = (nodeId) => {
      console.log("[FlowCanvas] focus requested for:", nodeId);

      const target = nodes.find((n) => n.id === nodeId);
      if (!target) {
        console.warn("[FlowCanvas] focus: node not found:", nodeId);
        return;
      }

      // ✅ SAFE CAMERA CENTERING (does NOT move node)
      if (rfInstance && typeof rfInstance.setCenter === "function") {
        try {
          rfInstance.setCenter(target.position.x, target.position.y, {
            zoom: 1.35,
            duration: 500,
          });
        } catch (err) {
          console.warn("setCenter failed:", err);
        }
      }

      // ✅ SAFE VISUAL FLASH (NO transform!)
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                style: {
                  ...n.style,
                  border: "3px solid #00b4ff",
                  boxShadow: "0 0 12px rgba(0,180,255,0.7)",
                },
              }
            : n
        )
      );

      // ✅ Revert after 700ms
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  style: {
                    ...n.style,
                    border: "2px solid #999",
                    boxShadow: "none",
                  },
                }
              : n
          )
        );
      }, 700);
    };

    setNodeFocusHandler(focusFn);
    console.log("[FlowCanvas] SAFE focus handler registered");
  }, [setNodeFocusHandler, rfInstance, nodes, setNodes]);

  // onInit setter for reactflow instance
  const onInit = (rfi) => {
    setRfInstance(rfi);
  };

  useEffect(() => {
    if (!setAutoLayoutHandler) return;

    const autoLayout = () => {
      console.log("[FlowCanvas] Auto-layout triggered");

      setNodes((nds) => {
        if (!nds.length) return nds;

        const graph = {};
        nds.forEach((n) => (graph[n.id] = []));
        edges.forEach((e) => {
          if (graph[e.source]) graph[e.source].push(e.target);
        });

        // Find roots (no incoming edges)
        const roots = nds.filter((n) => !edges.some((e) => e.target === n.id));

        const levelMap = {};
        const queue = [];

        roots.forEach((r) => {
          levelMap[r.id] = 0;
          queue.push(r.id);
        });

        // BFS
        while (queue.length) {
          const curr = queue.shift();
          (graph[curr] || []).forEach((next) => {
            if (levelMap[next] === undefined) {
              levelMap[next] = levelMap[curr] + 1;
              queue.push(next);
            }
          });
        }

        const levels = {};
        Object.entries(levelMap).forEach(([id, lvl]) => {
          if (!levels[lvl]) levels[lvl] = [];
          levels[lvl].push(id);
        });

        const VERTICAL = 140;
        const HORIZONTAL = 220;

        return nds.map((n) => {
          const lvl = levelMap[n.id] ?? 0;
          const idx = levels[lvl]?.indexOf(n.id) ?? 0;

          return {
            ...n,
            position: {
              x: idx * HORIZONTAL + 100,
              y: lvl * VERTICAL + 80,
            },
          };
        });
      });
    };

    setAutoLayoutHandler(autoLayout); // ✅ IMPORTANT: DO NOT wrap in () => autoLayout
    console.log("[FlowCanvas] Auto-layout handler registered");
  }, [setAutoLayoutHandler, edges, setNodes]);

  return (
    <div ref={wrapperRef} style={{ flex: 1 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
