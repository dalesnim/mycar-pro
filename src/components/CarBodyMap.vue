<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useDefects } from "../composables/useDefects";
import { ZONE } from "../data/bodyZones";
import { STATUS_COLORS } from "../data/statusTheme";
import type { DefectStatus } from "../types/defect";

const STAGE_BG = 0x232a32;
const PAINT = 0xd6dce2;
const GLASS = 0x5d7284;
const DARK = 0x2c333b;
const HUB = 0x9aa5b0;
// цвет взаимодействия (черновик, выделение) — отличен от сигнальных цветов статусов
const INTERACT = 0x35c4d7;
const MARKER_R = 0.07;
const CLICK_SLOP_PX = 6;

const store = useDefects();
const { visibleDefects, draft, selectedId, selectDefect, startDraft } = store;

const wrapEl = ref<HTMLDivElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let rafId = 0;
let resizeObs: ResizeObserver | null = null;
let downX = 0;
let downY = 0;

const scene = new THREE.Scene();
const carGroup = new THREE.Group();
const markerGroup = new THREE.Group();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const markerGeo = new THREE.SphereGeometry(MARKER_R, 20, 14);
const markerMats = Object.fromEntries(
  (Object.keys(STATUS_COLORS) as DefectStatus[]).map((s) => [
    s,
    new THREE.MeshStandardMaterial({
      color: STATUS_COLORS[s],
      roughness: 0.4,
      emissive: STATUS_COLORS[s],
      emissiveIntensity: 0.35,
    }),
  ]),
) as Record<DefectStatus, THREE.MeshStandardMaterial>;

const haloMesh = new THREE.Mesh(
  new THREE.SphereGeometry(MARKER_R * 1.9, 20, 14),
  new THREE.MeshBasicMaterial({ color: INTERACT, transparent: true, opacity: 0.3 }),
);
const draftMesh = new THREE.Mesh(
  new THREE.SphereGeometry(MARKER_R * 1.1, 20, 14),
  new THREE.MeshStandardMaterial({
    color: INTERACT,
    roughness: 0.35,
    emissive: INTERACT,
    emissiveIntensity: 0.5,
  }),
);

function addPart(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  zone: string | null,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (zone) mesh.userData.zone = zone;
  carGroup.add(mesh);
}

