<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useDefects } from "../composables/useDefects";
import { DEFECT_CATALOG } from "../data/defectCatalog";
import { ZONE_IDS } from "../data/bodyZones";
import { SEVERITIES, type DefectStatus, type Severity } from "../types/defect";
import { allowedTransitions } from "../logic/fsm";
import { STATUS_COLORS } from "../data/statusTheme";
import type { ValidationErrors } from "../logic/validation";

const store = useDefects();
const { draft, selectedDefect } = store;

const zoneOptions = ZONE_IDS;

const form = reactive({
  typeId: "",
  zone: "",
  severity: SEVERITIES[0] as Severity,
  comment: "",
});
const errors = reactive<ValidationErrors>({});

const mode = computed(() =>
  draft.value ? "create" : selectedDefect.value ? "edit" : "empty",
);

const nextStatuses = computed<DefectStatus[]>(() =>
  selectedDefect.value ? allowedTransitions(selectedDefect.value.status) : [],
);

function clearErrors() {
  errors.typeId = undefined;
  errors.zone = undefined;
}

function applyValidationErrors(res: { errors: ValidationErrors }) {
  errors.typeId = res.errors.typeId;
  errors.zone = res.errors.zone;
}

function onSave() {
  if (mode.value === "create") {
    applyValidationErrors(store.saveDraft({ ...form }));
  } else if (mode.value === "edit") {
    const d = selectedDefect.value;
    if (!d) return;
    applyValidationErrors(store.updateDefect(d.id, { ...form }));
  }
}

function onCancel() {
  if (mode.value === "create") store.cancelDraft();
  else store.clearSelection();
}

function onDelete() {
  const d = selectedDefect.value;
  if (d) store.deleteDefect(d.id);
}

function onStatusChange(to: DefectStatus) {
  const d = selectedDefect.value;
  if (d) store.changeStatus(d.id, to);
}

watch(draft, (d) => {
  if (d) {
    form.typeId = "";
    form.zone = d.zone;
    form.severity = SEVERITIES[0];
    form.comment = "";
    clearErrors();
  }
});

watch(selectedDefect, (d) => {
  if (d) {
    form.typeId = d.typeId;
    form.zone = d.zone;
    form.severity = d.severity;
    form.comment = d.comment;
    clearErrors();
  }
});
</script>

<template>
  <section class="card">
    <h2 class="card-title">Карточка дефекта</h2>

    <p v-if="mode === 'empty'" class="placeholder">
      Кликните по схеме, чтобы добавить дефект,<br />
      или выберите маркер / строку списка.
    </p>

    <form v-else class="form" @submit.prevent="onSave">
      <div class="field">
        <label for="f-type">Тип дефекта *</label>
        <select id="f-type" v-model="form.typeId" :class="{ invalid: errors.typeId }">
          <option value="" disabled>— выберите тип —</option>
          <option v-for="t in DEFECT_CATALOG" :key="t.id" :value="t.id">
            {{ t.name }} ({{ t.category }})
          </option>
        </select>
        <p v-if="errors.typeId" class="error">{{ errors.typeId }}</p>
      </div>

      <div class="field">
        <label for="f-zone">Зона кузова *</label>
        <select id="f-zone" v-model="form.zone" :class="{ invalid: errors.zone }">
          <option value="" disabled>— укажите зону —</option>
          <option v-for="z in zoneOptions" :key="z" :value="z">{{ z }}</option>
        </select>
        <p v-if="errors.zone" class="error">{{ errors.zone }}</p>
      </div>

      <div class="field">
        <label for="f-severity">Серьёзность</label>
        <select id="f-severity" v-model="form.severity">
          <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="field">
        <label for="f-comment">Комментарий</label>
        <textarea id="f-comment" v-model="form.comment" rows="2"></textarea>
      </div>

      <div v-if="mode === 'edit' && selectedDefect" class="status-row">
        <span
          class="badge"
          :style="{ backgroundColor: STATUS_COLORS[selectedDefect.status] }"
        >
          {{ selectedDefect.status }}
        </span>
        <button
          v-for="s in nextStatuses"
          :key="s"
          type="button"
          class="btn btn-status"
          @click="onStatusChange(s)"
        >
          → {{ s }}
        </button>
        <span v-if="nextStatuses.length === 0" class="terminal-note">
          статус финальный
        </span>
      </div>

      <p v-if="mode === 'edit' && selectedDefect" class="meta">
        VIN {{ selectedDefect.vin }} · точка ({{ selectedDefect.x.toFixed(2) }},
        {{ selectedDefect.y.toFixed(2) }}, {{ selectedDefect.z.toFixed(2) }})
      </p>

      <div class="actions">
        <button type="submit" class="btn btn-primary">Сохранить</button>
        <button type="button" class="btn" @click="onCancel">
          {{ mode === 'create' ? 'Отмена' : 'Закрыть' }}
        </button>
        <button
          v-if="mode === 'edit'"
          type="button"
          class="btn btn-danger"
          @click="onDelete"
        >
          Удалить
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-panel);
  padding: 16px 18px;
}
.card-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-dim);
}
.placeholder {
  color: #6b7a89;
  font-size: 14px;
  margin: 4px 0;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
label {
  font-size: 12px;
  font-weight: 600;
  color: #4a5a6a;
}
select,
textarea {
  font: inherit;
  padding: 6px 8px;
  border: 1px solid #c3ced8;
  border-radius: 6px;
  background: #fff;
}
select.invalid,
textarea.invalid {
  border-color: #e5484d;
}
.error {
  margin: 0;
  color: #e5484d;
  font-size: 12px;
}
.status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.badge {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}
.terminal-note {
  font-size: 12px;
  color: #6b7a89;
}
.meta {
  margin: 0;
  font-size: 12px;
  color: #6b7a89;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}
.btn {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border: 1px solid #c3ced8;
  border-radius: 8px;
  background: #f2f5f8;
  cursor: pointer;
  transition: background 0.12s;
}
.btn:hover {
  background: #e6ecf1;
}
.btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.btn-primary:hover {
  background: #1d4ed8;
}
.btn-danger {
  background: #fff;
  border-color: #e5484d;
  color: #e5484d;
}
.btn-status {
  border-color: #2563eb;
  color: #2563eb;
  background: #fff;
}
</style>
