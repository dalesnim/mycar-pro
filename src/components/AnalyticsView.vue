<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDefects } from "../composables/useDefects";
import {
  DEFECT_STATUSES,
  SEVERITIES,
  type Defect,
} from "../types/defect";
import { STATUS_COLORS } from "../data/statusTheme";

const store = useDefects();
const { vins, lastSyncAt } = store;

const rows = ref<Defect[]>([]);

async function load() {
  try {
    rows.value = await store.listAll();
  } catch {
    // баннер об ошибке показывает App
  }
}
onMounted(load);
watch(lastSyncAt, load);

function countBy(key: (d: Defect) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const d of rows.value) map.set(key(d), (map.get(key(d)) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const byZone = computed(() => countBy((d) => d.zone));
const byType = computed(() => countBy((d) => store.typeName(d.typeId)));
const bySeverity = computed(() =>
  SEVERITIES.map((s): [string, number] => [
    s,
    rows.value.filter((d) => d.severity === s).length,
  ]),
);
const byStatus = computed(() =>
  DEFECT_STATUSES.map((s) => ({
    status: s,
    count: rows.value.filter((d) => d.status === s).length,
  })),
);

const total = computed(() => rows.value.length);
const open = computed(
  () =>
    rows.value.filter((d) => d.status === "новый" || d.status === "в ремонте")
      .length,
);
const fitCars = computed(() => vins.value.filter((v) => v.fit).length);
const fixedShare = computed(() =>
  total.value === 0
    ? 100
    : Math.round(
        (rows.value.filter((d) => d.status === "устранён").length /
          total.value) *
          100,
      ),
);

const maxZone = computed(() => Math.max(1, ...byZone.value.map(([, n]) => n)));
const maxType = computed(() => Math.max(1, ...byType.value.map(([, n]) => n)));
const maxSev = computed(() => Math.max(1, ...bySeverity.value.map(([, n]) => n)));
</script>

<template>
  <div class="analytics">
    <div class="stat-row">
      <div class="stat panel">
        <span class="stat-num">{{ total }}</span>
        <span class="stat-label">дефектов всего</span>
      </div>
      <div class="stat panel">
        <span class="stat-num" :class="{ 'stat-bad': open > 0 }">{{ open }}</span>
        <span class="stat-label">открыто (новый / в ремонте)</span>
      </div>
      <div class="stat panel">
        <span class="stat-num">{{ fitCars }}<span class="stat-sub">/{{ vins.length }}</span></span>
        <span class="stat-label">кузовов годно к выдаче</span>
      </div>
      <div class="stat panel">
        <span class="stat-num">{{ fixedShare }}<span class="stat-sub">%</span></span>
        <span class="stat-label">дефектов устранено</span>
      </div>
    </div>

    <section class="panel">
      <h2 class="panel-heading">Статусы дефектов</h2>
      <div v-if="total === 0" class="empty">Пока нет данных — добавьте дефекты на карте кузова.</div>
      <template v-else>
        <div class="status-bar" role="img" :aria-label="byStatus.map((s) => `${s.status}: ${s.count}`).join(', ')">
          <div
            v-for="s in byStatus"
            v-show="s.count > 0"
            :key="s.status"
            class="status-seg"
            :style="{ flexGrow: s.count, backgroundColor: STATUS_COLORS[s.status] }"
            :title="`${s.status}: ${s.count}`"
          ></div>
        </div>
        <div class="status-legend">
          <span v-for="s in byStatus" :key="s.status" class="legend-item">
            <span class="legend-dot" :style="{ backgroundColor: STATUS_COLORS[s.status] }"></span>
            {{ s.status }} · <b>{{ s.count }}</b>
          </span>
        </div>
      </template>
    </section>

    <div class="charts">
      <section class="panel">
        <h2 class="panel-heading">По зонам кузова</h2>
        <div v-if="byZone.length === 0" class="empty">Нет данных.</div>
        <div v-for="[zone, n] in byZone" :key="zone" class="bar-row" :title="`${zone}: ${n}`">
          <span class="bar-label">{{ zone }}</span>
          <span class="bar-track">
            <span class="bar-fill" :style="{ width: (n / maxZone) * 100 + '%' }"></span>
          </span>
          <span class="bar-num">{{ n }}</span>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-heading">По типам дефектов</h2>
        <div v-if="byType.length === 0" class="empty">Нет данных.</div>
        <div v-for="[type, n] in byType" :key="type" class="bar-row" :title="`${type}: ${n}`">
          <span class="bar-label">{{ type }}</span>
          <span class="bar-track">
            <span class="bar-fill" :style="{ width: (n / maxType) * 100 + '%' }"></span>
          </span>
          <span class="bar-num">{{ n }}</span>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-heading">По серьёзности</h2>
        <div v-for="[sev, n] in bySeverity" :key="sev" class="bar-row" :title="`${sev}: ${n}`">
          <span class="bar-label">{{ sev }}</span>
          <span class="bar-track">
            <span class="bar-fill" :style="{ width: (n / maxSev) * 100 + '%' }"></span>
          </span>
          <span class="bar-num">{{ n }}</span>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-heading">Кузова</h2>
        <div v-if="vins.length === 0" class="empty">Нет данных.</div>
        <div v-for="v in vins" :key="v.vin" class="car-row">
          <span class="car-lamp" :class="v.fit ? 'lamp-fit' : 'lamp-unfit'"></span>
          <span class="car-vin">{{ v.vin }}</span>
          <span class="car-stats">открыто {{ v.open }} · устранено {{ v.fixed }} · всего {{ v.total }}</span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.analytics {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-num {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
}
.stat-sub {
  font-size: 17px;
  color: var(--text-dim);
}
.stat-bad {
  color: var(--signal-new);
}
.stat-label {
  font-size: 12px;
  color: var(--text-dim);
}
.empty {
  color: var(--text-dim);
  font-size: 13px;
}
.status-bar {
  display: flex;
  gap: 2px; /* зазор между сегментами — читаемость границ */
  height: 18px;
  border-radius: 4px;
  overflow: hidden;
}
.status-seg {
  min-width: 6px;
}
.status-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-dim);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend-item b {
  color: var(--text);
  font-family: var(--font-mono);
  font-weight: 600;
}
.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  align-items: start;
}
.bar-row {
  display: grid;
  grid-template-columns: 130px 1fr 28px;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}
.bar-label {
  font-size: 12px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-track {
  height: 14px;
  background: var(--panel-2);
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 0 4px 4px 0;
  min-width: 3px;
}
.bar-num {
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: right;
}
.car-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.car-row:last-child {
  border-bottom: none;
}
.car-lamp {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}
.lamp-fit {
  background: var(--signal-fixed);
}
.lamp-unfit {
  background: var(--signal-new);
}
.car-vin {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.car-stats {
  margin-left: auto;
  color: var(--text-dim);
  font-size: 11px;
  white-space: nowrap;
  flex: none;
}
</style>
