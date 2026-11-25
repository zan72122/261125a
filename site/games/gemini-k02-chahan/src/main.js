import * as THREE from 'three';
import { createSunsetKitchenEnvMap } from './textures.js';
import { createKitchen, WOK_POS, WOK_RADIUS, WOK_DEPTH, wokLocalSurfaceY } from './kitchen.js';
import { createIngredientsAndTools } from './ingredients.js';
import { ChahanSimulation } from './foodSim.js';
import { CookingAudio } from './audio.js';

// =============================================================================
// 1. RENDERER, SCENE & LATE-AFTERNOON WESTERN SUNLIGHT LIGHTING
// =============================================================================
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x231711);
scene.fog = new THREE.FogExp2(0x3a2417, 0.085);

const envMap = createSunsetKitchenEnvMap(renderer);
scene.environment = envMap;

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.08, 25);

const hemiLight = new THREE.HemisphereLight(0xffd2a4, 0x352722, 0.62);
scene.add(hemiLight);

// PRIMARY KEY: Low-angle intense golden-amber western sun pouring from the back-left kitchen window!
const sunLight = new THREE.DirectionalLight(0xff9c44, 3.3);
sunLight.position.set(-2.6, 1.55, -1.75);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 8.0;
const d = 1.85;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0005;
sunLight.shadow.normalBias = 0.015;
scene.add(sunLight);

// Warm overhead kitchen work light
const kitchenWorkLight = new THREE.SpotLight(0xffedd4, 1.65, 6.0, Math.PI * 0.44, 0.70, 1.2);
kitchenWorkLight.position.set(0.10, 2.2, 0.42);
kitchenWorkLight.target.position.set(0.05, 0.1, 0.06);
scene.add(kitchenWorkLight);
scene.add(kitchenWorkLight.target);

// Subtle cool indoor bounce fill from the right room
const roomFillLight = new THREE.DirectionalLight(0x8cb2de, 0.58);
roomFillLight.position.set(2.2, 1.35, 1.8);
scene.add(roomFillLight);

// =============================================================================
// 2. BUILD KITCHEN, INGREDIENTS, SIMULATION & AUDIO
// =============================================================================
const kitchen = createKitchen(scene);
const props = createIngredientsAndTools(scene);
const sim = new ChahanSimulation(scene, kitchen.wokPivot, kitchen.plateStation);
const audio = new CookingAudio();

// Reaction bokeh particles (golden sparkles for masterpiece, cool blue twinkles for cold, warm sparks for crispy!)
const SPARKLE_COUNT = 28;
const sparkleGeo = new THREE.SphereGeometry(0.011, 8, 8);
const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 });
const sparkleMesh = new THREE.InstancedMesh(sparkleGeo, sparkleMat, SPARKLE_COUNT);
sparkleMesh.frustumCulled = false;
scene.add(sparkleMesh);
const sparkles = Array.from({ length: SPARKLE_COUNT }, () => ({
  active: false, x: 0, y: -5, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1,
}));
const _sMat = new THREE.Matrix4();
for (let i = 0; i < SPARKLE_COUNT; i++) {
  _sMat.makeScale(0, 0, 0);
  sparkleMesh.setMatrixAt(i, _sMat);
}
sparkleMesh.instanceMatrix.needsUpdate = true;

function spawnJoySparkles(origin, count = 18, colorHex = 0xffe08a) {
  sparkleMat.color.setHex(colorHex);
  let spawned = 0;
  for (let i = 0; i < SPARKLE_COUNT && spawned < count; i++) {
    const sp = sparkles[i];
    sp.active = true;
    sp.x = origin.x + (Math.random() - 0.5) * 0.35;
    sp.y = origin.y + Math.random() * 0.25;
    sp.z = origin.z + (Math.random() - 0.5) * 0.22;
    sp.vx = (Math.random() - 0.5) * 0.35;
    sp.vy = 0.25 + Math.random() * 0.42;
    sp.vz = (Math.random() - 0.5) * 0.25;
    sp.age = 0;
    sp.life = 0.8 + Math.random() * 0.7;
    spawned++;
  }
}

// =============================================================================
// 3. 4-TIER BULLETPROOF RESPONSIVE CAMERA & LAYOUT (DESKTOP / iPad / iPhone)
// =============================================================================
let currentLayoutMode = 'landscape_43';

function updateLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / Math.max(1, h);

  renderer.setSize(w, h);
  camera.aspect = aspect;

  if (aspect < 0.68) {
    // iPhone Portrait (390×844, 375×667): spacious vertical stack with ZERO clipping & ZERO knob/oil or plate/wok overlap!
    currentLayoutMode = 'portrait_narrow';
    camera.fov = 48;
    const minHorizHalf = 0.68;
    const neededZ = Math.max(2.28, (minHorizHalf / (Math.tan(THREE.MathUtils.degToRad(24)) * aspect)) * 0.78);
    camera.position.set(-0.04, neededZ * 0.84, neededZ);
    camera.lookAt(-0.04, 0.06, 0.18);

    kitchen.wokPivot.scale.setScalar(0.74);
    kitchen.stoveGroup.scale.setScalar(0.76);
    kitchen.knobGroup.position.set(-0.31, 0.026, 0.30);
    kitchen.plateStation.position.set(0.24, 0.006, -0.60);
    kitchen.plateStation.scale.setScalar(0.76);
    kitchen.mom.root.position.set(-0.20, -0.28, -1.04);
    kitchen.mom.root.scale.setScalar(0.90);
    kitchen.freshPlateGroup.position.set(0.36, 0.004, -0.92);
  } else if (aspect < 0.98) {
    // iPad Portrait (768×1024): spacious balanced layout, zero knob/oil overlap, plate clearly above wok!
    currentLayoutMode = 'portrait_tablet';
    camera.fov = 47;
    camera.position.set(-0.02, 1.58, 1.94);
    camera.lookAt(-0.02, 0.10, 0.10);

    kitchen.wokPivot.scale.setScalar(0.84);
    kitchen.stoveGroup.scale.setScalar(0.86);
    kitchen.knobGroup.position.set(-0.38, 0.026, 0.28);
    kitchen.plateStation.position.set(0.40, 0.006, -0.52);
    kitchen.plateStation.scale.setScalar(0.84);
    kitchen.mom.root.position.set(-0.10, -0.28, -0.98);
    kitchen.mom.root.scale.setScalar(0.95);
    kitchen.freshPlateGroup.position.set(0.54, 0.004, -0.84);
  } else if (aspect > 1.72) {
    // iPhone Landscape (844×390): wider FOV & slightly pulled back so Mom's head AND bottom dishes are 100% visible!
    currentLayoutMode = 'landscape_wide';
    camera.fov = 44;
    camera.position.set(0.02, 1.24, 1.72);
    camera.lookAt(0.02, 0.15, 0.0);

    kitchen.wokPivot.scale.setScalar(1.0);
    kitchen.stoveGroup.scale.setScalar(1.0);
    kitchen.knobGroup.position.set(-0.40, 0.026, 0.29);
    kitchen.plateStation.position.set(0.72, 0.006, -0.10);
    kitchen.plateStation.scale.setScalar(1.0);
    kitchen.mom.root.position.set(0.38, -0.34, -0.82);
    kitchen.mom.root.scale.setScalar(0.94);
    kitchen.freshPlateGroup.position.set(1.04, 0.004, -0.42);
  } else {
    // Desktop (1280×800) & iPad Landscape (1024×768): crisp cinematic 4:3/16:10 POV with natural background depth for Mom!
    currentLayoutMode = 'landscape_43';
    camera.fov = aspect > 1.48 ? 43 : 47;
    camera.position.set(0.02, 1.12, 1.56);
    camera.lookAt(0.02, 0.16, 0.01);

    kitchen.wokPivot.scale.setScalar(1.0);
    kitchen.stoveGroup.scale.setScalar(1.0);
    kitchen.knobGroup.position.set(-0.40, 0.026, 0.30);
    kitchen.plateStation.position.set(0.70, 0.006, -0.10);
    kitchen.plateStation.scale.setScalar(1.0);
    kitchen.mom.root.position.set(0.38, -0.34, -0.94);
    kitchen.mom.root.scale.setScalar(0.95);
    kitchen.freshPlateGroup.position.set(1.00, 0.004, -0.44);
  }

  camera.updateProjectionMatrix();
  props.setResponsiveLayout(currentLayoutMode);
  sim.syncPlatedPositions();
}
window.addEventListener('resize', updateLayout);
updateLayout();

// =============================================================================
// 4. ONE-FINGER DIRECT PHYSICAL INTERACTION CONTROLLER (BUG-FIXED!)
// =============================================================================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(WOK_POS.y + WOK_DEPTH + 0.04));
const platePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.045);
const _platePlanePt = new THREE.Vector3();

const allInteractables = [...props.interactables, ...kitchen.interactables];

const HEAT_STEPS = [0.0, 0.34, 0.68, 1.0];
let heatStepIndex = 1;
sim.heatLevel = 0.45;

const input = {
  activePointerId: null,
  mode: null, // 'ingredient' | 'ladle' | 'knob' | 'wokHandle'
  activeItemId: null,
  downTime: 0,
  downScreenX: 0,
  downScreenY: 0,
  lastScreenX: 0,
  lastScreenY: 0,
  movedDist: 0,
  dragWorld: new THREE.Vector3(),
  prevDragWorld: new THREE.Vector3(),
  plateWorld: new THREE.Vector3(),
  pointerOverPlate: false,
  pourAccum: 0,
  hasScoopedFood: false,
  stirEnergy: 0,
  lastInteractTime: performance.now() * 0.001,
};

// Independent multi-item auto-pour queue so rapid taps NEVER cancel previous ingredients!
const activeAutoPours = new Map(); // id -> { id, timer, duration, poured, targetPos }

// Mom tasting choreography state
let tastingAnim = null;

