import React, { useState } from "react";
import { simulateWorkflow } from "../api/mockApi";
import { NODE_TYPES } from "../types";

export default function SimulationPanel({
  getWorkflow,
  loadWorkflow,
  focusNode,
  autoLayout,
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
    console.log("trace item clicked:", item);
    if (!item) return;
    if (!item.nodeId) {
      console.warn("trace item has no nodeId:", item);
      return;
    }
    focusNode && focusNode(item.nodeId);
  }

  return (
    <div style={{ padding: 12, borderTop: "1px solid #ddd" }}>
      <h4>Simulation</h4>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={onSimulate} disabled={running}>
          {running ? "Running..." : "Simulate"}
        </button>

        <button onClick={onExport}>Export</button>

        <button onClick={() => autoLayout && autoLayout()}>Auto Arrange</button>

        <label style={{ cursor: "pointer", paddingLeft: 8 }}>
          Import
          <input type="file" hidden onChange={onImport} />
        </label>
      </div>

      {errors.length > 0 && (
        <div style={{ color: "red", marginBottom: 8 }}>
          <ul>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {trace && (
        <ol>
          {trace.map((t, i) => (
            <li
              key={i}
              style={{ cursor: "pointer", padding: "6px 4px" }}
              onClick={() => onTraceClick(t)}
            >
              {t.message}
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
