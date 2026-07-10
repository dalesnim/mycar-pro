<script setup lang="ts">
import { computed } from "vue";
import { useDefects } from "../composables/useDefects";
import { DEFECT_STATUSES } from "../types/defect";
import { STATUS_COLORS } from "../data/statusTheme";

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
      <span class="vin-value">{{ currentVin }}</span>
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
  align-items: center;
  gap: 10px 18px;
}
.vin-plate {
  display: flex;
  flex-direction: column;
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
.vin-value {
  font-family: var(--font-mono);
  font-size: 15px;
  letter-spacing: 0.05em;
}
.verdict {
  display: flex;
  align-items: center;
  gap: 9px;
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
  color: var(--good-ink);
  border-color: var(--good-border);
  background: var(--good-bg);
}
.verdict-unfit {
  color: var(--bad-ink);
  border-color: var(--bad-border);
  background: var(--bad-bg);
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
  background: var(--tile-bg);
}
.tile-total {
  border-top-color: var(--text-dim);
  background: var(--panel-2);
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
</style>