function setNDC(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function getWorldOnPlane(plane, out) {
  raycaster.setFromCamera(pointerNDC, camera);
  return raycaster.ray.intersectPlane(plane, out);
}

function isOverWok(worldPt, margin = 0.08) {
  const s = kitchen.wokPivot.scale.x;
  return Math.hypot(worldPt.x - WOK_POS.x, worldPt.z - WOK_POS.z) < WOK_RADIUS * s + margin;
}

/**
 * Reliable parallax-free plate hit check: directly raycasts against `plateHit`
 * AND checks intersection against the actual plate surface height plane (y = 0.045)!
 */
function checkPointerOverPlate(outWorldPt) {
  raycaster.setFromCamera(pointerNDC, camera);
  const directHits = raycaster.intersectObject(kitchen.plateHit, false);
  if (directHits.length > 0) {
    if (outWorldPt) outWorldPt.copy(directHits[0].point);
    return true;
  }
  const p = kitchen.plateStation.position;
  const s = kitchen.plateStation.scale.x;
  const hitR = Math.max(0.26, 0.29 * s);
  if (raycaster.ray.intersectPlane(platePlane, _platePlanePt)) {
    if (Math.hypot(_platePlanePt.x - p.x, _platePlanePt.z - p.z) < hitR) {
      if (outWorldPt) outWorldPt.copy(_platePlanePt);
      return true;
    }
  }
  if (raycaster.ray.intersectPlane(dragPlane, _platePlanePt)) {
    if (Math.hypot(_platePlanePt.x - p.x, _platePlanePt.z - p.z) < hitR * 0.92) {
      if (outWorldPt) outWorldPt.set(_platePlanePt.x, p.y + 0.04, _platePlanePt.z);
      return true;
    }
  }
  return false;
}

function triggerIngredientDispense(id, targetPos, ontoPlate = false) {
  if (id === 'oil') {
    sim.addOil(0.20, targetPos);
    audio.playPour('oil', sim.wokTemp);
  } else if (id === 'egg') {
    sim.addBeatenEgg(targetPos);
    audio.playPour('egg', sim.wokTemp);
    kitchen.mom.setMood('excited', 1.8);
  } else if (id === 'rice') {
    sim.addColdRice(targetPos, 320);
    audio.playDrop('rice', sim.wokTemp);
    kitchen.mom.setMood('excited', 1.8);
  } else if (id === 'ham') {
    sim.addHam(targetPos, 24, ontoPlate);
    audio.playDrop('ham', ontoPlate ? 25 : sim.wokTemp);
  } else if (id === 'negi') {
    sim.addNegi(targetPos, 40, ontoPlate);
    audio.playDrop('negi', ontoPlate ? 25 : sim.wokTemp);
  } else if (id === 'soy') {
    sim.addSoySauce(targetPos, ontoPlate);
    audio.playPour('soy', ontoPlate ? 25 : sim.wokTemp);
    if (!ontoPlate) kitchen.mom.setMood('excited', 2.0);
  }
  props.items[id].uses++;
}

function startMomTasting() {
  const summary = sim.getDishSummary();
  if (summary.totalPlated <= 0) return;

  tastingAnim = {
    timer: 0,
    duration: 3.6,
    summary,
    cheered: false,
  };
  kitchen.rengeBite.material.color.copy(sim.getAverageFoodColor(true));
  kitchen.rengeBite.visible = true;
  kitchen.mom.setMood('tasting', 1.55);
  audio.playPlateScoop();
}

function onPointerDown(e) {
  if (input.activePointerId !== null) return;
  audio.unlock();
  input.activePointerId = e.pointerId;
  input.downTime = performance.now() * 0.001;
  input.lastInteractTime = input.downTime;
  input.downScreenX = e.clientX;
  input.downScreenY = e.clientY;
  input.lastScreenX = e.clientX;
  input.lastScreenY = e.clientY;
  input.movedDist = 0;
  input.pourAccum = 0;
  input.hasScoopedFood = false;
  input.pointerOverPlate = false;

  setNDC(e.clientX, e.clientY);
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(allInteractables, false);

  if (hits.length === 0) {
    input.mode = null;
    return;
  }

  // Respect nearest camera raycast hit; only yield wokHandle if a foreground ingredient/knob is co-located!
  let chosenHit = hits[0];
  const firstType = chosenHit.object.userData.interactType;
  if (firstType === 'wokHandle') {
    for (const h of hits) {
      const t = h.object.userData.interactType;
      if ((t === 'ingredient' || t === 'knob') && h.distance < chosenHit.distance + 0.45) {
        chosenHit = h;
        break;
      }
    }
  } else if (firstType === 'freshReset' && !kitchen.freshPlateGroup.visible) {
    // Hidden spare plates must never block clicks!
    chosenHit = hits.find((h) => h.object.userData.interactType !== 'freshReset') || hits[0];
  }
  const hitData = chosenHit.object.userData;

  if (hitData.interactType === 'freshReset' && kitchen.freshPlateGroup.visible) {
    sim.reset();
    tastingAnim = null;
    activeAutoPours.clear();
    kitchen.rengeGroup.position.copy(kitchen.rengeRestPos);
    kitchen.rengeGroup.rotation.set(0, -0.32, 0);
    kitchen.rengeBite.visible = false;
    kitchen.freshPlateGroup.visible = false;
    kitchen.mom.setMood('watch', 1.0);
    for (const id of Object.keys(props.items)) props.items[id].uses = 0;
    audio.playPlateScoop();
    input.mode = null;
    return;
  }

  if (hitData.interactType === 'knob') {
    input.mode = 'knob';
    return;
  }

  if (hitData.interactType === 'wokHandle') {
    input.mode = 'wokHandle';
    sim.triggerWokToss(1.05);
    audio.playWokToss(0.6, sim.wokTemp);
    kitchen.mom.setMood('excited', 2.2);
    return;
  }

  if (hitData.interactType === 'ingredient') {
    // If this specific item was mid-autoPour, finalize its pour immediately so nothing is lost!
    const existing = activeAutoPours.get(hitData.id);
    if (existing && !existing.poured) {
      triggerIngredientDispense(existing.id, existing.targetPos, false);
    }
    activeAutoPours.delete(hitData.id);

    input.mode = 'ingredient';
    input.activeItemId = hitData.id;
    getWorldOnPlane(dragPlane, input.dragWorld);
    input.prevDragWorld.copy(input.dragWorld);
    return;
  }

  if (hitData.interactType === 'ladle' || hitData.interactType === 'wok') {
    input.mode = 'ladle';
    getWorldOnPlane(dragPlane, input.dragWorld);
    input.prevDragWorld.copy(input.dragWorld);
    if (sim.hasFoodInWok()) input.hasScoopedFood = true;
    return;
  }

  if (hitData.interactType === 'plate') {
    const summary = sim.getDishSummary();
    if (summary.totalPlated > 0 && !tastingAnim) {
      startMomTasting();
    } else if (sim.hasFoodInWok()) {
      input.mode = 'plateInvite';
      audio.playPlateScoop();
    }
    return;
  }
}

function onPointerMove(e) {
  if (e.pointerId !== input.activePointerId) return;
  const dx = e.clientX - input.lastScreenX;
  const dy = e.clientY - input.lastScreenY;
  input.movedDist += Math.hypot(dx, dy);
  input.lastScreenX = e.clientX;
  input.lastScreenY = e.clientY;
  input.lastInteractTime = performance.now() * 0.001;

  setNDC(e.clientX, e.clientY);

  if (input.mode === 'knob') {
    const delta = (dx - dy) * 0.0055;
    if (Math.abs(delta) > 0.002) {
      const prev = sim.heatLevel;
      sim.heatLevel = THREE.MathUtils.clamp(sim.heatLevel + delta, 0, 1);
      if (Math.floor(prev * 3.9) !== Math.floor(sim.heatLevel * 3.9)) {
        audio.playGasClick(sim.heatLevel);
        if (sim.heatLevel > 0.78) kitchen.mom.setMood('excited', 1.8);
      }
    }
    return;
  }

  if (input.mode === 'ingredient' || input.mode === 'ladle') {
    input.prevDragWorld.copy(input.dragWorld);
    getWorldOnPlane(dragPlane, input.dragWorld);
    input.pointerOverPlate = checkPointerOverPlate(input.plateWorld);

    // Fast upward swipe inside the wok triggers a thrilling Wok Toss —
    // EXCEPT on portrait layouts when dragging straight toward the plate above the wok (so plating never misfires)!
    const isPortrait = currentLayoutMode === 'portrait_narrow' || currentLayoutMode === 'portrait_tablet';
    const draggingTowardPortraitPlate = isPortrait && dx > -12 && dy < 0;
    if (
      input.mode === 'ladle' &&
      !draggingTowardPortraitPlate &&
      dy < -32 &&
      isOverWok(input.dragWorld, 0.04) &&
      !input.pointerOverPlate &&
      sim.tossTimer <= 0.05
    ) {
      sim.triggerWokToss(Math.min(1.35, Math.abs(dy) / 28));
      audio.playWokToss(0.75, sim.wokTemp);
      kitchen.mom.setMood('excited', 2.2);
    }
  }
}

function onPointerUp(e) {
  if (e.pointerId !== input.activePointerId) return;
  setNDC(e.clientX, e.clientY);
  const elapsed = performance.now() * 0.001 - input.downTime;
  const wasShortTap = input.movedDist < 22 && elapsed < 0.35;

  if (input.mode === 'knob' && wasShortTap) {
    heatStepIndex = (heatStepIndex + 1) % HEAT_STEPS.length;
    sim.heatLevel = HEAT_STEPS[heatStepIndex];
    audio.playGasClick(sim.heatLevel);
    if (sim.heatLevel > 0.78) kitchen.mom.setMood('excited', 1.8);
  } else if (input.mode === 'ingredient' && wasShortTap && input.activeItemId) {
    // Queue independent auto-pour for this ingredient (NEVER cancels other ingredients!)
    const id = input.activeItemId;
    const target = new THREE.Vector3(
      WOK_POS.x + (Math.random() - 0.5) * 0.14,
      WOK_POS.y + WOK_DEPTH + 0.14,
      WOK_POS.z + (Math.random() - 0.5) * 0.14
    );
    activeAutoPours.set(id, { id, timer: 0, duration: 0.72, poured: false, targetPos: target });
  } else if (input.mode === 'ladle') {
    const overPlateNow = checkPointerOverPlate(input.plateWorld) || input.pointerOverPlate;
    if (input.hasScoopedFood && overPlateNow) {
      const moved = sim.scoopToPlate(input.plateWorld);
      if (moved > 0) {
        audio.playPlateScoop();
        kitchen.mom.setMood('invitePlate', 5.0);
      }
    } else if (wasShortTap && isOverWok(input.dragWorld)) {
      sim.applyLadleStir(input.dragWorld, new THREE.Vector3(0.4, 0, -0.5), 0.06, false);
      audio.playLadleScrape(0.65);
    }
  }

  sim.setPourStream(false);
  props.ladleScoopMound.visible = false;
  input.activePointerId = null;
  input.mode = null;
  input.activeItemId = null;
  input.hasScoopedFood = false;
  input.pointerOverPlate = false;
}

renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });
window.addEventListener('pointermove', onPointerMove, { passive: true });
window.addEventListener('pointerup', onPointerUp, { passive: true });
window.addEventListener('pointercancel', onPointerUp, { passive: true });

