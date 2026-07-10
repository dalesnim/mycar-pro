<script setup lang="ts">
import { useDefects } from "../composables/useDefects";
import { DEFECT_STATUSES } from "../types/defect";
import { STATUS_COLORS } from "../data/statusTheme";

const store = useDefects();
const {
  visibleDefects,
  defectTypes,
  filterTypeId,
  filterStatus,
  selectedId,
  selectDefect,
} = store;

function typeName(typeId: string): string {
  return defectTypes.value.find((t) => t.id === typeId)?.name ?? typeId;
}
</script>

<template>
  <section class="list-panel">
    <h2 class="panel-heading">Дефекты · {{ visibleDefects.length }}</h2>

    <div class="filters">
      <select v-model="filterTypeId" aria-label="Фильтр по типу">
        <option value="">все типы</option>
        <option v-for="t in defectTypes" :key="t.id" :value="t.id">
          {{ t.name }}
        </option>
      </select>
      <select v-model="filterStatus" aria-label="Фильтр по статусу">
        <option value="">все статусы</option>
        <option v-for="s in DEFECT_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <p v-if="visibleDefects.length === 0" class="empty">
      Дефектов нет. Кликните по схеме кузова.
    </p>

    <ul v-else class="items">
      <li
        v-for="d in visibleDefects"
        :key="d.id"
        class="item"
        :class="{ selected: d.id === selectedId }"
        @click="selectDefect(d.id)"
      >
        <div class="item-main">
          <span class="item-type">{{ typeName(d.typeId) }}</span>
          <span class="item-zone">{{ d.zone }} · {{ d.severity }}</span>
          <span v-if="d.comment" class="item-comment">{{ d.comment }}</span>
        </div>
        <span
          class="badge"
          :style="{ backgroundColor: STATUS_COLORS[d.status] }"
        >
          {{ d.status }}
        </span>
        <button
          class="delete-btn"
          type="button"
          aria-label="Удалить дефект"
          @click.stop="store.deleteDefect(d.id)"
        >
          ✕
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.list-panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-panel);
  padding: 16px 18px;
}
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.filters select {
  font: inherit;
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: #f6f8fa;
  color: var(--ink);
  flex: 1;
  min-width: 0;
}
.empty {
  color: var(--text-dim);
  font-size: 14px;
  margin: 4px 0;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
}
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e2e8ee;
  border-radius: 4px;
  cursor: pointer;
}
.item:hover {
  background: #f4f8fb;
}
.item.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.item-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.item-type {
  font-weight: 600;
  font-size: 14px;
}
.item-zone {
  font-size: 12px;
  color: var(--text-dim);
}
.item-comment {
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.delete-btn {
  border: none;
  background: none;
  color: var(--text-faint);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.delete-btn:hover {
  color: var(--danger);
  background: #fdecec;
}
</style>
