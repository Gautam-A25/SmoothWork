export const automations = [
  {
    id: "send_email",
    label: "Send Email",
    params: ["to", "subject"],
  },
  {
    id: "generate_doc",
    label: "Generate Document",
    params: ["template", "user"],
  },
];

/**
 * Simulates the execution of a workflow.
 * Returns a step-by-step execution trace for each node.
 */
export async function simulateWorkflow(workflow) {
  // Simulated network / processing delay
  await new Promise((res) => setTimeout(res, 400));

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return { success: false, error: "Invalid workflow payload" };
  }

  try {
    const trace = workflow.nodes.map((node, index) => ({
      step: index + 1,
      nodeId: node.id,
      nodeType: node.data?.nodeType || "unknown",
      message: `Executed ${node.data?.nodeType || "node"} (${
        node.data?.label || node.id
      })`,
    }));

    return { success: true, trace };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Simulation failed",
    };
  }
}
