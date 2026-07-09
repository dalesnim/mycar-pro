import type { DefectStatus } from "../types/defect";

export const TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
  "новый": ["в ремонте", "отклонён"],
  "в ремонте": ["устранён", "отклонён"],
  "устранён": [],
  "отклонён": [],
};

export function canTransition(from: DefectStatus, to: DefectStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: DefectStatus): DefectStatus[] {
  return TRANSITIONS[from];
}
