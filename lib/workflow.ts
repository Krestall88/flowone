export const ACTION_CONFIG = {
  approve: {
    label: "Утверждение",
    description: "Утвердить регламент/инструкцию",
    primaryButton: "Утвердить",
  },
  sign: {
    label: "Утверждение (подпись)",
    description: "Утвердить регламент подписью",
    primaryButton: "Подписать",
  },
  review: {
    label: "Ознакомление",
    description: "Ознакомиться с регламентом",
    primaryButton: "Ознакомлен",
  },
} as const;

export type TaskAction = keyof typeof ACTION_CONFIG;
export const TASK_ACTIONS = Object.keys(ACTION_CONFIG) as TaskAction[];

export const ROLE_LABELS: Record<string, { label: string; description?: string }> = {
  director: { label: "Директор", description: "Руководство компании" },
  accountant: { label: "Главный бухгалтер", description: "Финансовый контроль" },
  head: { label: "Руководитель подразделения", description: "Проверка бюджета" },
  employee: { label: "Сотрудник", description: "Исполнитель" },
};

export function getActionMeta(action: TaskAction) {
  return ACTION_CONFIG[action] ?? ACTION_CONFIG.approve;
}

export function getRoleMeta(role: string) {
  return ROLE_LABELS[role] ?? { label: role };
}
