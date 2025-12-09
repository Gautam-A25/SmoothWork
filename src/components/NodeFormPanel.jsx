import React, { useEffect, useState } from "react";
import { automations } from "../api/mockApi";
import { NODE_TYPES } from "../types";

export default function NodeFormPanel({ node, onChange }) {
  const [local, setLocal] = useState(null);
  const [availableAutomations, setAvailableAutomations] = useState([]);

  useEffect(() => {
    setAvailableAutomations(Array.isArray(automations) ? automations : []);
  }, []);

  useEffect(() => {
    setLocal(node && node.data ? { ...node.data } : null);
  }, [node]);

  // Shared field styles for consistent spacing and alignment
  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 12,
  };

  const inputStyle = {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: 64,
    resize: "vertical",
  };

  const smallButtonStyle = {
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  };

  if (!node || !local) {
    return (
      <aside style={{ width: 340, padding: 12, borderLeft: "1px solid #ddd" }}>
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

  function updateObjectField(rootKey, key, value) {
    pushChange({
      ...local,
      [rootKey]: {
        ...(local[rootKey] || {}),
        [key]: value,
      },
    });
  }

  function addKeyValue(rootKey) {
    updateObjectField(rootKey, `key_${Date.now()}`, "");
  }

  function removeKeyValue(rootKey, key) {
    const next = { ...(local[rootKey] || {}) };
    delete next[key];
    pushChange({ ...local, [rootKey]: next });
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

      {/* START */}
      {type === NODE_TYPES.START && (
        <>
          <div style={fieldStyle}>
            <label>Title</label>
            <input
              style={inputStyle}
              value={local.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Description</label>
            <textarea
              style={textareaStyle}
              value={local.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Metadata</label>
            {Object.entries(local.metadata || {}).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={v}
                  placeholder={k}
                  onChange={(e) =>
                    updateObjectField("metadata", k, e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => removeKeyValue("metadata", k)}
                  style={{ ...smallButtonStyle, padding: "6px 8px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addKeyValue("metadata")}
              style={smallButtonStyle}
            >
              Add Metadata Field
            </button>
          </div>
        </>
      )}

      {/* TASK */}
      {type === NODE_TYPES.TASK && (
        <>
          <div style={fieldStyle}>
            <label>Title</label>
            <input
              style={inputStyle}
              value={local.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Description</label>
            <textarea
              style={textareaStyle}
              value={local.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Assignee</label>
            <input
              style={inputStyle}
              value={local.assignee || ""}
              onChange={(e) => updateField("assignee", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Due Date</label>
            <input
              style={inputStyle}
              type="date"
              value={local.dueDate || ""}
              onChange={(e) => updateField("dueDate", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Custom Fields</label>
            {Object.entries(local.customFields || {}).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={v}
                  placeholder={k}
                  onChange={(e) =>
                    updateObjectField("customFields", k, e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => removeKeyValue("customFields", k)}
                  style={{ ...smallButtonStyle, padding: "6px 8px" }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addKeyValue("customFields")}
              style={smallButtonStyle}
            >
              Add Custom Field
            </button>
          </div>
        </>
      )}

      {/* APPROVAL */}
      {type === NODE_TYPES.APPROVAL && (
        <>
          <div style={fieldStyle}>
            <label>Title</label>
            <input
              style={inputStyle}
              value={local.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Approver</label>
            <input
              style={inputStyle}
              value={local.approver || ""}
              onChange={(e) => updateField("approver", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Condition</label>
            <input
              style={inputStyle}
              value={local.condition || ""}
              onChange={(e) => updateField("condition", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Auto-approve Threshold</label>
            <input
              style={inputStyle}
              type="number"
              value={local.autoApproveThreshold || ""}
              onChange={(e) =>
                updateField("autoApproveThreshold", e.target.value)
              }
            />
          </div>
        </>
      )}

      {/* AUTOMATED */}
      {type === NODE_TYPES.AUTOMATED && (
        <>
          <div style={fieldStyle}>
            <label>Title</label>
            <input
              style={inputStyle}
              value={local.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Action</label>
            <select
              style={inputStyle}
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
          </div>

          {local.params &&
            Object.keys(local.params).map((p) => (
              <div key={p} style={fieldStyle}>
                <label style={{ textTransform: "capitalize" }}>{p}</label>
                <input
                  style={inputStyle}
                  value={local.params[p]}
                  onChange={(e) =>
                    pushChange({
                      ...local,
                      params: {
                        ...local.params,
                        [p]: e.target.value,
                      },
                    })
                  }
                />
              </div>
            ))}
        </>
      )}

      {/* END */}
      {type === NODE_TYPES.END && (
        <>
          <div style={fieldStyle}>
            <label>Title</label>
            <input
              style={inputStyle}
              value={local.label || ""}
              onChange={(e) => updateField("label", e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label>Summary</label>
            <textarea
              style={textareaStyle}
              value={local.summary || ""}
              onChange={(e) => updateField("summary", e.target.value)}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <input
              id="showSummary"
              type="checkbox"
              checked={!!local.showSummary}
              onChange={(e) => updateField("showSummary", e.target.checked)}
            />
            <label htmlFor="showSummary">Show Summary</label>
          </div>
        </>
      )}

      <button
        onClick={() => {
          onChange && onChange({ ...node, __delete: true });
        }}
        style={{
          marginTop: 8,
          background: "#e53935",
          color: "#fff",
          border: "none",
          padding: "10px 12px",
          cursor: "pointer",
          borderRadius: 6,
          width: "100%",
        }}
      >
        Delete Node
      </button>
    </aside>
  );
}
