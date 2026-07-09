import { DEFECT_CATALOG } from "../data/defectCatalog";
import type { DefectType, Severity } from "../types/defect";

export interface DraftFields {
  typeId: string;
  zone: string;
  severity: Severity;
  comment: string;
}

export interface ValidationErrors {
  typeId?: string;
  zone?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationErrors;
}

export function validateDraft(
  fields: DraftFields,
  catalog: DefectType[] = DEFECT_CATALOG,
): ValidationResult {
  const errors: ValidationErrors = {};

  if (!fields.typeId) {
    errors.typeId = "Выберите тип дефекта";
  } else if (!catalog.some((t) => t.id === fields.typeId)) {
    errors.typeId = "Неизвестный тип дефекта";
  }

  if (!fields.zone.trim()) {
    errors.zone = "Укажите зону кузова";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
