<script setup lang="ts">
import CarBodyMap from "./CarBodyMap.vue";
import DefectCard from "./DefectCard.vue";
import DefectList from "./DefectList.vue";
import SummaryPanel from "./SummaryPanel.vue";
</script>

<template>
  <div>
    <SummaryPanel />
    <div class="layout">
      <div class="col-map">
        <div class="map-panel">
          <CarBodyMap />
        </div>
      </div>
      <div class="col-side">
        <DefectCard />
        <DefectList />
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 14px;
  align-items: start;
  margin-top: 14px;
}
.col-map,
.col-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.map-panel {
  background: var(--stage);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-panel);
  overflow: hidden;
}
@media (max-width: 1200px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