// =============================================================================
// 5. MAIN ANIMATION LOOP
// =============================================================================
const clock = new THREE.Clock();
let elapsedTotal = 0;
let fpsFrames = 0;
let fpsTimer = 0;
let currentFPS = 60;

const ladleCurrentPos = props.ladleRestPos.clone();
const ladlePrevPos = props.ladleRestPos.clone();
const ladleVelocity = new THREE.Vector3();
const momLookPt = new THREE.Vector3().copy(WOK_POS);
const _handAnchorWorld = new THREE.Vector3();
const _handQuatWorld = new THREE.Quaternion();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsedTotal += dt;

  fpsFrames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    currentFPS = Math.round(fpsFrames / fpsTimer);
    fpsFrames = 0;
    fpsTimer = 0;
  }

  // 1) Step Cooking Simulation
  const simMetrics = sim.update(dt);

  // 2) Update Gas Flames, Flame Light, Knob Dial & Western Sunbeams
  kitchen.flameUniforms.uTime.value = elapsedTotal;
  kitchen.flameUniforms.uHeat.value = THREE.MathUtils.lerp(kitchen.flameUniforms.uHeat.value, sim.heatLevel, dt * 8);

  const flameFlicker = 0.85 + 0.15 * Math.sin(elapsedTotal * 31.0) + 0.08 * Math.cos(elapsedTotal * 47.0);
  kitchen.flameLight.intensity = sim.heatLevel * 2.6 * flameFlicker;
  kitchen.flameLight.color.setRGB(
    THREE.MathUtils.lerp(0.22, 1.0, sim.heatLevel),
    THREE.MathUtils.lerp(0.48, 0.46, sim.heatLevel),
    THREE.MathUtils.lerp(1.0, 0.12, sim.heatLevel)
  );

  const knobTargetRot = 2.35 - sim.heatLevel * 3.6;
  kitchen.knobDial.rotation.y = THREE.MathUtils.lerp(kitchen.knobDial.rotation.y, knobTargetRot, dt * 11);

  kitchen.sunbeamUniforms.uTime.value = elapsedTotal;
  kitchen.sunbeamUniforms.uSmokeBoost.value = THREE.MathUtils.lerp(
    kitchen.sunbeamUniforms.uSmokeBoost.value,
    simMetrics.smokeIntensity,
    dt * 3
  );

  // 3) Update All Independent Auto-Pouring & Dragged Ingredient Vessels
  let rightHandAttached = false;
  let pourStreamActive = false;

  for (const [id, ap] of activeAutoPours.entries()) {
    ap.timer += dt;
    const t = ap.timer / ap.duration;
    const it = props.items[id];
    if (t < 0.34) {
      const k = t / 0.34;
      it.targetPos.lerpVectors(it.home, ap.targetPos, Math.sin(k * Math.PI * 0.5));
      it.tiltAmount = k * 0.95;
    } else if (t < 0.72) {
      it.targetPos.copy(ap.targetPos);
      it.tiltAmount = 1.05;
      if (!ap.poured) {
        ap.poured = true;
        triggerIngredientDispense(id, ap.targetPos, false);
      }
      if (id === 'oil' || id === 'egg' || id === 'soy') {
        pourStreamActive = true;
        const col = id === 'soy' ? 0x2a0c04 : id === 'egg' ? 0xf6b21a : 0xedb836;
        const spoutWorld = it.group.position.clone().add(new THREE.Vector3(0.04, 0.08, 0));
        const hitWok = new THREE.Vector3(ap.targetPos.x, WOK_POS.y + 0.04, ap.targetPos.z);
        sim.setPourStream(true, spoutWorld, hitWok, col, id === 'egg' ? 1.55 : 0.95);
      }
    } else if (t < 1.0) {
      const k = (t - 0.72) / 0.28;
      it.targetPos.lerpVectors(ap.targetPos, it.home, k);
      it.tiltAmount = (1 - k) * 0.8;
    } else {
      it.targetPos.copy(it.home);
      it.tiltAmount = 0;
      activeAutoPours.delete(id);
      continue;
    }

    if (!rightHandAttached && input.mode !== 'ingredient') {
      props.rightHand.visible = true;
      props.rightHand.position.copy(it.group.position).add(new THREE.Vector3(0.085, 0.085, 0.075));
      props.rightHand.rotation.set(-0.22, -0.32, -it.tiltAmount * 0.50);
      rightHandAttached = true;
      momLookPt.copy(it.group.position);
    }
  }

  // Handle live 1-finger dragging of an ingredient vessel
  if (input.mode === 'ingredient' && input.activeItemId) {
    const id = input.activeItemId;
    const it = props.items[id];
    const overWok = isOverWok(input.dragWorld, 0.08);
    const canPlateGarnish = (id === 'negi' || id === 'ham' || id === 'soy') && sim.platedScoops > 0 && input.pointerOverPlate;

    const targetXZ = canPlateGarnish ? input.plateWorld : input.dragWorld;
    it.targetPos.set(
      THREE.MathUtils.clamp(targetXZ.x, -0.95, 1.05),
      WOK_POS.y + WOK_DEPTH + (overWok || canPlateGarnish ? 0.16 : 0.12),
      THREE.MathUtils.clamp(targetXZ.z, -0.82, 1.02)
    );

    if (overWok || canPlateGarnish) {
      it.tiltAmount = 1.08;
      const rate = id === 'oil' ? 2.4 : id === 'soy' ? 2.2 : id === 'egg' ? 1.5 : id === 'rice' ? 1.65 : 2.6;
      input.pourAccum += dt * rate;
      if (input.pourAccum >= 0.40) {
        input.pourAccum -= 0.40;
        triggerIngredientDispense(id, canPlateGarnish ? input.plateWorld : input.dragWorld, canPlateGarnish);
      }

      if (id === 'oil' || id === 'egg' || id === 'soy') {
        pourStreamActive = true;
        const col = id === 'soy' ? 0x2a0c04 : id === 'egg' ? 0xf6b21a : 0xedb836;
        const spoutWorld = it.group.position.clone().add(new THREE.Vector3(0.03, 0.07, 0));
        const destY = canPlateGarnish ? kitchen.plateStation.position.y + 0.08 : WOK_POS.y + 0.04;
        sim.setPourStream(true, spoutWorld, new THREE.Vector3(targetXZ.x, destY, targetXZ.z), col, id === 'egg' ? 1.65 : 0.95);
      }
    } else {
      it.tiltAmount = 0.25;
    }

    props.rightHand.visible = true;
    props.rightHand.position.copy(it.group.position).add(new THREE.Vector3(0.085, 0.085, 0.08));
    props.rightHand.rotation.set(-0.20, -0.30, -it.tiltAmount * 0.50);
    rightHandAttached = true;
    momLookPt.copy(it.group.position);
  }

  if (!pourStreamActive) {
    sim.setPourStream(false);
  }

  const idleSec = performance.now() * 0.001 - input.lastInteractTime;
  const idleHintId =
    idleSec > 11.0 && sim.platedScoops === 0
      ? sim.oilAmount < 0.05
        ? 'oil'
        : sim.eggAddedCount === 0
        ? 'egg'
        : sim.riceAddedCount === 0
        ? 'rice'
        : null
      : null;

  for (const id of Object.keys(props.items)) {
    const it = props.items[id];
    const isControlled = (input.mode === 'ingredient' && input.activeItemId === id) || activeAutoPours.has(id);
    if (!isControlled) {
      it.targetPos.copy(it.home);
      it.tiltAmount = 0;
      if (idleHintId === id) {
        it.targetPos.y += Math.abs(Math.sin(elapsedTotal * 3.8)) * 0.024;
      }
    }
    it.group.position.lerp(it.targetPos, Math.min(1, dt * 14));
    const targetTiltZ = id === 'soy' ? it.tiltAmount * 0.95 : -it.tiltAmount * 0.95;
    it.group.rotation.z = THREE.MathUtils.lerp(it.group.rotation.z, targetTiltZ, Math.min(1, dt * 11));
    it.group.rotation.x = THREE.MathUtils.lerp(it.group.rotation.x, it.tiltAmount * 0.22, Math.min(1, dt * 11));

    if (id === 'oil' && it.liquidMesh) {
      const fill = Math.max(0.35, 1.0 - sim.oilAmount * 0.55);
      it.liquidMesh.scale.y = THREE.MathUtils.lerp(it.liquidMesh.scale.y, fill, dt * 4);
    }
  }

  // 4) Update Chinese Ladle & Stirring / Parallax-Free Plate Scooping!
  input.stirEnergy = Math.max(0, input.stirEnergy - dt * 2.4);

  if (input.mode === 'ladle') {
    const overPlate = input.pointerOverPlate;
    const overWok = !overPlate && isOverWok(input.dragWorld, 0.04);
    const targetLadle = overPlate
      ? new THREE.Vector3(input.plateWorld.x, kitchen.plateStation.position.y + 0.14, input.plateWorld.z)
      : input.dragWorld.clone();

    if (overWok) {
      const s = kitchen.wokPivot.scale.x;
      const dx = targetLadle.x - WOK_POS.x;
      const dz = targetLadle.z - WOK_POS.z;
      const dist = Math.min(Math.hypot(dx, dz), WOK_RADIUS * s * 0.84);
      const ang = Math.atan2(dz, dx);
      targetLadle.x = WOK_POS.x + Math.cos(ang) * dist;
      targetLadle.z = WOK_POS.z + Math.sin(ang) * dist;
      targetLadle.y = WOK_POS.y + wokLocalSurfaceY(dist / s) * s + 0.036;

      if (sim.hasFoodInWok()) {
        input.hasScoopedFood = true;
      }
    } else if (overPlate) {
      if (!input.hasScoopedFood && sim.platedScoops > 0 && input.movedDist > 12) {
        sim.shapePlateDome();
      }
    } else {
      targetLadle.y = WOK_POS.y + WOK_DEPTH + 0.13;
    }

    ladlePrevPos.copy(ladleCurrentPos);
    ladleCurrentPos.lerp(targetLadle, Math.min(1, dt * 22));
    ladleVelocity.subVectors(ladleCurrentPos, ladlePrevPos).divideScalar(Math.max(0.008, dt));

    if (overWok) {
      // Detect if user is dragging smoothly toward the plate -> gentle scooping mode so food stays in wok!
      const toPlateX = kitchen.plateStation.position.x - WOK_POS.x;
      const toPlateZ = kitchen.plateStation.position.z - WOK_POS.z;
      const headingToPlate = ladleVelocity.x * toPlateX + ladleVelocity.z * toPlateZ > 0.15;
      const nearEdge = Math.hypot(ladleCurrentPos.x - WOK_POS.x, ladleCurrentPos.z - WOK_POS.z) > WOK_RADIUS * 0.62;
      const gentleScoop = input.hasScoopedFood && headingToPlate && nearEdge;

      const stirAmt = sim.applyLadleStir(ladleCurrentPos, ladleVelocity, dt, gentleScoop);
      if (stirAmt > 0.18) {
        input.stirEnergy = Math.min(1.2, input.stirEnergy + stirAmt * 0.4);
        audio.playLadleScrape(stirAmt);
      }
    }

    const showScoop = input.hasScoopedFood && !overWok;
    props.ladleScoopMound.visible = showScoop;
    if (showScoop) {
      props.ladleScoopMound.material.color.copy(sim.getAverageFoodColor(false));
    }

    props.ladleGroup.position.copy(ladleCurrentPos);
    props.ladleGroup.rotation.z = THREE.MathUtils.lerp(props.ladleGroup.rotation.z, overPlate && showScoop ? -0.52 : 0.0, dt * 10);
    props.ladleGroup.rotation.x = THREE.MathUtils.lerp(props.ladleGroup.rotation.x, overWok ? 0.18 : 0.05, dt * 10);

    props.rightHand.visible = true;
    props.rightHand.position.copy(props.ladleGroup.position).add(new THREE.Vector3(0.22, 0.19, 0.18));
    props.rightHand.rotation.set(-0.32, -0.52, 0.22);
    rightHandAttached = true;
    momLookPt.copy(ladleCurrentPos);
  } else {
    const wokScale = kitchen.wokPivot.scale.x;
    const restTarget = new THREE.Vector3(
      WOK_POS.x + 0.25 * wokScale,
      WOK_POS.y + (WOK_DEPTH + 0.014) * wokScale,
      WOK_POS.z + 0.21 * wokScale
    );
    ladleCurrentPos.lerp(restTarget, Math.min(1, dt * 9));
    props.ladleGroup.position.copy(ladleCurrentPos);
    props.ladleGroup.rotation.z = THREE.MathUtils.lerp(props.ladleGroup.rotation.z, 0.18, dt * 8);
    props.ladleGroup.rotation.x = THREE.MathUtils.lerp(props.ladleGroup.rotation.x, -0.06, dt * 8);
    props.ladleScoopMound.visible = false;
  }

  if (!rightHandAttached) {
    props.rightHand.visible = false;
  }

  // Left POV hand grips the wok's wooden handle seamlessly whenever tossing!
  if (sim.tossTimer > 0.02 || input.mode === 'wokHandle') {
    props.leftHand.visible = true;
    const handleWorld = new THREE.Vector3(-0.18, 0.014, 0.0);
    kitchen.handleGroup.localToWorld(handleWorld);
    props.leftHand.position.copy(handleWorld).add(new THREE.Vector3(0.0, 0.018, 0.015));
    props.leftHand.rotation.set(-0.14, 0.32, -0.18);
  } else {
    props.leftHand.visible = false;
  }

  // 5) Mom Tasting Choreography — Renge Locked Directly Into Mom's Right Fingers + Dish-Specific Reactions!
  if (tastingAnim) {
    tastingAnim.timer += dt;
    const t = tastingAnim.timer / tastingAnim.duration;
    const platePos = kitchen.plateStation.position;

    // Update Mom's pose first so her hand world position is exact on this frame!
    kitchen.mom.update(dt, elapsedTotal, momLookPt);
    kitchen.mom.armR.spoonAnchor.getWorldPosition(_handAnchorWorld);
    kitchen.mom.armR.hand.getWorldQuaternion(_handQuatWorld);

    const restLocal = kitchen.rengeRestPos;
    const handLocal = kitchen.plateStation.worldToLocal(_handAnchorWorld.clone());

    if (t < 0.26) {
      // Mom's hand smoothly picks up the porcelain renge from beside the plate
      const k = Math.sin((t / 0.26) * Math.PI * 0.5);
      kitchen.rengeGroup.position.lerpVectors(restLocal, handLocal, k);
      kitchen.rengeGroup.rotation.set(k * 0.18, -0.32 + k * 0.95, k * 0.18);
      momLookPt.copy(platePos).add(new THREE.Vector3(0, 0.14, 0));
    } else if (t < 0.56) {
      // Renge sits firmly gripped in Mom's right fingers as she lifts a glistening bite to her lips!
      kitchen.rengeGroup.position.lerp(handLocal, Math.min(1, dt * 18));
      kitchen.rengeGroup.rotation.set(0.18, 0.63, 0.18);
      kitchen.rengeBite.visible = t < 0.44;
      if (!tastingAnim.cheered && t >= 0.44) {
        tastingAnim.cheered = true;
        const s = tastingAnim.summary;
        const prof = s.reactionProfile;
        const momHeadWorld = kitchen.mom.root.position.clone().add(new THREE.Vector3(0, 0.82, 0.22));

        // Truly varied physical, facial, visual & musical reactions tailored to the exact cooked dish!
        if (prof === 'burnt') {
          kitchen.mom.setMood('burnt_laugh', 3.0);
          audio.playMomJoy('burnt');
          sim.spawnSmoke(momHeadWorld.x, momHeadWorld.y - 0.05, momHeadWorld.z, 6, { darkness: 0.7, alpha: 0.28, size1: 0.34 });
          spawnJoySparkles(momHeadWorld, 12, 0xffaa66);
        } else if (prof === 'cold') {
          kitchen.mom.setMood('cold_surprise', 2.8);
          audio.playMomJoy('cold');
          spawnJoySparkles(momHeadWorld, 18, 0x9ce2ff);
        } else if (prof === 'salty') {
          kitchen.mom.setMood('salty', 2.8);
          audio.playMomJoy('salty');
          spawnJoySparkles(momHeadWorld, 16, 0xffc668);
        } else if (prof === 'golden') {
          kitchen.mom.setMood('celebrate', 3.2);
          audio.playMomJoy('golden');
          spawnJoySparkles(momHeadWorld, 26, 0xffe478);
        } else if (prof === 'crispy') {
          kitchen.mom.setMood('crispy_joy', 3.0);
          audio.playMomJoy('crispy');
          spawnJoySparkles(momHeadWorld, 22, 0xffc055);
        } else if (prof === 'playful') {
          kitchen.mom.setMood('burnt_laugh', 2.8);
          audio.playMomJoy('playful');
          spawnJoySparkles(momHeadWorld, 18, 0xffd888);
        } else {
          kitchen.mom.setMood('celebrate', 2.8);
          audio.playMomJoy('happy');
          spawnJoySparkles(momHeadWorld, 20, 0xffe08a);
        }
        kitchen.freshPlateGroup.visible = true;
      }
    } else if (t < 1.0) {
      const k = (t - 0.56) / 0.44;
      kitchen.rengeGroup.position.lerpVectors(handLocal, restLocal, k);
      kitchen.rengeGroup.rotation.set((1 - k) * 0.18, -0.32 + (1 - k) * 0.95, (1 - k) * 0.18);
    } else {
      kitchen.rengeGroup.position.copy(restLocal);
      kitchen.rengeGroup.rotation.set(0, -0.32, 0);
      kitchen.rengeBite.visible = false;
      tastingAnim = null;
    }
  } else {
    if (sim.platedScoops > 0) {
      momLookPt.lerp(kitchen.plateStation.position, dt * 2.5);
    } else {
      momLookPt.lerp(WOK_POS, dt * 2.0);
    }
    kitchen.mom.update(dt, elapsedTotal, momLookPt);
  }

  // Update joy bokeh sparkles
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const sp = sparkles[i];
    if (!sp.active) continue;
    sp.age += dt;
    if (sp.age >= sp.life) {
      sp.active = false;
      _sMat.makeScale(0, 0, 0);
      sparkleMesh.setMatrixAt(i, _sMat);
      continue;
    }
    const p = sp.age / sp.life;
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.z += sp.vz * dt;
    sp.vy *= 0.96;
    const s = Math.sin(p * Math.PI) * 1.15;
    _sMat.makeTranslation(sp.x, sp.y, sp.z);
    _sMat.scale(new THREE.Vector3(s, s, s));
    sparkleMesh.setMatrixAt(i, _sMat);
  }
  sparkleMesh.instanceMatrix.needsUpdate = true;

  // 6) Continuous Procedural Audio Update
  audio.update(dt, {
    heatLevel: sim.heatLevel,
    wokTemp: sim.wokTemp,
    oilAmount: sim.oilAmount,
    foodAmount: simMetrics.wokFoodNorm,
    moisture: simMetrics.moisture,
    stirEnergy: input.stirEnergy,
  });

  renderer.render(scene, camera);
}

