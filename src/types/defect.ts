export const DEFECT_STATUSES = ["новый", "в ремонте", "устранён", "отклонён"] as const;
export type DefectStatus = (typeof DEFECT_STATUSES)[number];

export const SEVERITIES = ["незначительный", "значительный", "критический"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface DefectType {
  id: string;
  name: string;
  category: string;
}

export interface Defect {
  id: string;
  vin: string;
  zone: string;
  x: number;
  y: number;
  z: number;
  typeId: string;
  severity: Severity;
  status: DefectStatus;
  comment: string;
  createdAt: string;
}
