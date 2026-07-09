import { DEFECT_STATUSES, type Defect, type DefectStatus } from "../types/defect";

export type StatusSummary = Record<DefectStatus, number>;

function emptySummary(): StatusSummary {
  return Object.fromEntries(
    DEFECT_STATUSES.map((status) => [status, 0]),
  ) as StatusSummary;
}

export function summarizeByStatus(defects: Defect[]): StatusSummary {
  const counts = emptySummary();
  for (const d of defects) counts[d.status]++;
  return counts;
}
