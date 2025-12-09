export const NODE_TYPES = {
  START: "start",
  TASK: "task",
  APPROVAL: "approval",
  AUTOMATED: "automated",
  END: "end",
};

/**
 * Default data structure for nodes of each type.
 * Ensures forms have predictable fields to bind to.
 */
export const DEFAULT_NODE_DATA = {
  [NODE_TYPES.START]: {
    label: "Start",
    description: "",
  },
  [NODE_TYPES.TASK]: {
    label: "Task",
    description: "",
    assignee: "",
  },
  [NODE_TYPES.APPROVAL]: {
    label: "Approval",
    approver: "",
    condition: "", // e.g. "amount > 1000"
  },
  [NODE_TYPES.AUTOMATED]: {
    label: "Automated",
    actionId: "", // references an automations id from mockApi
    params: {}, // map of parameter values keyed by param name
  },
  [NODE_TYPES.END]: {
    label: "End",
    summary: "",
  },
};

export const NODE_STATUS = {
  VALID: "valid",
  INVALID: "invalid",
};
