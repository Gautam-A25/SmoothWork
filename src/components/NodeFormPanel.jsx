import React, { useEffect, useState } from "react";
import { automations } from "../api/mockApi";
import { NODE_TYPES } from "../types";

/*
  NodeFormPanel
  - Shows editable fields for the currently selected node.
  - Keeps a local copy of node.data while the user edits fields,
    and calls `onChange` (parent) with the updated node when fields change.
*/

export default function NodeFormPanel({ node, onChange }) {
  const [local, setLocal] = useState(null);
  const [availableAutomations, setAvailableAutomations] = useState([]);

  useEffect(() => {
    setAvailableAutomations(Array.isArray(automations) ? automations : []);
  }, []);

  useEffect(() => {
    setLocal(node && node.data ? { ...node.data } : null);
  }, [node]);

  // Safety: render placeholder when nothing is selected
  if (!node || !local) {
    return (
      <aside style={{ width: 320, padding: 12, borderLeft: "1px solid #ddd" }}>
        <h4>Node Properties</h4>
        <p style={{ color: "#666" }}>Select a node to edit</p>
      </aside>
    );
  }

  const type = local.nodeType;

  function pushChange(nextData) {
    setLocal(nextData);
    onChange && onChange({ ...node, data: nextData });
  }

  function updateField(key, value) {
    pushChange({ ...local, [key]: value });
  }

  function handleActionChange(actionId) {
    const action = availableAutomations.find((a) => a.id === actionId);
    const params = {};

    if (action?.params?.length) {
      action.params.forEach((p) => {
        params[p] = local.params?.[p] || "";
      });
    }

    pushChange({ ...local, actionId, params });
  }

  return (
    <aside style={{ width: 340, padding: 12, borderLeft: "1px solid #ddd" }}>
      <h4>Edit Node</h4>

      <div style={{ marginBottom: 10 }}>
        <strong>Type:</strong> {type}
      </div>

      {type === NODE_TYPES.START && (
        <>
          <label>Title</label>
          <input
            type="text"
            value={local.label || ""}
            onChange={(e) => updateField("label", e.target.value)}
          />

          <label>Description</label>
          <textarea
            rows={3}
            value={local.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </>
      )}

      {type === NODE_TYPES.TASK && (
        <>
          <label>Title</label>
          <input
            type="text"
            value={local.label || ""}
            onChange={(e) => updateField("label", e.target.value)}
          />

          <label>Description</label>
          <textarea
            rows={3}
            value={local.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
          />

          <label>Assignee</label>
          <input
            type="text"
            value={local.assignee || ""}
            onChange={(e) => updateField("assignee", e.target.value)}
          />
        </>
      )}

      {type === NODE_TYPES.APPROVAL && (
        <>
          <label>Title</label>
          <input
            type="text"
            value={local.label || ""}
            onChange={(e) => updateField("label", e.target.value)}
          />

          <label>Approver</label>
          <input
            type="text"
            value={local.approver || ""}
            onChange={(e) => updateField("approver", e.target.value)}
          />

          <label>Condition</label>
          <input
            type="text"
            value={local.condition || ""}
            onChange={(e) => updateField("condition", e.target.value)}
          />
        </>
      )}

      {type === NODE_TYPES.AUTOMATED && (
        <>
          <label>Title</label>
          <input
            type="text"
            value={local.label || ""}
            onChange={(e) => updateField("label", e.target.value)}
          />

          <label>Action</label>
          <select
            value={local.actionId || ""}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="">-- choose an action --</option>
            {availableAutomations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

          {local.params &&
            Object.keys(local.params).map((p) => (
              <div key={p}>
                <label>{p}</label>
                <input
                  type="text"
                  value={local.params[p]}
                  onChange={(e) =>
                    pushChange({
                      ...local,
                      params: { ...local.params, [p]: e.target.value },
                    })
                  }
                />
              </div>
            ))}
        </>
      )}

      {type === NODE_TYPES.END && (
        <>
          <label>Title</label>
          <input
            type="text"
            value={local.label || ""}
            onChange={(e) => updateField("label", e.target.value)}
          />

          <label>Summary</label>
          <textarea
            rows={3}
            value={local.summary || ""}
            onChange={(e) => updateField("summary", e.target.value)}
          />
        </>
      )}

      <button
        onClick={() => {
          onChange && onChange({ ...node, __delete: true });
        }}
        style={{
          marginTop: 16,
          background: "#e53935",
          color: "#fff",
          border: "none",
          padding: "8px 12px",
          cursor: "pointer",
          borderRadius: 4,
        }}
      >
        Delete Node
      </button>
    </aside>
  );
}
