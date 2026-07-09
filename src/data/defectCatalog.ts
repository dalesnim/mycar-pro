import type { DefectType } from "../types/defect";

export const DEFECT_CATALOG: DefectType[] = [
  { id: "paint", name: "окраска", category: "ЛКП" },
  { id: "dent", name: "вмятина", category: "кузов" },
  { id: "gap", name: "зазор", category: "геометрия" },
  { id: "chip", name: "скол", category: "ЛКП" },
];