function buildCar() {
  const paintMat = new THREE.MeshStandardMaterial({
    color: PAINT,
    roughness: 0.35,
    metalness: 0.25,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: GLASS,
    roughness: 0.2,
    metalness: 0.45,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({
    color: HUB,
    roughness: 0.3,
    metalness: 0.7,
  });

  addPart(new RoundedBoxGeometry(4.4, 0.62, 1.8, 4, 0.09), paintMat, ZONE.body, 0, 0.63, 0);
  addPart(new RoundedBoxGeometry(1.25, 0.1, 1.7, 3, 0.04), paintMat, ZONE.hood, 1.45, 0.99, 0);
  addPart(new RoundedBoxGeometry(1.0, 0.1, 1.7, 3, 0.04), paintMat, ZONE.trunk, -1.65, 0.99, 0);

  const profile = new THREE.Shape();
  profile.moveTo(-1.15, 0.94);
  profile.lineTo(0.95, 0.94);
  profile.lineTo(0.5, 1.56);
  profile.lineTo(-0.82, 1.56);
  profile.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(profile, {
    depth: 1.5,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  cabinGeo.translate(0, 0, -0.75);
  addPart(cabinGeo, glassMat, ZONE.roof, 0, 0, 0);

  const doorGeo = new RoundedBoxGeometry(0.85, 0.48, 0.06, 2, 0.02);
  addPart(doorGeo, paintMat, ZONE.doorFrontRight, 0.47, 0.62, 0.9);
  addPart(doorGeo, paintMat, ZONE.doorRearRight, -0.44, 0.62, 0.9);
  addPart(doorGeo, paintMat, ZONE.doorFrontLeft, 0.47, 0.62, -0.9);
  addPart(doorGeo, paintMat, ZONE.doorRearLeft, -0.44, 0.62, -0.9);

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 16);
  hubGeo.rotateX(Math.PI / 2);
  for (const [wx, wz] of [
    [1.45, 0.82],
    [1.45, -0.82],
    [-1.45, 0.82],
    [-1.45, -0.82],
  ]) {
    addPart(wheelGeo, tireMat, null, wx, 0.34, wz);
    addPart(hubGeo, hubMat, null, wx, 0.34, wz);
  }
}

function syncMarkers() {
  markerGroup.clear();
  for (const d of visibleDefects.value) {
    const marker = new THREE.Mesh(markerGeo, markerMats[d.status]);
    marker.position.set(d.x, d.y, d.z);
    marker.userData.defectId = d.id;
    if (d.id === selectedId.value) {
      marker.scale.setScalar(1.3);
      haloMesh.position.copy(marker.position);
      markerGroup.add(haloMesh);
    }
    markerGroup.add(marker);
  }
  if (draft.value) {
    draftMesh.position.set(draft.value.x, draft.value.y, draft.value.z);
    markerGroup.add(draftMesh);
  }
}

function isOrbitDrag(e: MouseEvent) {
  return Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_SLOP_PX;
}

function offsetPointAlongSurfaceNormal(hit: THREE.Intersection) {
  const normal = hit.face
    ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    : new THREE.Vector3(0, 1, 0);
  return hit.point.clone().addScaledVector(normal, MARKER_R * 0.5);
}

function roundCoord(v: number) {
  return Math.round(v * 1000) / 1000;
}

function onPointerDown(e: PointerEvent) {
  downX = e.clientX;
  downY = e.clientY;
}

function onClick(e: MouseEvent) {
  if (!renderer) return;
  if (isOrbitDrag(e)) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);

  for (const hit of raycaster.intersectObjects([markerGroup, carGroup], true)) {
    const id = hit.object.userData.defectId as string | undefined;
    if (id) {
      selectDefect(id);
      return;
    }
    const zone = hit.object.userData.zone as string | undefined;
    if (zone) {
      const p = offsetPointAlongSurfaceNormal(hit);
      startDraft(roundCoord(p.x), roundCoord(p.y), zone, roundCoord(p.z));
      return;
    }
  }
}

watch(
  () => [visibleDefects.value, draft.value, selectedId.value],
  syncMarkers,
  { deep: true },
);

onMounted(() => {
  const wrap = wrapEl.value!;

  scene.background = new THREE.Color(STAGE_BG);
  scene.add(new THREE.HemisphereLight(0xbfccd8, 0x2b333c, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(5, 8, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb8c9, 0.7);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  // контактная тень под машиной (одна плоскость — без z-fighting с сеткой)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  shadow.scale.set(1.1, 0.55, 1);
  scene.add(shadow);
  const grid = new THREE.GridHelper(14, 28, 0x3c4854, 0x2d3640);
  grid.position.y = -0.01;
  scene.add(grid);

  buildCar();
  scene.add(carGroup, markerGroup);

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(5.4, 3.1, 5.8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  wrap.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.7, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("click", onClick);

  const resize = () => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer!.setSize(w, h);
  };
  resize();
  resizeObs = new ResizeObserver(resize);
  resizeObs.observe(wrap);

  syncMarkers();

  const tick = (t: number) => {
    rafId = requestAnimationFrame(tick);
    draftMesh.scale.setScalar(1 + 0.18 * Math.sin(t / 220));
    controls.update();
    renderer!.render(scene, camera);
  };
  rafId = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  resizeObs?.disconnect();
  controls?.dispose();
  renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
  renderer?.domElement.removeEventListener("click", onClick);
  renderer?.dispose();
});
</script>

<template>
  <div class="map3d">
    <div ref="wrapEl" class="canvas-wrap" aria-label="3D-модель кузова"></div>
    <p class="hint">
      перетащите — вращение · колесо — масштаб · клик по кузову — точка дефекта
    </p>
  </div>
</template>

<style scoped>
.map3d {
  display: flex;
  flex-direction: column;
}
.canvas-wrap {
  width: 100%;
  height: 460px;
  cursor: grab;
}
.canvas-wrap:active {
  cursor: grabbing;
}
.canvas-wrap :deep(canvas) {
  display: block;
}
.hint {
  margin: 0;
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #8b99a7;
  border-top: 1px solid #39434e;
  background: var(--stage);
}
</style>
