import { computed, ref } from "vue";
import type { Defect, DefectStatus } from "../types/defect";
import { canTransition } from "../logic/fsm";
import { summarizeByStatus } from "../logic/summary";
import {
  validateDraft,
  type DraftFields,
  type ValidationResult,
} from "../logic/validation";

export interface MarkerDraft {
  x: number;
  y: number;
  z: number;
  zone: string;
}

export function createDefectStore() {
  const defects = ref<Defect[]>([]);
  const selectedId = ref<string | null>(null);
  const draft = ref<MarkerDraft | null>(null);
  const currentVin = ref("Z94C241BBLR000001");
  const filterTypeId = ref("");
  const filterStatus = ref<DefectStatus | "">("");

  const bodyDefects = computed(() =>
    defects.value.filter((d) => d.vin === currentVin.value),
  );

  const visibleDefects = computed(() =>
    bodyDefects.value.filter(
      (d) =>
        (!filterTypeId.value || d.typeId === filterTypeId.value) &&
        (!filterStatus.value || d.status === filterStatus.value),
    ),
  );

  const selectedDefect = computed(
    () => defects.value.find((d) => d.id === selectedId.value) ?? null,
  );

  const summary = computed(() => summarizeByStatus(bodyDefects.value));

  function startDraft(x: number, y: number, zone: string, z: number) {
    draft.value = { x, y, z, zone };
    selectedId.value = null;
  }

  function cancelDraft() {
    draft.value = null;
  }

  function selectDefect(id: string) {
    selectedId.value = id;
    draft.value = null;
  }

  function clearSelection() {
    selectedId.value = null;
  }

  function saveDraft(fields: DraftFields): ValidationResult {
    if (!draft.value) return { ok: false, errors: {} };
    const result = validateDraft(fields);
    if (!result.ok) return result;

    const id = crypto.randomUUID();
    defects.value.push({
      id,
      vin: currentVin.value,
      zone: fields.zone,
      x: draft.value.x,
      y: draft.value.y,
      z: draft.value.z,
      typeId: fields.typeId,
      severity: fields.severity,
      status: "новый",
      comment: fields.comment,
    });
    draft.value = null;
    selectedId.value = id;
    return result;
  }

  function updateDefect(id: string, fields: DraftFields): ValidationResult {
    const defect = defects.value.find((d) => d.id === id);
    if (!defect) return { ok: false, errors: {} };
    const result = validateDraft(fields);
    if (!result.ok) return result;

    defect.typeId = fields.typeId;
    defect.zone = fields.zone;
    defect.severity = fields.severity;
    defect.comment = fields.comment;
    return result;
  }

  function deleteDefect(id: string) {
    defects.value = defects.value.filter((d) => d.id !== id);
    if (selectedId.value === id) selectedId.value = null;
  }

  function changeStatus(id: string, to: DefectStatus): boolean {
    const defect = defects.value.find((d) => d.id === id);
    if (!defect || !canTransition(defect.status, to)) return false;
    defect.status = to;
    return true;
  }

  return {
    defects,
    selectedId,
    draft,
    currentVin,
    filterTypeId,
    filterStatus,
    bodyDefects,
    visibleDefects,
    selectedDefect,
    summary,
    startDraft,
    cancelDraft,
    selectDefect,
    clearSelection,
    saveDraft,
    updateDefect,
    deleteDefect,
    changeStatus,
  };
}

const store = createDefectStore();

export function useDefects() {
  return store;
}
