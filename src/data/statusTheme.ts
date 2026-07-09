import type { DefectStatus } from "../types/defect";

export const STATUS_COLORS: Record<DefectStatus, string> = {
  "новый": "#e5484d",
  "в ремонте": "#f0a02f",
  "устранён": "#2fa44f",
  "отклонён": "#8b93a1",
};
