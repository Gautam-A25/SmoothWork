export const NODE_TYPES = {
  START: "start",
  TASK: "task",
  APPROVAL: "approval",
  AUTOMATED: "automated",
  END: "end",
};

/*
  Default data shape for each node type.
  This keeps the editor forms predictable and avoids undefined fields.
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
    condition: "",
  },

  [NODE_TYPES.AUTOMATED]: {
    label: "Automated",
    actionId: "",
    params: {},
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
