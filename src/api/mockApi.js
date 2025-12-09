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
 * Simulate workflow.
 * Accepts: { nodes: [...], edges: [...] }
 * Returns: { success: true, trace: [...] } or { success: false, error: "..." }
 */
export async function simulateWorkflow(workflow) {
  // tiny artificial delay
  await new Promise((res) => setTimeout(res, 400));

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return { success: false, error: "Invalid workflow payload" };
  }

  // produce a basic trace in insertion order (for prototype)
  try {
    const trace = (workflow.nodes || []).map((n, idx) => ({
      step: idx + 1,
      nodeId: n.id,
      nodeType: n.data?.nodeType || "unknown",
      message: `Executed ${n.data?.nodeType || "node"} (${
        n.data?.label || n.id
      })`,
    }));

    return { success: true, trace };
  } catch (err) {
    return { success: false, error: err.message || "Simulation failed" };
  }
}
