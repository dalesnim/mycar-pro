import { computed, ref, watch } from "vue";
import type { Defect, DefectStatus, DefectType } from "../types/defect";
import { canTransition } from "../logic/fsm";
import { summarizeByStatus } from "../logic/summary";
import {
  validateDraft,
  type DraftFields,
  type ValidationResult,
} from "../logic/validation";
import {
  ApiError,
  createHttpApi,
  type DefectApi,
} from "../api/client";
import { DEFECT_CATALOG } from "../data/defectCatalog";

export interface MarkerDraft {
  x: number;
  y: number;
  z: number;
  zone: string;
}

const OFFLINE_HINT =
  "Сервер недоступен. Запустите API: npm run server (http://localhost:3001)";

export function createDefectStore(api: DefectApi = createHttpApi()) {
  const defects = ref<Defect[]>([]);
  const defectTypes = ref<DefectType[]>([...DEFECT_CATALOG]);
  const selectedId = ref<string | null>(null);
  const draft = ref<MarkerDraft | null>(null);
  const currentVin = ref("Z94C241BBLR000001");
  const filterTypeId = ref("");
  const filterStatus = ref<DefectStatus | "">("");
  const loading = ref(false);
  const apiError = ref("");

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

  function reportTransportError(e: unknown) {
    apiError.value = e instanceof ApiError ? e.message : OFFLINE_HINT;
  }

  /** 400 сервера превращаем в ошибки полей формы; сетевой сбой — в баннер. */
  function toValidationResult(e: unknown): ValidationResult {
    if (e instanceof ApiError && e.status === 400) {
      return { ok: false, errors: e.errors };
    }
    reportTransportError(e);
    return { ok: false, errors: {} };
  }

  async function refresh(): Promise<void> {
    loading.value = true;
    try {
      const [list, types] = await Promise.all([
        api.listDefects(currentVin.value),
        api.listDefectTypes(),
      ]);
      defects.value = list;
      defectTypes.value = types;
      apiError.value = "";
    } catch (e) {
      reportTransportError(e);
    } finally {
      loading.value = false;
    }
  }

  watch(currentVin, () => {
    selectedId.value = null;
    draft.value = null;
    void refresh();
  });

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

  async function saveDraft(fields: DraftFields): Promise<ValidationResult> {
    if (!draft.value) return { ok: false, errors: {} };
    const result = validateDraft(fields, defectTypes.value);
    if (!result.ok) return result;

    try {
      const created = await api.createDefect({
        vin: currentVin.value,
        zone: fields.zone,
        x: draft.value.x,
        y: draft.value.y,
        z: draft.value.z,
        typeId: fields.typeId,
        severity: fields.severity,
        comment: fields.comment,
      });
      defects.value.push(created);
      draft.value = null;
      selectedId.value = created.id;
      apiError.value = "";
      return { ok: true, errors: {} };
    } catch (e) {
      return toValidationResult(e);
    }
  }

  async function updateDefect(
    id: string,
    fields: DraftFields,
  ): Promise<ValidationResult> {
    const defect = defects.value.find((d) => d.id === id);
    if (!defect) return { ok: false, errors: {} };
    const result = validateDraft(fields, defectTypes.value);
    if (!result.ok) return result;

    try {
      const updated = await api.updateDefect(id, {
        typeId: fields.typeId,
        zone: fields.zone,
        severity: fields.severity,
        comment: fields.comment,
      });
      Object.assign(defect, updated);
      apiError.value = "";
      return { ok: true, errors: {} };
    } catch (e) {
      return toValidationResult(e);
    }
  }

  async function deleteDefect(id: string): Promise<void> {
    try {
      await api.deleteDefect(id);
      apiError.value = "";
    } catch (e) {
      // 404 = на сервере уже нет; из локального списка всё равно убираем
      if (!(e instanceof ApiError && e.status === 404)) {
        reportTransportError(e);
        return;
      }
    }
    defects.value = defects.value.filter((d) => d.id !== id);
    if (selectedId.value === id) selectedId.value = null;
  }

  async function changeStatus(id: string, to: DefectStatus): Promise<boolean> {
    const defect = defects.value.find((d) => d.id === id);
    if (!defect || !canTransition(defect.status, to)) return false;
    try {
      const updated = await api.updateDefect(id, { status: to });
      Object.assign(defect, updated);
      apiError.value = "";
      return true;
    } catch (e) {
      reportTransportError(e);
      return false;
    }
  }

  return {
    defects,
    defectTypes,
    selectedId,
    draft,
    currentVin,
    filterTypeId,
    filterStatus,
    loading,
    apiError,
    bodyDefects,
    visibleDefects,
    selectedDefect,
    summary,
    refresh,
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

let store: ReturnType<typeof createDefectStore> | null = null;

export function useDefects() {
  if (!store) {
    store = createDefectStore();
    void store.refresh();
  }
  return store;
}