animate();

// =============================================================================
// 6. DIAGNOSTIC HOOK (for automated verification across all viewports & interactions)
// =============================================================================
window.__chahan = {
  sim,
  kitchen,
  props,
  camera,
  renderer,
  getLayoutMode: () => currentLayoutMode,
  getStats: () => ({
    fps: currentFPS,
    triangles: renderer.info.render.triangles,
    calls: renderer.info.render.calls,
    wokTemp: Math.round(sim.wokTemp),
    heatLevel: sim.heatLevel,
    oilAmount: sim.oilAmount,
    platedScoops: sim.platedScoops,
    spilledCount: sim.spilledCount,
    momMood: kitchen.mom.state.mood,
    summary: sim.getDishSummary(),
  }),
  projectObjBounds: (obj) => {
    const box = new THREE.Box3().setFromObject(obj);
    const pts = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const w = window.innerWidth, h = window.innerHeight;
    for (const p of pts) {
      p.project(camera);
      const sx = (p.x * 0.5 + 0.5) * w;
      const sy = (-p.y * 0.5 + 0.5) * h;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    return {
      minX: Math.round(minX), maxX: Math.round(maxX),
      minY: Math.round(minY), maxY: Math.round(maxY),
      cx: Math.round((minX + maxX) * 0.5),
      cy: Math.round((minY + maxY) * 0.5),
    };
  },
  demoStage: (stage) => {
    const clearTasting = () => {
      tastingAnim = null;
      kitchen.rengeGroup.position.copy(kitchen.rengeRestPos);
      kitchen.rengeGroup.rotation.set(0, -0.32, 0);
      kitchen.rengeBite.visible = false;
      kitchen.freshPlateGroup.visible = false;
    };
    if (stage === 'egg_sizzle') {
      sim.reset();
      clearTasting();
      sim.heatLevel = 1.0;
      sim.wokTemp = 235;
      sim.addOil(0.65, WOK_POS);
      sim.addBeatenEgg(WOK_POS);
    } else if (stage === 'toss_midair') {
      sim.reset();
      clearTasting();
      sim.heatLevel = 1.0;
      sim.wokTemp = 245;
      sim.addOil(0.55, WOK_POS);
      sim.addBeatenEgg(WOK_POS);
      sim.addColdRice(WOK_POS, 640);
      sim.addHam(WOK_POS, 38);
      sim.addNegi(WOK_POS, 72);
      sim.addSoySauce(WOK_POS);
      for (let k = 0; k < 24; k++) {
        sim.applyLadleStir(
          new THREE.Vector3(WOK_POS.x + Math.cos(k) * 0.14, WOK_POS.y + 0.06, WOK_POS.z + Math.sin(k) * 0.14),
          new THREE.Vector3(-Math.sin(k) * 1.4, 0, Math.cos(k) * 1.4),
          0.03,
          false
        );
        sim.update(0.016);
      }
      for (let s = 0; s < 35; s++) sim.update(0.016); // Sizzle & coat grains hot before tossing!
      sim.triggerWokToss(1.18);
      kitchen.mom.setMood('excited', 4.0);
    } else if (stage === 'burnt') {
      sim.reset();
      clearTasting();
      sim.heatLevel = 1.0;
      sim.wokTemp = 265;
      sim.addColdRice(WOK_POS, 480);
      for (let i = 0; i < 620; i++) sim.update(0.016); // ~9.9s unattended dry roaring fire!
    } else if (stage === 'plated_celebrate') {
      sim.scoopToPlate(kitchen.plateStation.position);
      sim.scoopToPlate(kitchen.plateStation.position);
      sim.scoopToPlate(kitchen.plateStation.position);
      sim.shapePlateDome();
      sim.addNegi(kitchen.plateStation.position, 24, true);
      startMomTasting();
    }
  },
};
