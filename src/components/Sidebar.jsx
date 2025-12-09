import React from "react";
import { NODE_TYPES } from "../types";

/*
  Sidebar
  - Simple node palette used to drag new nodes onto the canvas.
*/

const NODES = [
  { type: NODE_TYPES.START, label: "Start" },
  { type: NODE_TYPES.TASK, label: "Task" },
  { type: NODE_TYPES.APPROVAL, label: "Approval" },
  { type: NODE_TYPES.AUTOMATED, label: "Automated" },
  { type: NODE_TYPES.END, label: "End" },
];

export default function Sidebar() {
  const onDragStart = (e, type) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside style={{ width: 180, padding: 12, borderRight: "1px solid #ddd" }}>
      <h4>Nodes</h4>

      {NODES.map((node) => (
        <div
          key={node.type}
          draggable
          onDragStart={(e) => onDragStart(e, node.type)}
          style={{
            padding: 8,
            border: "1px solid #aaa",
            borderRadius: 6,
            marginBottom: 10,
            cursor: "grab",
            background: "#fff",
          }}
        >
          {node.label}
        </div>
      ))}
    </aside>
  );
}
