import React, { useState } from "react";
import { simulateWorkflow } from "../api/mockApi";
import { NODE_TYPES } from "../types";

export default function SimulationPanel({
  getWorkflow,
  loadWorkflow,
  focusNode,
  autoLayout,
  undo,
  redo,
  duplicate,
  deleteSelected,
}) {
  const [errors, setErrors] = useState([]);
  const [trace, setTrace] = useState(null);
  const [running, setRunning] = useState(false);

  function validateWorkflow(workflow) {
    const errs = [];
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    const starts = nodes.filter((n) => n.data.nodeType === NODE_TYPES.START);

    if (starts.length !== 1) errs.push("There must be exactly one Start node.");
    if (starts.length === 1) {
      const hasOut = edges.some((e) => e.source === starts[0].id);
      if (!hasOut) errs.push("Start node must have an outgoing edge.");
    }
    nodes.forEach((n) => {
      const hasIn = edges.some((e) => e.target === n.id);
      const hasOut = edges.some((e) => e.source === n.id);
      if (!hasIn && !hasOut) errs.push(`Node "${n.data.label}" is isolated.`);
    });

    return errs;
  }

  async function onSimulate() {
    setErrors([]);
    setTrace(null);
    const wf = getWorkflow();
    const errs = validateWorkflow(wf);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setRunning(true);
    const res = await simulateWorkflow(wf);
    setTrace(res.trace || []);
    setRunning(false);
  }

  function onExport() {
    const wf = getWorkflow();
    const blob = new Blob([JSON.stringify(wf, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workflow.json";
    a.click();
  }

  function onImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wf = JSON.parse(evt.target.result);
      loadWorkflow && loadWorkflow(wf);
    };
    reader.readAsText(file);
  }

  function onTraceClick(item) {
    if (!item) return;
    if (!item.nodeId) {
      console.warn("trace item has no nodeId:", item);
      return;
    }
    focusNode && focusNode(item.nodeId);
  }

  return (
    <div
      style={{
        padding: 12,
        borderTop: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h4 style={{ marginTop: 0 }}>Simulation</h4>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={onSimulate}
          disabled={running}
          style={{ padding: "8px 10px" }}
        >
          {running ? "Running..." : "Simulate"}
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onExport} style={{ padding: "8px 10px" }}>
            Export
          </button>

          <button
            onClick={() => autoLayout && autoLayout()}
            style={{ padding: "8px 10px" }}
          >
            Auto Arrange
          </button>

          <button
            onClick={() => undo && undo()}
            style={{ padding: "8px 10px" }}
          >
            Undo
          </button>

          <button
            onClick={() => redo && redo()}
            style={{ padding: "8px 10px" }}
          >
            Redo
          </button>

          <button
            onClick={() => duplicate && duplicate()}
            style={{ padding: "8px 10px" }}
          >
            Duplicate Selected
          </button>

          <button
            onClick={() => deleteSelected && deleteSelected()}
            style={{
              padding: "8px 10px",
              background: "#e53935",
              color: "#fff",
            }}
          >
            Delete Selected
          </button>

          <label
            style={{
              cursor: "pointer",
              paddingLeft: 8,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Import
            <input type="file" hidden onChange={onImport} />
          </label>
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ color: "red" }}>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {trace && (
        <ol style={{ marginTop: 8 }}>
          {trace.map((t, i) => (
            <li
              key={i}
              style={{
                cursor: "pointer",
                padding: "6px 4px",
                borderBottom: "1px solid #eee",
              }}
              onClick={() => onTraceClick(t)}
            >
              <div style={{ fontWeight: 600 }}>{t.message}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                nodeId: {t.nodeId}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
