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
 * FlowCanvas - centralized validation
 * - All manual validateGraph calls removed
 * - Central effect revalidates when nodes or edges change
 * - Validation applies only when it actually changes node status/style
 */
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
  const isHydratedRef = useRef(false);
  const isApplyingRef = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState(null);

  // Undo/Redo stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const MAX_HISTORY = 60;

  function pushHistory(prevNodes, prevEdges) {
    if (isApplyingRef.current) return;
    try {
      undoStack.current.push({
        nodes: JSON.parse(JSON.stringify(prevNodes)),
        edges: JSON.parse(JSON.stringify(prevEdges)),
      });
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
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
    setTimeout(() => (isApplyingRef.current = false), 20);
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
    setTimeout(() => (isApplyingRef.current = false), 20);
  }

  // Duplicate selected nodes (and inner edges between them)
  function duplicateSelected() {
    const selectedNodes = nodes.filter((n) => n.selected);
    if (!selectedNodes.length) return;
    pushHistory(nodes, edges);

    const idMap = {};
    const newNodes = selectedNodes.map((n) => {
      const newId = uuidv4();
      idMap[n.id] = newId;
      return {
        ...JSON.parse(JSON.stringify(n)),
        id: newId,
        position: { x: n.position.x + 24, y: n.position.y + 24 },
        selected: false,
        data: { ...(n.data || {}) },
      };
    });

    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const newEdges = edges
      .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
      .map((e) => ({
        ...JSON.parse(JSON.stringify(e)),
        id: uuidv4(),
        source: idMap[e.source],
        target: idMap[e.target],
      }));

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  }

  // Delete selected nodes and attached edges
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

  // Keyboard handlers: Undo/Redo, Duplicate, Delete
  useEffect(() => {
    const handler = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      // handle undo/redo
      if (cmd && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (cmd && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
      }
      // duplicate
      if (cmd && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        duplicateSelected();
      }
      // delete / backspace (ignore if typing in input)
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        if (
          active &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
        ) {
          return;
        }
        e.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodes, edges]);

  // Load saved workflow once
  useEffect(() => {
    try {
      const saved = localStorage.getItem("smoothwork-workflow");
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
  }, []);

  // Persist after hydration
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem(
        "smoothwork-workflow",
        JSON.stringify({ nodes, edges })
      );
    } catch (e) {
      console.warn("Failed to save workflow:", e);
    }
  }, [nodes, edges]);

  // Expose getter
  useEffect(() => {
    if (!setWorkflowGetter) return;
    setWorkflowGetter(() => ({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }));
  }, [nodes, edges, setWorkflowGetter]);

  // Expose loader (import)
  useEffect(() => {
    if (!setWorkflowLoader) return;
    setWorkflowLoader(() => (wf) => {
      pushHistory(nodes, edges);
      setNodes(wf.nodes || []);
      setEdges(wf.edges || []);
    });
  }, [setWorkflowLoader, nodes, edges]);

  // Validation engine (single source)
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

  // onConnect (record history)
  const onConnect = useCallback(
    (params) => {
      pushHistory(nodes, edges);
      setEdges((eds) => addEdge(params, eds));
    },
    [nodes, edges]
  );

  // onDrop (record history, add node)
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

      setNodes((nds) => [...nds, newNode]); // no inline validateGraph
    },
    [rfInstance, nodes, edges]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onNodeClick = (_, node) => {
    onSelectNode && onSelectNode(node);
  };

  // nodeEdits (edit/delete) with history, but not calling validateGraph inline
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
  }, [nodeEdits]);

  // wrappedOnNodesChange: apply changes but don't push history for every small change
  const wrappedOnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes); // no history here
    },
    [onNodesChange]
  );

  // wrappedOnEdgesChange: record history then apply changes
  const wrappedOnEdgesChange = useCallback(
    (changes) => {
      pushHistory(nodes, edges);
      onEdgesChange(changes);
    },
    [nodes, edges, onEdgesChange]
  );

  // focus handler registration
  useEffect(() => {
    if (!setNodeFocusHandler) return;
    const focusFn = (nodeId) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      try {
        if (rfInstance && typeof rfInstance.setCenter === "function") {
          rfInstance.setCenter(target.position.x, target.position.y, {
            zoom: 1.35,
            duration: 450,
          });
        }
      } catch (err) {
        console.warn("setCenter failed", err);
      }
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                style: {
                  ...(n.style || {}),
                  border: "3px solid #00b4ff",
                  boxShadow: "0 0 12px rgba(0,180,255,0.7)",
                },
              }
            : n
        )
      );
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  style: {
                    ...(n.style || {}),
                    border: "2px solid #999",
                    boxShadow: "none",
                  },
                }
              : n
          )
        );
      }, 700);
    };
    setNodeFocusHandler && setNodeFocusHandler(focusFn);
  }, [nodes, rfInstance, setNodeFocusHandler]);

  // auto layout registration (records history and moves nodes)
  useEffect(() => {
    if (!setAutoLayoutHandler) return;
    const autoLayout = () => {
      pushHistory(nodes, edges);
      setNodes((nds) => {
        if (!nds.length) return nds;
        const graph = {};
        nds.forEach((n) => (graph[n.id] = []));
        edges.forEach((e) => {
          if (graph[e.source]) graph[e.source].push(e.target);
        });
        const roots = nds.filter((n) => !edges.some((e) => e.target === n.id));
        const levelMap = {};
        const queue = [];
        roots.forEach((r) => {
          levelMap[r.id] = 0;
          queue.push(r.id);
        });
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
            position: { x: idx * HORIZONTAL + 100, y: lvl * VERTICAL + 80 },
          };
        });
      });
    };
    setAutoLayoutHandler(autoLayout);
  }, [nodes, edges, setAutoLayoutHandler]);

  // register undo/redo/duplicate/delete handlers with parent
  useEffect(() => {
    if (!setUndoRedoHandlers) return;
    setUndoRedoHandlers({
      undo,
      redo,
      duplicate: duplicateSelected,
      deleteSelected,
    });
  }, [setUndoRedoHandlers, undo, redo]);

  // setCenter handler for ReactFlow init
  const onInit = (rfi) => setRfInstance(rfi);

  // ---------- CENTRALIZED VALIDATION EFFECT ----------
  // run whenever nodes OR edges change; only apply validated nodes when their status/style differs
  useEffect(() => {
    if (!isHydratedRef.current) return;

    const validated = validateGraph(nodes, edges);

    // detect differences in status or border (quick shallow compare)
    const needsUpdate = validated.some((v) => {
      const current = nodes.find((n) => n.id === v.id);
      if (!current) return true;
      const currBorder = (current.style && current.style.border) || "";
      const valBorder = (v.style && v.style.border) || "";
      const currStatus = current.data?.status;
      const valStatus = v.data?.status;
      return currBorder !== valBorder || currStatus !== valStatus;
    });

    if (needsUpdate) {
      setNodes(validated);
    }
  }, [nodes, edges, setNodes]);
  // ---------------------------------------------------

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
