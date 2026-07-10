<script setup lang="ts">
import { useDefects } from "../composables/useDefects";
import { DEFECT_STATUSES } from "../types/defect";
import { STATUS_COLORS } from "../data/statusTheme";
import { pdiReportUrl } from "../api/client";

const { summary, currentVin, bodyDefects } = useDefects();
</script>

<template>
  <section class="summary">
    <div class="vin-row">
      <label for="vin">VIN кузова</label>
      <input id="vin" v-model.lazy="currentVin" spellcheck="false" />
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

    <div class="tiles">
      <div v-for="s in DEFECT_STATUSES" :key="s" class="tile">
        <span class="dot" :style="{ backgroundColor: STATUS_COLORS[s] }"></span>
        <span class="tile-label">{{ s }}</span>
        <span class="tile-count">{{ summary[s] }}</span>
      </div>
      <div class="tile tile-total">
        <span class="tile-label">всего</span>
        <span class="tile-count">{{ bodyDefects.length }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.summary {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-panel);
  padding: 12px 18px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}
.vin-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vin-row label {
  font-size: 12px;
  font-weight: 600;
  color: #4a5a6a;
  white-space: nowrap;
}
.vin-row input {
  font: inherit;
  font-size: 13px;
  padding: 5px 8px;
  border: 1px solid #c3ced8;
  border-radius: 6px;
  width: 200px;
}
.report-row {
  display: flex;
  gap: 6px;
}
.report-btn {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border: 1px solid #c3ced8;
  border-radius: 8px;
  background: #f2f5f8;
  color: var(--text);
  text-decoration: none;
  transition: background 0.12s;
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
.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
.tile {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #e2e8ee;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 13px;
  background: #fbfcfe;
}
.tile-total {
  background: #f2f5f8;
  font-weight: 600;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.tile-count {
  font-weight: 700;
}
</style>
