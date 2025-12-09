import React, { useRef, useState } from "react";
import FlowCanvas from "./components/FlowCanvas";
import Sidebar from "./components/Sidebar";
import NodeFormPanel from "./components/NodeFormPanel";
import SimulationPanel from "./components/SimulationPanel";

export default function App() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeEdits, setNodeEdits] = useState(null);

  const workflowGetterRef = useRef(null);
  const workflowLoaderRef = useRef(null);
  const nodeFocusRef = useRef(null); // will hold the focus function
  const autoLayoutRef = useRef(null);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />

      <FlowCanvas
        onSelectNode={setSelectedNode}
        nodeEdits={nodeEdits}
        clearNodeEdits={() => setNodeEdits(null)}
        setWorkflowGetter={(fn) => (workflowGetterRef.current = fn)}
        setWorkflowLoader={(fn) => (workflowLoaderRef.current = fn)}
        setNodeFocusHandler={(fn) => (nodeFocusRef.current = fn)}
        setAutoLayoutHandler={(fn) => (autoLayoutRef.current = fn)}
      />

      <div style={{ display: "flex", flexDirection: "column", width: 340 }}>
        <NodeFormPanel
          node={selectedNode}
          onChange={(updated) => {
            setSelectedNode(updated);
            setNodeEdits(updated);
          }}
        />

        <SimulationPanel
          getWorkflow={() =>
            workflowGetterRef.current
              ? workflowGetterRef.current()
              : { nodes: [], edges: [] }
          }
          loadWorkflow={(wf) => {
            workflowLoaderRef.current && workflowLoaderRef.current(wf);
          }}
          focusNode={(id) => nodeFocusRef.current && nodeFocusRef.current(id)}
          autoLayout={() => autoLayoutRef.current && autoLayoutRef.current()} // ✅ ADD
        />
      </div>
    </div>
  );
}
