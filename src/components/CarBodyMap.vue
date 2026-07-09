<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useDefects } from "../composables/useDefects";
import { ZONE } from "../data/bodyZones";
import { STATUS_COLORS } from "../data/statusTheme";
import type { DefectStatus } from "../types/defect";

const STAGE_BG = 0xf2f5f9;
const EDGE_COLOR = 0x8fa1b3;
const PAINT = 0xdde4eb;
const GLASS = 0xa7bccd;
const DARK = 0x39434e;
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
    new THREE.MeshStandardMaterial({ color: STATUS_COLORS[s], roughness: 0.55 }),
  ]),
) as Record<DefectStatus, THREE.MeshStandardMaterial>;

const haloMesh = new THREE.Mesh(
  new THREE.SphereGeometry(MARKER_R * 1.9, 20, 14),
  new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.28 }),
);
const draftMesh = new THREE.Mesh(
  new THREE.SphereGeometry(MARKER_R * 1.1, 20, 14),
  new THREE.MeshStandardMaterial({ color: 0xe5484d, roughness: 0.5 }),
);

function addPart(
  geo: THREE.BufferGeometry,
  color: number,
  zone: string | null,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 }),
  );
  mesh.position.set(x, y, z);
  if (zone) mesh.userData.zone = zone;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 25),
    new THREE.LineBasicMaterial({ color: EDGE_COLOR }),
  );
  mesh.add(edges);
  carGroup.add(mesh);
}

function buildCar() {
  addPart(new THREE.BoxGeometry(4.4, 0.62, 1.8), PAINT, ZONE.body, 0, 0.63, 0);
  addPart(new THREE.BoxGeometry(1.25, 0.1, 1.7), PAINT, ZONE.hood, 1.45, 0.99, 0);
  addPart(new THREE.BoxGeometry(1.0, 0.1, 1.7), PAINT, ZONE.trunk, -1.65, 0.99, 0);

  const profile = new THREE.Shape();
  profile.moveTo(-1.15, 0.94);
  profile.lineTo(0.95, 0.94);
  profile.lineTo(0.5, 1.56);
  profile.lineTo(-0.82, 1.56);
  profile.closePath();
  const cabinGeo = new THREE.ExtrudeGeometry(profile, { depth: 1.5, bevelEnabled: false });
  cabinGeo.translate(0, 0, -0.75);
  addPart(cabinGeo, GLASS, ZONE.roof, 0, 0, 0);

  const doorGeo = new THREE.BoxGeometry(0.85, 0.48, 0.06);
  addPart(doorGeo, PAINT, ZONE.doorFrontRight, 0.47, 0.62, 0.9);
  addPart(doorGeo, PAINT, ZONE.doorRearRight, -0.44, 0.62, 0.9);
  addPart(doorGeo, PAINT, ZONE.doorFrontLeft, 0.47, 0.62, -0.9);
  addPart(doorGeo, PAINT, ZONE.doorRearLeft, -0.44, 0.62, -0.9);

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24);
  wheelGeo.rotateX(Math.PI / 2);
  for (const [wx, wz] of [
    [1.45, 0.82],
    [1.45, -0.82],
    [-1.45, 0.82],
    [-1.45, -0.82],
  ]) {
    addPart(wheelGeo, DARK, null, wx, 0.34, wz);
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
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd4dce4, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(5, 8, 4);
  scene.add(sun);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 48),
    new THREE.MeshBasicMaterial({ color: 0xe6ebf1 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.001;
  scene.add(disc);
  const grid = new THREE.GridHelper(12, 24, 0xd9e1e9, 0xe6ecf2);
  scene.add(grid);

  buildCar();
  scene.add(carGroup, markerGroup);

  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(5.4, 3.2, 5.8);

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
    <p class="hint">перетащите — вращение · колесо — масштаб · клик по кузову — точка дефекта</p>
  </div>
</template>

<style scoped>
.map3d {
  display: flex;
  flex-direction: column;
}
.canvas-wrap {
  width: 100%;
  height: 420px;
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
  font-size: 12px;
  color: var(--text-dim);
  border-top: 1px solid var(--panel-border);
  background: var(--panel-bg);
}
</style>
