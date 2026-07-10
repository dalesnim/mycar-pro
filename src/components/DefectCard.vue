<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useDefects } from "../composables/useDefects";
import { ZONE_IDS } from "../data/bodyZones";
import { SEVERITIES, type DefectStatus, type Severity } from "../types/defect";
import { allowedTransitions } from "../logic/fsm";
import { STATUS_COLORS } from "../data/statusTheme";
import type { ValidationErrors } from "../logic/validation";
import { useToasts } from "../composables/useToasts";

const store = useDefects();
const { draft, selectedDefect, defectTypes } = store;
const { push } = useToasts();

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

async function onSave() {
  if (mode.value === "create") {
    const res = await store.saveDraft({ ...form });
    applyValidationErrors(res);
    if (res.ok) push("ok", "Дефект зафиксирован");
  } else if (mode.value === "edit") {
    const d = selectedDefect.value;
    if (!d) return;
    const res = await store.updateDefect(d.id, { ...form });
    applyValidationErrors(res);
    if (res.ok) push("ok", "Изменения сохранены");
  }
}

function onCancel() {
  if (mode.value === "create") store.cancelDraft();
  else store.clearSelection();
}

async function onDelete() {
  const d = selectedDefect.value;
  if (!d) return;
  if (!window.confirm(`Удалить дефект ${d.id} (${d.zone})?`)) return;
  await store.deleteDefect(d.id);
  push("info", `Дефект ${d.id} удалён`);
}

async function onStatusChange(to: DefectStatus) {
  const d = selectedDefect.value;
  if (!d) return;
  const ok = await store.changeStatus(d.id, to);
  push(ok ? "ok" : "error", ok ? `Статус: ${to}` : "Не удалось сменить статус");
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
    <h2 class="panel-heading">Карточка дефекта</h2>

    <p v-if="mode === 'empty'" class="placeholder">
      Кликните по схеме, чтобы добавить дефект,<br />
      или выберите маркер / строку списка.
    </p>

    <form v-else class="form" @submit.prevent="onSave">
      <div class="field">
        <label for="f-type">Тип дефекта *</label>
        <select id="f-type" v-model="form.typeId" :class="{ invalid: errors.typeId }">
          <option value="" disabled>— выберите тип —</option>
          <option v-for="t in defectTypes" :key="t.id" :value="t.id">
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
        {{ selectedDefect.id }} · VIN {{ selectedDefect.vin }} · точка ({{
          selectedDefect.x.toFixed(2) }}, {{ selectedDefect.y.toFixed(2) }},
        {{ selectedDefect.z.toFixed(2) }})<template v-if="selectedDefect.createdAt">
          · {{ selectedDefect.createdAt.slice(0, 10) }}</template>
      </p>

      <div
        v-if="mode === 'edit' && selectedDefect?.statusHistory?.length"
        class="history"
      >
        <p class="history-title">История статусов</p>
        <ol class="history-list">
          <li v-for="(h, i) in selectedDefect.statusHistory" :key="i">
            <span class="history-date">{{ h.at.slice(0, 10) }}</span>
            <span
              class="history-dot"
              :style="{ backgroundColor: STATUS_COLORS[h.to] }"
            ></span>
            <span>
              <template v-if="h.from">{{ h.from }} → </template>{{ h.to }}
            </span>
          </li>
        </ol>
      </div>

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
.placeholder {
  color: var(--text-dim);
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
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}
select,
textarea {
  font: inherit;
  padding: 6px 8px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--ink);
}
select.invalid,
textarea.invalid {
  border-color: var(--danger);
  background: #fdf6f6;
}
.error {
  margin: 0;
  color: var(--danger);
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
  border-radius: 4px;
}
.terminal-note {
  font-size: 12px;
  color: var(--text-dim);
}
.meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
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
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  background: var(--btn-bg);
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s;
}
.btn:hover {
  background: var(--btn-hover);
}
.btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.btn-primary:hover {
  background: var(--accent-hover);
}
.btn-danger {
  background: var(--panel-bg);
  border-color: var(--danger);
  color: var(--danger);
}
.btn-status {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--panel-bg);
}
.btn-status:hover {
  background: var(--accent-soft);
}
.history {
  border-top: 1px solid var(--line);
  padding-top: 10px;
}
.history-title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}
.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.history-list li {
  display: flex;
  align-items: center;
  gap: 8px;
}
.history-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-faint);
}
.history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
</style>
