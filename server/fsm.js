// Серверная копия домена: правила нельзя обойти, минуя фронт (см. ТЗ).
export const DEFECT_STATUSES = ["новый", "в ремонте", "устранён", "отклонён"];

export const SEVERITIES = ["незначительный", "значительный", "критический"];

export const TRANSITIONS = {
  "новый": ["в ремонте", "отклонён"],
  "в ремонте": ["устранён", "отклонён"],
  "устранён": [],
  "отклонён": [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to);
}

// Открытые статусы блокируют выдачу кузова (правило годности PDI).
export const OPEN_STATUSES = ["новый", "в ремонте"];
