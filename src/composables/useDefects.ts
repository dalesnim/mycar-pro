import { computed, ref, watch } from "vue";
import type {
  Defect,
  DefectStatus,
  DefectType,
  VinSummary,
} from "../types/defect";
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
  const vins = ref<VinSummary[]>([]);
  const selectedId = ref<string | null>(null);
  const draft = ref<MarkerDraft | null>(null);
  const currentVin = ref("Z94C241BBLR000001");
  const filterTypeId = ref("");
  const filterStatus = ref<DefectStatus | "">("");
  const loading = ref(false);
  const apiError = ref("");
  const lastSyncAt = ref<Date | null>(null);

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
      const [list, types, vinList] = await Promise.all([
        api.listDefects(currentVin.value),
        api.listDefectTypes(),
        api.listVins(),
      ]);
      defects.value = list;
      defectTypes.value = types;
      vins.value = vinList;
      apiError.value = "";
      lastSyncAt.value = new Date();
    } catch (e) {
      reportTransportError(e);
    } finally {
      loading.value = false;
    }
  }

  /** Все дефекты завода (для журнала и аналитики). */
  function listAll(): Promise<Defect[]> {
    return api.listDefects();
  }

  async function refreshVins(): Promise<void> {
    try {
      vins.value = await api.listVins();
    } catch (e) {
      reportTransportError(e);
    }
  }

  /** Регистрация чистого кузова; возвращает текст ошибки или "" при успехе. */
  async function addVin(vin: string): Promise<string> {
    const trimmed = vin.trim();
    if (!trimmed) return "Укажите VIN кузова";
    try {
      await api.createVin(trimmed);
      await refreshVins();
      currentVin.value = trimmed;
      return "";
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        return e.errors.vin ?? e.message;
      }
      reportTransportError(e);
      return OFFLINE_HINT;
    }
  }

  function typeName(typeId: string): string {
    return defectTypes.value.find((t) => t.id === typeId)?.name ?? typeId;
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
      void refreshVins();
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
    void refreshVins();
  }

  async function changeStatus(id: string, to: DefectStatus): Promise<boolean> {
    const defect = defects.value.find((d) => d.id === id);
    if (!defect || !canTransition(defect.status, to)) return false;
    try {
      const updated = await api.updateDefect(id, { status: to });
      Object.assign(defect, updated);
      apiError.value = "";
      void refreshVins();
      return true;
    } catch (e) {
      reportTransportError(e);
      return false;
    }
  }

  return {
    defects,
    defectTypes,
    vins,
    selectedId,
    draft,
    currentVin,
    filterTypeId,
    filterStatus,
    loading,
    apiError,
    lastSyncAt,
    bodyDefects,
    visibleDefects,
    selectedDefect,
    summary,
    refresh,
    refreshVins,
    listAll,
    addVin,
    typeName,
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

const SYNC_INTERVAL_MS = 15000;

let store: ReturnType<typeof createDefectStore> | null = null;

export function useDefects() {
  if (!store) {
    store = createDefectStore();
    void store.refresh();
    // фоновая синхронизация: данные меняют и другие рабочие места
    if (typeof document !== "undefined") {
      setInterval(() => {
        if (!document.hidden) void store!.refresh();
      }, SYNC_INTERVAL_MS);
    }
  }
  return store;
}
