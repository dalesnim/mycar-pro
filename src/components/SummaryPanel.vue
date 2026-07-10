<script setup lang="ts">
import { computed } from "vue";
import { useDefects } from "../composables/useDefects";
import { DEFECT_STATUSES } from "../types/defect";
import { STATUS_COLORS } from "../data/statusTheme";
import { pdiReportUrl } from "../api/client";

const { summary, currentVin, bodyDefects } = useDefects();

// то же правило годности, что и в PDI-отчёте на сервере
const fit = computed(
  () => summary.value["новый"] + summary.value["в ремонте"] === 0,
);
</script>

<template>
  <section class="andon">
    <div class="vin-plate">
      <span class="vin-label">VIN кузова</span>
      <input
        id="vin"
        v-model.lazy="currentVin"
        spellcheck="false"
        aria-label="VIN кузова"
      />
    </div>

    <div class="verdict" :class="fit ? 'verdict-fit' : 'verdict-unfit'">
      <span class="verdict-lamp"></span>
      {{ fit ? "годен к выдаче" : "не годен к выдаче" }}
    </div>

    <div class="tiles">
      <div
        v-for="s in DEFECT_STATUSES"
        :key="s"
        class="tile"
        :style="{ '--tile-signal': STATUS_COLORS[s] }"
      >
        <span class="tile-count">{{ summary[s] }}</span>
        <span class="tile-label">{{ s }}</span>
      </div>
      <div class="tile tile-total">
        <span class="tile-count">{{ bodyDefects.length }}</span>
        <span class="tile-label">всего</span>
      </div>
    </div>

    <div class="report-row">
      <a
        class="report-btn report-btn-primary"
        :href="pdiReportUrl(currentVin, 'html')"
        target="_blank"
        rel="noopener"
      >
        Отчёт PDI
      </a>
      <a class="report-btn" :href="pdiReportUrl(currentVin, 'csv')">CSV</a>
    </div>
  </section>
</template>

<style scoped>
.andon {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-panel);
  padding: 10px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px 18px;
}
.vin-plate {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}
.vin-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-dim);
}
.vin-plate input {
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 10px;
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  background: #f6f8fa;
  color: var(--ink);
  width: 220px;
}
.verdict {
  display: flex;
  align-items: center;
  gap: 9px;
  align-self: center;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid;
}
.verdict-lamp {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.verdict-fit {
  color: #1d7a3d;
  border-color: #9fd8b2;
  background: #ecf7f0;
}
.verdict-unfit {
  color: #c0353a;
  border-color: #f0a9ac;
  background: #fdf1f1;
}
.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
.tile {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  min-width: 76px;
  padding: 5px 12px 6px;
  border: 1px solid var(--panel-border);
  border-top: 3px solid var(--tile-signal, var(--panel-border));
  border-radius: 4px;
  background: #fbfcfe;
}
.tile-total {
  border-top-color: var(--ink);
  background: #f2f5f8;
}
.tile-count {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.1;
}
.tile-label {
  font-size: 11px;
  color: var(--text-dim);
  white-space: nowrap;
}
.report-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.report-btn {
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  background: #f2f5f8;
  color: var(--text);
  text-decoration: none;
  transition: background 0.12s;
  white-space: nowrap;
}
.report-btn:hover {
  background: #e6ecf1;
}
.report-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.report-btn-primary:hover {
  background: var(--accent-hover);
}
</style>
