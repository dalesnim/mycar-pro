<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDefects } from "../composables/useDefects";
import { DEFECT_STATUSES, type Defect, type DefectStatus } from "../types/defect";
import { STATUS_COLORS } from "../data/statusTheme";

const emit = defineEmits<{ open: [vin: string, id: string] }>();

const store = useDefects();
const { lastSyncAt } = store;

const rows = ref<Defect[]>([]);
const search = ref("");
const statusFilter = ref<DefectStatus | "">("");

async function load() {
  try {
    rows.value = await store.listAll();
  } catch {
    // баннер об ошибке показывает App; журнал оставляем как есть
  }
}
onMounted(load);
watch(lastSyncAt, load); // подхватываем фоновую синхронизацию

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return rows.value
    .filter((d) => !statusFilter.value || d.status === statusFilter.value)
    .filter(
      (d) =>
        !q ||
        [d.id, d.vin, d.zone, store.typeName(d.typeId), d.comment]
          .join(" ")
          .toLowerCase()
          .includes(q),
    )
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});
</script>

<template>
  <section class="panel journal">
    <h2 class="panel-heading">Все дефекты завода · {{ filtered.length }}</h2>

    <div class="controls">
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="Поиск: VIN, зона, тип, комментарий…"
        aria-label="Поиск по журналу"
      />
      <select v-model="statusFilter" aria-label="Фильтр по статусу">
        <option value="">все статусы</option>
        <option v-for="s in DEFECT_STATUSES" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <p v-if="filtered.length === 0" class="empty">
      Ничего не найдено. Измените запрос или снимите фильтр.
    </p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>VIN</th>
            <th>Зона</th>
            <th>Тип</th>
            <th>Серьёзность</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>Комментарий</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in filtered"
            :key="d.id"
            tabindex="0"
            title="Открыть на карте кузова"
            @click="emit('open', d.vin, d.id)"
            @keydown.enter="emit('open', d.vin, d.id)"
          >
            <td class="mono">{{ d.id }}</td>
            <td class="mono">{{ d.vin }}</td>
            <td>{{ d.zone }}</td>
            <td>{{ store.typeName(d.typeId) }}</td>
            <td>{{ d.severity }}</td>
            <td>
              <span class="badge" :style="{ backgroundColor: STATUS_COLORS[d.status] }">
                {{ d.status }}
              </span>
            </td>
            <td class="mono">{{ d.createdAt.slice(0, 10) }}</td>
            <td class="comment">{{ d.comment }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.search {
  flex: 1;
  font: inherit;
  font-size: 13px;
  padding: 7px 10px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--ink);
}
.controls select {
  font: inherit;
  font-size: 13px;
  padding: 6px 8px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--ink);
}
.empty {
  color: var(--text-dim);
  margin: 4px 0;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  text-align: left;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  padding: 6px 10px;
  border-bottom: 1px solid var(--panel-border);
  white-space: nowrap;
}
td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
tbody tr {
  cursor: pointer;
}
tbody tr:hover {
  background: var(--hover-bg);
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  white-space: nowrap;
}
.badge {
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.comment {
  color: var(--text-dim);
  max-width: 260px;
}
</style>
