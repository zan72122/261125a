import * as THREE from 'three';
import { createNightKitchenEnvMap, createTextures } from './textures.js';
import { createKitchen, LAYOUT, setLayoutMode } from './kitchen.js';
import { createOilSurface, TempuraFX } from './oilShader.js';
import { TempuraPiece } from './ingredients.js';
import { createMama, createCookingChopsticks } from './mama.js';
import { MacroDOFPass } from './dofPass.js';
import { TempuraAudio } from './audio.js';

const container = document.getElementById('app');

// 1. Renderer configured for photorealism, ZERO Three.js deprecation warnings, & smooth iPhone/iPad 30-60fps
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping; // ACES Filmic handled in MacroDOFPass
container.appendChild(renderer.domElement);

// 2. Scene & Night Kitchen Environment Map
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090706);
scene.fog = new THREE.FogExp2(0x110b08, 0.13);

const envMap = createNightKitchenEnvMap(renderer);
scene.environment = envMap;
scene.environmentIntensity = 0.92;

// 3. Responsive Camera + Layout for both iPhone Portrait (375x667 / 390x844) and iPad Landscape!
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / Math.max(1, window.innerHeight), 0.12, 22);
const baseCamPos = new THREE.Vector3();
const baseCamLook = new THREE.Vector3();
const currentCamPos = new THREE.Vector3();
const currentCamLook = new THREE.Vector3();

function computeResponsiveFraming(w = window.innerWidth, h = window.innerHeight) {
  const aspect = w / Math.max(1, h);
  const isPortrait = aspect < 0.92;
  setLayoutMode(isPortrait);

  if (isPortrait) {
    // Portrait iPhone framing: fits ALL 3 vertical tiers cleanly with generous margins & ZERO left/right clipping!
    camera.fov = aspect < 0.52 ? 50 : 47;
    baseCamPos.set(0.0, 2.02, 2.34);
    baseCamLook.set(0.0, 0.14, 0.24);
  } else if (aspect < 1.25) {
    camera.fov = 42;
    baseCamPos.set(0.0, 1.32, 2.02);
    baseCamLook.set(0.0, 0.30, -0.18);
  } else {
    camera.fov = 39;
    baseCamPos.set(0.0, 1.26, 1.92);
    baseCamLook.set(0.0, 0.30, -0.20);
  }
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

computeResponsiveFraming();
currentCamPos.copy(baseCamPos);
currentCamLook.copy(baseCamLook);
camera.position.copy(currentCamPos);
camera.lookAt(currentCamLook);

// 4. Bare-Bulb Backlit Night Kitchen Lighting
const bulbLight = new THREE.PointLight(0xffae4a, 6.2, 8.2, 1.65);
bulbLight.position.copy(LAYOUT.bulbPos).add(new THREE.Vector3(0, -0.05, 0.05));
bulbLight.castShadow = true;
bulbLight.shadow.mapSize.set(1024, 1024);
bulbLight.shadow.bias = -0.0005;
bulbLight.shadow.normalBias = 0.015;
bulbLight.shadow.radius = 3.2;
scene.add(bulbLight);

const rimSpot = new THREE.SpotLight(0xffc066, 3.8, 7.2, Math.PI * 0.45, 0.72, 1.45);
rimSpot.position.set(0.30, 1.12, -0.78);
rimSpot.target.position.set(0.0, 0.14, 0.16);
scene.add(rimSpot, rimSpot.target);

const oilBounceLight = new THREE.PointLight(0xff9a2e, 1.25, 2.5, 1.8);
oilBounceLight.position.set(LAYOUT.potCenter.x, LAYOUT.oilY + 0.15, LAYOUT.potCenter.z + 0.08);
scene.add(oilBounceLight);

const frontFill = new THREE.DirectionalLight(0xffdfb8, 0.56);
frontFill.position.set(-0.4, 1.7, 2.3);
scene.add(frontFill);

const nightWindowLight = new THREE.DirectionalLight(0x4b74b5, 0.72);
nightWindowLight.position.set(-2.4, 1.4, -1.6);
scene.add(nightWindowLight);

const hemiLight = new THREE.HemisphereLight(0x483220, 0x14100e, 0.36);
scene.add(hemiLight);

// 5. World Assets
const textures = createTextures();
const kitchen = createKitchen(scene, textures);
const oilSurface = createOilSurface(LAYOUT.potRadius - 0.004, LAYOUT.bulbPos);
oilSurface.mesh.position.set(LAYOUT.potCenter.x, LAYOUT.oilY, LAYOUT.potCenter.z);
scene.add(oilSurface.mesh);

const fx = new TempuraFX(scene, textures, LAYOUT.potCenter, LAYOUT.oilY, LAYOUT.potRadius - 0.012);
const mama = createMama(scene, textures);
const chopsticks = createCookingChopsticks(scene, textures);
const audio = new TempuraAudio();
const dofPass = new MacroDOFPass(renderer, window.innerWidth, window.innerHeight);

// 6. Tray Slots & Piece Management
const TRAY_SLOTS = [
  { type: 'ebi', offset: new THREE.Vector3(-0.072, 0.032, 0.105), rotY: 0.25 },
  { type: 'ebi', offset: new THREE.Vector3(-0.042, 0.032, 0.018), rotY: 0.12 },
  { type: 'kabocha', offset: new THREE.Vector3(0.108, 0.024, 0.085), rotY: -0.52 },
  { type: 'nasu', offset: new THREE.Vector3(-0.105, 0.025, -0.085), rotY: 0.52 },
  { type: 'renkon', offset: new THREE.Vector3(0.042, 0.024, -0.090), rotY: 0.1 },
  { type: 'shiso', offset: new THREE.Vector3(0.148, 0.020, -0.012), rotY: -0.78 },
];

const pieces = [];
let nextPieceId = 1;
const respawnQueue = [];
let gasHeatLevel = 1; // 0 = low (0.42), 1 = med (0.74), 2 = high (1.0)
const HEAT_VALUES = [0.42, 0.74, 1.0];
let cupFillLevel = 0.22;
kitchen.setCupFill(cupFillLevel);

let plateServeCelebrationTimer = 0;
let eatenCount = 0;
let idleSeconds = 0;

function getTraySlotWorldPos(slotIdx) {
  const slot = TRAY_SLOTS[slotIdx];
  const trayScale = LAYOUT.isPortrait ? 0.90 : 1.0;
  return new THREE.Vector3(
    LAYOUT.trayCenter.x + slot.offset.x * trayScale,
    LAYOUT.trayCenter.y + slot.offset.y,
    LAYOUT.trayCenter.z + slot.offset.z * trayScale
  );
}

const prevPotCenter = LAYOUT.potCenter.clone();
const prevPlateCenter = LAYOUT.plateCenter.clone();

function syncAllToLayout() {
  const dPotX = LAYOUT.potCenter.x - prevPotCenter.x;
  const dPotZ = LAYOUT.potCenter.z - prevPotCenter.z;
  const dPlateX = LAYOUT.plateCenter.x - prevPlateCenter.x;
  const dPlateZ = LAYOUT.plateCenter.z - prevPlateCenter.z;

  kitchen.syncPositionsToLayout();
  mama.group.position.copy(LAYOUT.mamaPos);
  oilSurface.mesh.position.set(LAYOUT.potCenter.x, LAYOUT.oilY, LAYOUT.potCenter.z);
  oilSurface.uniforms.uBulbPos.value.copy(LAYOUT.bulbPos);
  fx.potCenter.copy(LAYOUT.potCenter);
  bulbLight.position.copy(LAYOUT.bulbPos).add(new THREE.Vector3(0, -0.05, 0.05));
  oilBounceLight.position.set(LAYOUT.potCenter.x, LAYOUT.oilY + 0.15, LAYOUT.potCenter.z + 0.08);

  // Keep ALL pieces anchored cleanly to their containers across orientation changes!
  for (const p of pieces) {
    if (p.state === 'tray') {
      const wp = getTraySlotWorldPos(p.traySlot);
      p.targetPos.copy(wp);
      p.group.position.copy(wp);
    } else if (p.state === 'plate') {
      p.targetPos.x += dPlateX;
      p.targetPos.z += dPlateZ;
      p.group.position.x += dPlateX;
      p.group.position.z += dPlateZ;
    } else if (p.state === 'frying' || p.state === 'rack') {
      p.targetPos.x += dPotX;
      p.targetPos.z += dPotZ;
      p.group.position.x += dPotX;
      p.group.position.z += dPotZ;
    }
  }
  prevPotCenter.copy(LAYOUT.potCenter);
  prevPlateCenter.copy(LAYOUT.plateCenter);
}

function spawnTrayPiece(slotIdx) {
  const slot = TRAY_SLOTS[slotIdx];
  const piece = new TempuraPiece(slot.type, nextPieceId++, textures);
  piece.state = 'tray';
  piece.traySlot = slotIdx;
  const worldPos = getTraySlotWorldPos(slotIdx);
  piece.group.position.copy(worldPos);
  piece.group.position.y += 0.055;
  piece.targetPos.copy(worldPos);
  piece.group.rotation.set(0, slot.rotY, 0);
  piece.targetRot.set(0, slot.rotY, 0);
  scene.add(piece.group);
  pieces.push(piece);
  return piece;
}

syncAllToLayout();
for (let i = 0; i < TRAY_SLOTS.length; i++) {
  const p = spawnTrayPiece(i);
  p.group.position.copy(p.targetPos);
}

function pruneOldestIfNeeded() {
  const nonTray = pieces.filter((p) => p.state !== 'tray');
  if (nonTray.length > 14) {
    const oldestPlated = nonTray.find((p) => p.state === 'plate');
    if (oldestPlated) {
      scene.remove(oldestPlated.group);
      const idx = pieces.indexOf(oldestPlated);
      if (idx >= 0) pieces.splice(idx, 1);
    }
  }
}

// 7. One-Finger Pointer & Continuous Hold ("長押し") Interaction System
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
const rackPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAYOUT.rackY);
const oilPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -LAYOUT.oilY);
const counterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);

const interaction = {
  activePointerId: null,
  mode: null, // 'piece' | 'batter_drip' | 'salt' | 'daikon' | 'pitcher' | 'oil_stir'
  piece: null,
  downTime: 0,
  downScreen: new THREE.Vector2(),
  clientX: 0,
  clientY: 0,
  lastWorld: new THREE.Vector3(),
  batterDipCooldown: 0,
  pourTimer: 0,
  saltTimer: 0,
  dripTimer: 0,
  carriedDaikon: null,
};

function screenToPlane(clientX, clientY, plane, out = new THREE.Vector3()) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(plane, out);
  return out;
}

function projectToScreenPx(worldVec) {
  const rect = renderer.domElement.getBoundingClientRect();
  const v = worldVec.clone().project(camera);
  return {
    x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
    behind: v.z > 1,
  };
}

function screenDistToWorld(clientX, clientY, worldVec) {
  const sp = projectToScreenPx(worldVec);
  if (sp.behind) return 9999;
  return Math.hypot(sp.x - clientX, sp.y - clientY);
}

function getZoneDistance(pt, center) {
  return Math.hypot(pt.x - center.x, pt.z - center.z);
}

function isInsidePot(pt) {
  return getZoneDistance(pt, LAYOUT.potCenter) < LAYOUT.potRadius * 0.94;
}

// Rack detection uses DEDICATED rackPlane (y = 0.288) so dropping onto the wire rack NEVER falls behind into Mama!
function isOnRackFromScreen(clientX, clientY, outRackPt = new THREE.Vector3()) {
  screenToPlane(clientX, clientY, rackPlane, outRackPt);
  const dx = outRackPt.x - LAYOUT.potCenter.x;
  const dz = outRackPt.z - LAYOUT.potCenter.z;
  const dist = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx); // back-right wire rack arc (-2.12 .. -0.15)
  return dist > 0.16 && dist < 0.40 && ang > -2.22 && ang < -0.08;
}

function isInsideBatter(pt) {
  const scale = LAYOUT.isPortrait ? 0.92 : 1.0;
  return getZoneDistance(pt, LAYOUT.batterCenter) < LAYOUT.batterRadius * 1.38 * scale;
}

function isInsidePlate(pt) {
  const scale = LAYOUT.isPortrait ? 0.92 : 1.0;
  return getZoneDistance(pt, LAYOUT.plateCenter) < LAYOUT.plateRadius * 1.12 * scale;
}

// Mama feeding check is STRICTLY around Mama's waiting tasting saucer / hands (checked AFTER isOnRack!)
function isNearMama(clientX, clientY) {
  const mouthTarget = mama.getMouthWorldPos();
  const dPx = screenDistToWorld(clientX, clientY, mouthTarget);
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return dPx < Math.max(58, minDim * 0.14);
}

function findClosestPiece(clientX, clientY) {
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  // Generous >= 48pt screen-space touch hitbox for 5-year-old fingers!
  const maxPx = Math.max(48, minDim * 0.125);
  let best = null;
  let bestDist = maxPx;
  const v = new THREE.Vector3();

  for (const p of pieces) {
    if (p.state === 'eaten') continue;
    p.group.getWorldPosition(v);
    const d = screenDistToWorld(clientX, clientY, v);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

function computePlateStackHeight(wx, wz, piece, ignorePiece = null) {
  // Base resting height firmly grounded on the white washi paper (zero floating!)
  const plateTopY = LAYOUT.plateCenter.y + 0.017;
  let y = plateTopY + (piece ? piece.groundOffset : 0.02);
  for (const p of pieces) {
    if (p === ignorePiece || p.state !== 'plate') continue;
    const d = Math.hypot(p.targetPos.x - wx, p.targetPos.z - wz);
    if (d < 0.095) {
      y = Math.max(y, p.targetPos.y + p.groundOffset * 1.15 + p.batterAmount * 0.008);
    }
  }
  return Math.min(0.42, y);
}

function feedPieceToMama(piece) {
  piece.state = 'eaten';
  const dishPos = mama.getMouthWorldPos();
  piece.targetPos.copy(dishPos);
  eatenCount++;

  const crispness = Math.min(1.4, 0.4 + piece.doneness * 0.85 + piece.batterAmount * 0.25);
  audio.playCrispyBite(crispness);

  if (piece.doneness > 1.3) {
    mama.react('amazed', 2.8);
  } else if (piece.saltAmount > 0.7 || piece.daikonCount >= 2 || piece.batterAmount > 1.1) {
    mama.react('clapping', 2.8);
  } else {
    mama.react('eating', 2.4);
  }
  fx.spawnSteam(dishPos.x, dishPos.y + 0.04, dishPos.z, 0.85);

  setTimeout(() => {
    scene.remove(piece.group);
    const idx = pieces.indexOf(piece);
    if (idx >= 0) pieces.splice(idx, 1);
  }, 620);
}

function celebrateWholePlate() {
  const plated = pieces.filter((p) => p.state === 'plate');
  if (plated.length === 0) {
    mama.react('happy', 1.8);
    audio.playMamaWarmHum(0.02);
    return;
  }
  const maxStackY = plated.reduce((m, p) => Math.max(m, p.targetPos.y), 0);
  const hasTallTower = maxStackY > 0.12 || plated.length >= 4;
  mama.react(hasTallTower ? 'clapping' : 'happy', 3.0);
  audio.playMamaWarmHum(0.02);
  plateServeCelebrationTimer = 1.6;
  for (let i = 0; i < 4; i++) {
    fx.spawnSteam(
      LAYOUT.plateCenter.x + (Math.random() - 0.5) * 0.16,
      LAYOUT.plateCenter.y + 0.09,
      LAYOUT.plateCenter.z + (Math.random() - 0.5) * 0.16,
      0.85
    );
  }
}

function onPointerDown(e) {
  if (interaction.activePointerId !== null) return;
  interaction.activePointerId = e.pointerId;
  interaction.clientX = e.clientX;
  interaction.clientY = e.clientY;
  idleSeconds = 0;
  audio.unlock();

  interaction.downTime = performance.now();
  interaction.downScreen.set(e.clientX, e.clientY);

  const minDim = Math.min(window.innerWidth, window.innerHeight);
  // Guaranteed >= 46pt screen-space touch radius on every small prop for iPhone & iPad!
  const smallTargetPx = Math.max(48, minDim * 0.115);

  const counterPt = screenToPlane(e.clientX, e.clientY, counterPlane, new THREE.Vector3());
  const potPt = screenToPlane(e.clientX, e.clientY, oilPlane, new THREE.Vector3());
  interaction.lastWorld.copy(counterPt);

  // 1. Check closest ingredient piece first if directly tapped (so plated tempura on plate wins cleanly!)
  const piece = findClosestPiece(e.clientX, e.clientY);

  // 2. Check small interactive tools via screen-space 48pt+ radius
  const knobD = screenDistToWorld(e.clientX, e.clientY, LAYOUT.knobCenter.clone().add(new THREE.Vector3(0, 0.03, 0)));
  const saltD = screenDistToWorld(e.clientX, e.clientY, LAYOUT.saltCenter.clone().add(new THREE.Vector3(0, 0.03, 0)));
  const daikonD = screenDistToWorld(e.clientX, e.clientY, LAYOUT.daikonCenter.clone().add(new THREE.Vector3(0, 0.03, 0)));
  const pitcherD = screenDistToWorld(e.clientX, e.clientY, LAYOUT.pitcherCenter.clone().add(new THREE.Vector3(0, 0.07, 0)));

  const bestTool = [
    { kind: 'knob', d: knobD },
    { kind: 'salt', d: saltD },
    { kind: 'daikon', d: daikonD },
    { kind: 'pitcher', d: pitcherD },
  ].sort((a, b) => a.d - b.d)[0];

  // Compare closest piece vs closest small tool so neither steals the other!
  const pieceD = piece ? screenDistToWorld(e.clientX, e.clientY, piece.group.getWorldPosition(new THREE.Vector3())) : 9999;

  if (bestTool.d < smallTargetPx && bestTool.d <= pieceD + 8) {
    if (bestTool.kind === 'knob') {
      gasHeatLevel = (gasHeatLevel + 1) % 3;
      audio.playGasKnobClick();
      oilSurface.addRipple(0, 0, 0.012, 1.8, 30.0);
      mama.setLookTarget(LAYOUT.potCenter);
      interaction.activePointerId = null;
      return;
    }
    if (bestTool.kind === 'salt') {
      interaction.mode = 'salt';
      interaction.saltTimer = 0;
      audio.playSaltSprinkle();
      mama.setLookTarget(LAYOUT.plateCenter);
      return;
    }
    if (bestTool.kind === 'daikon') {
      interaction.mode = 'daikon';
      audio.playChopstickClick();
      const g = new THREE.DodecahedronGeometry(0.026, 1);
      const m = new THREE.MeshStandardMaterial({ color: 0xf2f4ee, roughness: 0.55 });
      const puff = new THREE.Mesh(g, m);
      puff.position.copy(LAYOUT.daikonCenter).add(new THREE.Vector3(0, 0.16, 0));
      scene.add(puff);
      interaction.carriedDaikon = puff;
      return;
    }
    if (bestTool.kind === 'pitcher') {
      interaction.mode = 'pitcher';
      interaction.pourTimer = 0;
      audio.playChopstickClick();
      return;
    }
  }

  // 3. Grab ingredient piece (from tray, pot, wire rack, or ceramic plate!)
  if (piece) {
    interaction.mode = 'piece';
    interaction.piece = piece;
    audio.playChopstickClick();

    if (piece.state === 'tray') {
      const slotIdx = piece.traySlot;
      respawnQueue.push({ slotIdx, timer: 1.35 });
      pruneOldestIfNeeded();
    }
    if (piece.state === 'frying') {
      const lx = piece.group.position.x - LAYOUT.potCenter.x;
      const lz = piece.group.position.z - LAYOUT.potCenter.z;
      oilSurface.addRipple(lx, lz, 0.015, 1.5, 28.0);
      piece.oilWetness = 1.0;
    }

    piece.prevState = piece.state;
    piece.state = 'held';
    mama.setLookTarget(piece.group.position);
    return;
  }

  // 4. Touching Batter Bowl directly -> scoop & drip creamy batter into oil to make Tenkasu!
  if (isInsideBatter(counterPt) || screenDistToWorld(e.clientX, e.clientY, LAYOUT.batterCenter.clone().add(new THREE.Vector3(0, 0.1, 0))) < smallTargetPx * 1.25) {
    interaction.mode = 'batter_drip';
    interaction.dripTimer = 0;
    kitchen.triggerBatterRipple(0.016);
    audio.playBatterDip();
    chopsticks.setTarget(LAYOUT.batterCenter.clone().add(new THREE.Vector3(0, LAYOUT.batterY + 0.04, 0)), true, true);
    return;
  }

  // 5. Touching Hot Oil Surface directly -> stir oil & swirl tenkasu!
  if (isInsidePot(potPt)) {
    interaction.mode = 'oil_stir';
    const lx = potPt.x - LAYOUT.potCenter.x;
    const lz = potPt.z - LAYOUT.potCenter.z;
    oilSurface.addRipple(lx, lz, 0.018, 1.65, 28.0);
    fx.spawnBubbleBurst(potPt.x, potPt.z, 8, 0.06, 0.7);
    audio.playOilPop(0.75);
    return;
  }

  // 6. Touching Mama's hands / tasting saucer -> warm celebration!
  if (isNearMama(e.clientX, e.clientY)) {
    celebrateWholePlate();
    interaction.activePointerId = null;
    return;
  }

  if (isInsidePlate(counterPt)) {
    celebrateWholePlate();
    interaction.activePointerId = null;
  }
}

function onPointerMove(e) {
  if (interaction.activePointerId !== e.pointerId) return;
  interaction.clientX = e.clientX;
  interaction.clientY = e.clientY;
  idleSeconds = 0;
}

/**
 * Continuous per-frame hold & drag processing inside stepSimulation(dt)!
 * Ensures BOTH dragging AND holding still ("長押し") smoothly drive batter coating,
 * salt sprinkling, tentsuyu pouring, tenkasu dripping, and oil stirring!
 */
function updateActiveHold(dt) {
  if (interaction.activePointerId === null || !interaction.mode) return;

  const hoverPt = screenToPlane(interaction.clientX, interaction.clientY, dragPlane, new THREE.Vector3());
  hoverPt.x = THREE.MathUtils.clamp(hoverPt.x, -1.05, 1.08);
  hoverPt.z = THREE.MathUtils.clamp(hoverPt.z, -0.82, 1.05);
  const moveDist = hoverPt.distanceTo(interaction.lastWorld);

  if (interaction.mode === 'piece' && interaction.piece) {
    const p = interaction.piece;
    let targetY = 0.40;
    const rackPt = new THREE.Vector3();

    if (isInsideBatter(hoverPt)) {
      // Smooth continuous batter coating over hold time!
      // Brief dip (~0.3s) -> thin translucent coat (~0.32) | Medium (~1.1s) -> classic (~0.85) | Long/Double-dip (~2.2s) -> chunky (1.5)!
      targetY = LAYOUT.batterY + 0.015;
      const rate = 0.44 * dt + Math.min(0.18, moveDist * 0.42);
      p.addBatter(rate);
      if (interaction.batterDipCooldown <= 0) {
        kitchen.triggerBatterRipple(0.012);
        audio.playBatterDip();
        interaction.batterDipCooldown = 0.34;
      }
      if (moveDist > 0.08 && Math.random() < 0.22) {
        kitchen.addCounterSplatter(
          LAYOUT.batterCenter.x + (Math.random() - 0.5) * 0.38,
          LAYOUT.batterCenter.z + (Math.random() - 0.5) * 0.34
        );
      }
    } else if (isOnRackFromScreen(interaction.clientX, interaction.clientY, rackPt)) {
      hoverPt.x = rackPt.x;
      hoverPt.z = rackPt.z;
      targetY = LAYOUT.rackY + 0.09;
    } else if (isNearMama(interaction.clientX, interaction.clientY)) {
      const m = mama.getMouthWorldPos();
      hoverPt.lerp(m, 0.55);
      targetY = m.y + 0.06;
      mama.react('curious', 0.4);
    } else if (isInsidePot(hoverPt)) {
      targetY = LAYOUT.oilY + 0.14;
      // Holding a freshly battered piece right above hot oil drips tenkasu!
      if (p.batterAmount > 0.32) {
        interaction.dripTimer -= dt;
        if (interaction.dripTimer <= 0) {
          interaction.dripTimer = 0.24 + Math.random() * 0.16;
          fx.spawnDrop({
            x: hoverPt.x + (Math.random() - 0.5) * 0.03,
            y: targetY - 0.03,
            z: hoverPt.z + (Math.random() - 0.5) * 0.03,
            color: 0xf7ecd0,
            scale: 1.05,
            kind: 'batter',
            targetY: LAYOUT.oilY,
          });
        }
      }
    } else if (isInsidePlate(hoverPt)) {
      targetY = computePlateStackHeight(hoverPt.x, hoverPt.z, p, p) + 0.12;
    }

    p.targetPos.set(hoverPt.x, targetY, hoverPt.z);
    const vx = hoverPt.x - interaction.lastWorld.x;
    p.targetRot.set(0.10, p.targetRot.y, THREE.MathUtils.clamp(-vx * 2.5, -0.42, 0.42));
    chopsticks.setTarget(p.targetPos, true, true);
    mama.setLookTarget(p.targetPos);
  } else if (interaction.mode === 'batter_drip') {
    const overPot = isInsidePot(hoverPt);
    const tipPos = new THREE.Vector3(hoverPt.x, overPot ? LAYOUT.oilY + 0.16 : 0.34, hoverPt.z);
    chopsticks.setTarget(tipPos, true, true);
    mama.setLookTarget(tipPos);

    // Continuous dripping when held still OR moved over the hot oil!
    if (overPot) {
      interaction.dripTimer -= dt;
      if (interaction.dripTimer <= 0) {
        interaction.dripTimer = 0.12;
        fx.spawnDrop({
          x: hoverPt.x + (Math.random() - 0.5) * 0.055,
          y: tipPos.y - 0.02,
          z: hoverPt.z + (Math.random() - 0.5) * 0.055,
          color: 0xf8edd2,
          scale: 1.15,
          kind: 'batter',
          targetY: LAYOUT.oilY,
        });
        if (Math.random() < 0.4) audio.playOilPop(0.45);
      }
    } else if (!isInsideBatter(hoverPt) && moveDist > 0.03 && Math.random() < 0.12) {
      kitchen.addCounterSplatter(hoverPt.x, hoverPt.z);
    }
  } else if (interaction.mode === 'salt') {
    const handPos = new THREE.Vector3(hoverPt.x, 0.30, hoverPt.z);
    chopsticks.setTarget(handPos, true, true);
    mama.setLookTarget(handPos);

    // Continuous sea-salt crystal shower while holding ("長押し") OR sweeping over plate/rack!
    interaction.saltTimer -= dt;
    if (interaction.saltTimer <= 0) {
      interaction.saltTimer = 0.095;
      audio.playSaltSprinkle();
      for (let i = 0; i < 4; i++) {
        const sx = hoverPt.x + (Math.random() - 0.5) * 0.085;
        const sz = hoverPt.z + (Math.random() - 0.5) * 0.085;
        fx.spawnDrop({
          x: sx,
          y: 0.27 + Math.random() * 0.03,
          z: sz,
          vx: (Math.random() - 0.5) * 0.05,
          vy: -0.32,
          vz: (Math.random() - 0.5) * 0.05,
          scale: 0.42,
          stretchY: 1.0,
          color: 0xffffff,
          kind: 'salt',
          targetY: LAYOUT.plateCenter.y + 0.03,
          onLand: (lx, lz) => {
            let closest = null;
            let bestD = 0.16;
            for (const p of pieces) {
              if (p.state !== 'plate' && p.state !== 'rack') continue;
              const d = Math.hypot(p.group.position.x - lx, p.group.position.z - lz);
              if (d < bestD) {
                bestD = d;
                closest = p;
              }
            }
            if (closest) {
              closest.addSaltCrystal(new THREE.Vector3(lx, closest.group.position.y + 0.025, lz));
            }
          },
        });
      }
    }
  } else if (interaction.mode === 'daikon' && interaction.carriedDaikon) {
    interaction.carriedDaikon.position.set(hoverPt.x, 0.32, hoverPt.z);
    chopsticks.setTarget(interaction.carriedDaikon.position, true, true);
    mama.setLookTarget(interaction.carriedDaikon.position);
  } else if (interaction.mode === 'pitcher') {
    const pPos = new THREE.Vector3(hoverPt.x + 0.08, 0.30, hoverPt.z);
    kitchen.pitcherGroup.position.lerp(pPos, Math.min(1, dt * 14));
    kitchen.pitcherGroup.rotation.z = THREE.MathUtils.lerp(kitchen.pitcherGroup.rotation.z, 0.78, Math.min(1, dt * 12));
    mama.setLookTarget(hoverPt);

    // Continuous glossy tentsuyu pouring while held ("長押し")!
    interaction.pourTimer -= dt;
    if (interaction.pourTimer <= 0) {
      interaction.pourTimer = 0.065;
      audio.playTentsuyuPour();
      const spoutWorld = kitchen.pitcherGroup.position.clone().add(new THREE.Vector3(-0.10, 0.055, 0));
      const overCup = getZoneDistance(spoutWorld, LAYOUT.cupCenter) < 0.17 || getZoneDistance(hoverPt, LAYOUT.cupCenter) < 0.17;
      const overPlate = isInsidePlate(spoutWorld) || isInsidePlate(hoverPt);
      const tY = overCup ? LAYOUT.cupCenter.y + 0.04 : LAYOUT.plateCenter.y + 0.03;

      fx.spawnDrop({
        x: spoutWorld.x + (Math.random() - 0.5) * 0.012,
        y: spoutWorld.y,
        z: spoutWorld.z + (Math.random() - 0.5) * 0.012,
        vx: -0.04,
        vy: -0.45,
        vz: 0,
        scale: 0.72,
        stretchY: 2.2,
        color: 0x3b1806,
        kind: 'tentsuyu',
        targetY: tY,
        onLand: (lx, lz) => {
          if (overCup) {
            cupFillLevel = Math.min(1.4, cupFillLevel + 0.045);
            kitchen.setCupFill(cupFillLevel);
            if (cupFillLevel > 1.05 && Math.random() < 0.25) {
              mama.react('amazed', 1.6);
            }
          } else if (overPlate) {
            const u = 0.5 + (lx - LAYOUT.plateCenter.x) / 0.31;
            const v = 0.5 - (lz - LAYOUT.plateCenter.z) / 0.31;
            if (u > 0.05 && u < 0.95 && v > 0.05 && v < 0.95) {
              kitchen.washiCtrl.addTentsuyuSpot(u, v, 24);
            }
            for (const p of pieces) {
              if (p.state !== 'plate') continue;
              if (Math.hypot(p.group.position.x - lx, p.group.position.z - lz) < 0.15) {
                p.addTentsuyu(0.11);
              }
            }
          }
        },
      });
    }
  } else if (interaction.mode === 'oil_stir') {
    const potPt = screenToPlane(interaction.clientX, interaction.clientY, oilPlane, new THREE.Vector3());
    if (isInsidePot(potPt)) {
      const lx = potPt.x - LAYOUT.potCenter.x;
      const lz = potPt.z - LAYOUT.potCenter.z;
      chopsticks.setTarget(new THREE.Vector3(potPt.x, LAYOUT.oilY + 0.05, potPt.z), false, true);
      if (moveDist > 0.04) {
        oilSurface.addRipple(lx, lz, 0.012, 1.6, 26.0);
        fx.spawnBubbleBurst(potPt.x, potPt.z, 3, 0.04, 0.55);
      }
      for (const p of pieces) {
        if (p.state !== 'frying') continue;
        const dx = p.group.position.x - potPt.x;
        const dz = p.group.position.z - potPt.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.16 && d > 0.001) {
          p.vel.x += (dx / d) * 0.04;
          p.vel.z += (dz / d) * 0.04;
        }
      }
    }
  }

  interaction.lastWorld.copy(hoverPt);
}

function onPointerUp(e) {
  if (interaction.activePointerId !== e.pointerId) return;
  interaction.activePointerId = null;

  const heldTime = performance.now() - interaction.downTime;
  const movePx = Math.hypot(e.clientX - interaction.downScreen.x, e.clientY - interaction.downScreen.y);
  const dropPt = screenToPlane(e.clientX, e.clientY, dragPlane, new THREE.Vector3());
  const rackPt = new THREE.Vector3();

  if (interaction.mode === 'piece' && interaction.piece) {
    const p = interaction.piece;
    const isQuickTap = heldTime < 240 && movePx < 18;

    if (isQuickTap && p.prevState === 'frying') {
      // Quick tap on frying piece -> flip & sizzle!
      p.state = 'frying';
      p.flipSpin += Math.PI;
      p.moisture = Math.min(1.0, p.moisture + 0.25);
      const lx = p.group.position.x - LAYOUT.potCenter.x;
      const lz = p.group.position.z - LAYOUT.potCenter.z;
      oilSurface.addRipple(lx, lz, 0.02, 1.55, 28.0);
      fx.spawnBubbleBurst(p.group.position.x, p.group.position.z, 18, 0.10, 1.0);
      audio.playOilDrop(0.55);
    } else if (isOnRackFromScreen(e.clientX, e.clientY, rackPt)) {
      // PRIORITY #1 above oil: Wire Oil-Draining Rack! (NEVER swallowed by Mama!)
      p.state = 'rack';
      const dx = rackPt.x - LAYOUT.potCenter.x;
      const dz = rackPt.z - LAYOUT.potCenter.z;
      const ang = THREE.MathUtils.clamp(Math.atan2(dz, dx), -2.02, -0.22);
      const r = THREE.MathUtils.clamp(Math.hypot(dx, dz), 0.21, 0.28);
      p.targetPos.set(
        LAYOUT.potCenter.x + Math.cos(ang) * r,
        LAYOUT.rackY + p.groundOffset * 0.85,
        LAYOUT.potCenter.z + Math.sin(ang) * r
      );
      p.targetRot.set(0, ang + Math.PI * 0.5, 0);
      p.oilWetness = Math.max(p.oilWetness, 0.85);
      audio.playChopstickClick();
      mama.setLookTarget(p.targetPos);
    } else if (isNearMama(e.clientX, e.clientY)) {
      // Feed directly to Mama's waiting tasting dish & hands!
      feedPieceToMama(p);
    } else if (isInsidePot(dropPt)) {
      // Drop into Hot Oil Pot -> JUUUWA!!
      p.state = 'frying';
      const dx = dropPt.x - LAYOUT.potCenter.x;
      const dz = dropPt.z - LAYOUT.potCenter.z;
      const d = Math.hypot(dx, dz);
      const maxR = LAYOUT.potRadius * 0.64;
      const clampedX = d > maxR ? LAYOUT.potCenter.x + (dx / d) * maxR : dropPt.x;
      const clampedZ = d > maxR ? LAYOUT.potCenter.z + (dz / d) * maxR : dropPt.z;

      p.targetPos.set(clampedX, LAYOUT.oilY - 0.006, clampedZ);
      p.vel.set((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05);
      p.oilWetness = 1.0;

      const splashIntensity = 0.72 + p.moisture * 0.45 + (p.batterAmount > 0.1 ? 0.22 : 0.3);
      oilSurface.addRipple(clampedX - LAYOUT.potCenter.x, clampedZ - LAYOUT.potCenter.z, 0.028 * splashIntensity, 1.5, 25.0);
      fx.spawnBubbleBurst(clampedX, clampedZ, Math.floor(28 * splashIntensity), 0.13, splashIntensity);
      fx.spawnSteam(clampedX, LAYOUT.oilY + 0.06, clampedZ, 1.35);
      if (p.batterAmount > 0.25) {
        fx.spawnTenkasu(clampedX, clampedZ, Math.min(6, Math.ceil(p.batterAmount * 3.2)));
      }
      audio.playOilDrop(splashIntensity);
      mama.react('curious', 1.8);
      mama.setLookTarget(p.targetPos);
    } else if (isInsidePlate(dropPt)) {
      // Plate cleanly INSIDE ceramic plate rim (strictly clamped so shrimp NEVER overhang or float!)
      p.state = 'plate';
      const dx = dropPt.x - LAYOUT.plateCenter.x;
      const dz = dropPt.z - LAYOUT.plateCenter.z;
      const d = Math.hypot(dx, dz);
      const plateScale = LAYOUT.isPortrait ? 0.88 : 1.0;
      const maxR = LAYOUT.plateRadius * plateScale * (p.type === 'ebi' ? 0.38 : 0.48);
      const px = d > maxR ? LAYOUT.plateCenter.x + (dx / d) * maxR : dropPt.x;
      const pz = d > maxR ? LAYOUT.plateCenter.z + (dz / d) * maxR : dropPt.z;
      const stackY = computePlateStackHeight(px, pz, p, p);

      p.targetPos.set(px, stackY, pz);
      const isStacked = stackY > LAYOUT.plateCenter.y + 0.017 + p.groundOffset + 0.01;
      const tilt = isStacked ? (Math.random() - 0.5) * 0.22 : 0;
      p.targetRot.set(tilt, p.group.rotation.y, isStacked ? (Math.random() - 0.5) * 0.14 : 0);
      audio.playPlateSet(Math.min(1, p.doneness));

      if (p.oilWetness > 0.15) {
        const u = 0.5 + (px - LAYOUT.plateCenter.x) / (0.31 * plateScale);
        const v = 0.5 - (pz - LAYOUT.plateCenter.z) / (0.31 * plateScale);
        if (u > 0.05 && u < 0.95 && v > 0.05 && v < 0.95) {
          kitchen.washiCtrl.addOilSpot(u, v, 40 + p.batterAmount * 14, 0.26);
        }
      }

      const platedCount = pieces.filter((x) => x.state === 'plate').length;
      if (stackY > 0.11 || platedCount >= 3) {
        mama.react('clapping', 2.4);
        audio.playMamaWarmHum(0.15);
      } else {
        mama.react('happy', 1.9);
      }
      mama.setLookTarget(LAYOUT.plateCenter);
    } else if (isInsideBatter(dropPt)) {
      // Quick release over batter -> moderate dip (~0.25) and rest neatly back on tray
      p.addBatter(0.25);
      kitchen.triggerBatterRipple(0.016);
      audio.playBatterDip();
      p.state = 'tray';
      p.targetPos.copy(getTraySlotWorldPos(p.traySlot));
      p.targetRot.set(0, TRAY_SLOTS[p.traySlot].rotY, 0);
    } else {
      if (p.doneness > 0.15) {
        p.state = 'plate';
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.06;
        const px = LAYOUT.plateCenter.x + Math.cos(ang) * r;
        const pz = LAYOUT.plateCenter.z + Math.sin(ang) * r;
        p.targetPos.set(px, computePlateStackHeight(px, pz, p, p), pz);
        p.targetRot.set(0, p.group.rotation.y, 0);
        audio.playPlateSet(0.7);
        mama.react('happy', 1.5);
      } else {
        p.state = 'tray';
        p.targetPos.copy(getTraySlotWorldPos(p.traySlot));
        p.targetRot.set(0, TRAY_SLOTS[p.traySlot].rotY, 0);
      }
    }
  } else if (interaction.mode === 'daikon' && interaction.carriedDaikon) {
    const pos = interaction.carriedDaikon.position.clone();
    scene.remove(interaction.carriedDaikon);
    interaction.carriedDaikon = null;

    if (getZoneDistance(pos, LAYOUT.cupCenter) < 0.16) {
      cupFillLevel = Math.min(1.4, cupFillLevel + 0.18);
      kitchen.setCupFill(cupFillLevel);
      audio.playBatterDip();
      mama.react('happy', 1.5);
    } else {
      let closest = null;
      let bestD = 0.22;
      for (const p of pieces) {
        if (p.state !== 'plate') continue;
        const d = Math.hypot(p.group.position.x - pos.x, p.group.position.z - pos.z);
        if (d < bestD) {
          bestD = d;
          closest = p;
        }
      }
      if (closest) {
        closest.addDaikonScoop(pos, textures);
        audio.playPlateSet(0.4);
        mama.react('happy', 1.6);
      }
    }
  }

  interaction.mode = null;
  interaction.piece = null;
  chopsticks.release();
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);

function applyViewportSize(w, h) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h);
  computeResponsiveFraming(w, h);
  currentCamPos.copy(baseCamPos);
  currentCamLook.copy(baseCamLook);
  camera.position.copy(currentCamPos);
  camera.lookAt(currentCamLook);
  syncAllToLayout();
  dofPass.resize(w, h);
}

window.addEventListener('resize', () => {
  applyViewportSize(window.innerWidth, window.innerHeight);
});

// 8. Main Physics, Frying & Rendering Loop
let prevTime = performance.now();
let elapsed = 0;
let fpsSmooth = 60;
let focusDistSmooth = 2.05;
let lastRenderMs = 0;

function stepSimulation(dt) {
  elapsed += dt;
  const heat = HEAT_VALUES[gasHeatLevel];

  if (interaction.batterDipCooldown > 0) interaction.batterDipCooldown -= dt;
  if (plateServeCelebrationTimer > 0) plateServeCelebrationTimer -= dt;

  // Process active one-finger hold & drag continuously every frame!
  updateActiveHold(dt);

  if (interaction.mode !== 'pitcher') {
    kitchen.pitcherGroup.position.lerp(LAYOUT.pitcherCenter, Math.min(1, dt * 8));
    kitchen.pitcherGroup.rotation.z += (0 - kitchen.pitcherGroup.rotation.z) * Math.min(1, dt * 8);
  }

  for (let i = respawnQueue.length - 1; i >= 0; i--) {
    respawnQueue[i].timer -= dt;
    if (respawnQueue[i].timer <= 0) {
      const slotIdx = respawnQueue[i].slotIdx;
      const occupied = pieces.some((p) => p.state === 'tray' && p.traySlot === slotIdx);
      if (!occupied) spawnTrayPiece(slotIdx);
      respawnQueue.splice(i, 1);
    }
  }

  let activeFryCount = 0;
  let totalFryEnergy = 0;

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];

    if (p.state === 'frying') {
      activeFryCount++;
      const cookSpeed = (p.type === 'shiso' ? 0.165 : 0.105) * (0.55 + heat * 0.72);
      p.doneness = Math.min(1.85, p.doneness + dt * cookSpeed);
      p.moisture = Math.max(0.14, p.moisture - dt * (0.095 + heat * 0.06));
      p.oilWetness = 1.0;

      const bob = Math.sin(elapsed * 5.2 + p.id * 1.9) * 0.0042;
      p.targetPos.y = LAYOUT.oilY - 0.004 + Math.min(0.015, p.doneness * 0.014) + bob;

      for (let j = i + 1; j < pieces.length; j++) {
        const q = pieces[j];
        if (q.state !== 'frying') continue;
        const dx = p.targetPos.x - q.targetPos.x;
        const dz = p.targetPos.z - q.targetPos.z;
        const d = Math.hypot(dx, dz);
        const minD = 0.145;
        if (d < minD && d > 0.001) {
          const push = (minD - d) * 1.8 * dt;
          p.vel.x += (dx / d) * push;
          p.vel.z += (dz / d) * push;
          q.vel.x -= (dx / d) * push;
          q.vel.z -= (dz / d) * push;
        }
      }

      p.vel.multiplyScalar(0.94);
      p.targetPos.x += p.vel.x * dt;
      p.targetPos.z += p.vel.z * dt;
      const dxC = p.targetPos.x - LAYOUT.potCenter.x;
      const dzC = p.targetPos.z - LAYOUT.potCenter.z;
      const distC = Math.hypot(dxC, dzC);
      const maxR = LAYOUT.potRadius * 0.62;
      if (distC > maxR) {
        p.targetPos.x = LAYOUT.potCenter.x + (dxC / distC) * maxR;
        p.targetPos.z = LAYOUT.potCenter.z + (dzC / distC) * maxR;
        p.vel.multiplyScalar(-0.4);
      }

      p.targetRot.set(
        p.flipSpin + Math.sin(elapsed * 3.4 + p.id) * 0.055,
        p.targetRot.y + dt * 0.12,
        Math.cos(elapsed * 2.9 + p.id) * 0.045
      );

      if (p.foamCollar) {
        p.foamCollar.rotation.y += dt * 0.85;
      }

      const fryIntensity = (0.34 + p.moisture * 1.05) * (0.62 + heat * 0.55);
      totalFryEnergy += fryIntensity;
      p.bubbleTimer -= dt * (20 + fryIntensity * 34);
      if (p.bubbleTimer <= 0) {
        p.bubbleTimer = 0.42 + Math.random() * 0.42;
        fx.spawnBubbleBurst(
          p.group.position.x,
          p.group.position.z,
          p.type === 'renkon' ? 12 : 9,
          0.082,
          fryIntensity
        );
        if (Math.random() < 0.42) {
          oilSurface.addRipple(
            p.group.position.x - LAYOUT.potCenter.x,
            p.group.position.z - LAYOUT.potCenter.z,
            0.0095 * fryIntensity,
            1.35,
            32.0
          );
        }
      }

      p.updateVisuals();
    } else if (p.state === 'rack' || (p.state === 'held' && p.oilWetness > 0.25)) {
      p.oilWetness = Math.max(0.15, p.oilWetness - dt * 0.12);
      p.dripTimer -= dt;
      if (p.dripTimer <= 0 && p.oilWetness > 0.28) {
        p.dripTimer = 0.35 + Math.random() * 0.55;
        const pos = p.group.position;
        if (getZoneDistance(pos, LAYOUT.potCenter) < LAYOUT.potRadius * 0.95) {
          fx.spawnDrop({
            x: pos.x + (Math.random() - 0.5) * 0.04,
            y: pos.y - 0.02,
            z: pos.z + (Math.random() - 0.5) * 0.04,
            color: 0xe6ad3e,
            scale: 0.78,
            stretchY: 1.9,
            kind: 'oil',
            targetY: LAYOUT.oilY,
          });
        }
      }
    }

    const lerpSpeed = p.state === 'held' ? 20 : (p.state === 'eaten' ? 10 : 12);
    p.group.position.lerp(p.targetPos, Math.min(1, dt * lerpSpeed));
    p.group.rotation.x += (p.targetRot.x - p.group.rotation.x) * Math.min(1, dt * 10);
    p.group.rotation.y += (p.targetRot.y - p.group.rotation.y) * Math.min(1, dt * 10);
    p.group.rotation.z += (p.targetRot.z - p.group.rotation.z) * Math.min(1, dt * 10);
  }

  if (interaction.activePointerId === null && activeFryCount === 0) {
    idleSeconds += dt;
    if (idleSeconds > 10.0) {
      idleSeconds = 0;
      mama.triggerIdleNudge();
      oilSurface.addRipple(0, 0, 0.012, 1.35, 24.0);
    }
  } else {
    idleSeconds = 0;
  }

  kitchen.update(dt, elapsed, heat);
  oilSurface.update(dt, heat, activeFryCount);
  fx.update(dt, heat, activeFryCount, oilSurface);
  mama.update(dt, elapsed);
  chopsticks.update(dt);
  audio.updateContinuous(dt, totalFryEnergy, heat);

  // Subtle cozy hot tea steam curling gently from Mama's ceramic teacup!
  if (Math.random() < dt * 2.2) {
    fx.spawnSteam(
      mama.group.position.x + 0.145,
      0.11,
      mama.group.position.z - 0.055,
      0.38
    );
  }

  oilBounceLight.intensity = 1.1 + heat * 0.38 + Math.min(0.55, totalFryEnergy * 0.25) + Math.sin(elapsed * 16) * 0.06;

  let desiredFocusPoint = LAYOUT.potCenter.clone().add(new THREE.Vector3(0, LAYOUT.oilY, 0.04));
  let camShiftX = 0;
  if (interaction.mode === 'piece' && interaction.piece) {
    desiredFocusPoint.copy(interaction.piece.group.position);
    camShiftX = LAYOUT.isPortrait ? 0 : interaction.piece.group.position.x * 0.07;
  } else if (interaction.mode === 'salt' || interaction.mode === 'pitcher' || plateServeCelebrationTimer > 0) {
    desiredFocusPoint.copy(LAYOUT.plateCenter).add(new THREE.Vector3(0, 0.08, 0));
    camShiftX = LAYOUT.isPortrait ? 0 : 0.06;
  }

  currentCamPos.x += (baseCamPos.x + camShiftX - currentCamPos.x) * Math.min(1, dt * 2.5);
  currentCamPos.y += (baseCamPos.y + Math.sin(elapsed * 0.65) * 0.007 - currentCamPos.y) * Math.min(1, dt * 2.5);
  currentCamPos.z += (baseCamPos.z - currentCamPos.z) * Math.min(1, dt * 2.5);
  camera.position.copy(currentCamPos);

  currentCamLook.x += (baseCamLook.x + camShiftX * 0.55 - currentCamLook.x) * Math.min(1, dt * 2.5);
  currentCamLook.y += (baseCamLook.y - currentCamLook.y) * Math.min(1, dt * 2.5);
  currentCamLook.z += (baseCamLook.z - currentCamLook.z) * Math.min(1, dt * 2.5);
  camera.lookAt(currentCamLook);

  const targetFocusDist = camera.position.distanceTo(desiredFocusPoint);
  focusDistSmooth += (targetFocusDist - focusDistSmooth) * Math.min(1, dt * 5.0);

  const t0 = performance.now();
  dofPass.render(scene, camera, focusDistSmooth, LAYOUT.bulbPos, elapsed);
  lastRenderMs = performance.now() - t0;
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - prevTime) / 1000);
  prevTime = now;
  if (dt > 0) fpsSmooth = fpsSmooth * 0.92 + (1 / dt) * 0.08;
  stepSimulation(dt);
}

requestAnimationFrame(animate);

// Internal diagnostic & QA verification hook (zero visual footprint)
window.__tempuraDebug = {
  setViewport(w, h) {
    applyViewportSize(w, h);
  },
  stepAndRender(steps = 12, dt = 0.033) {
    for (let i = 0; i < steps; i++) stepSimulation(dt);
  },
  getScreenPoint(name) {
    const map = {
      pot: LAYOUT.potCenter.clone().add(new THREE.Vector3(0, LAYOUT.oilY, 0.05)),
      rack: LAYOUT.potCenter.clone().add(new THREE.Vector3(0.14, LAYOUT.rackY, -0.22)),
      batter: LAYOUT.batterCenter.clone().add(new THREE.Vector3(0, LAYOUT.batterY, 0)),
      plate: LAYOUT.plateCenter.clone().add(new THREE.Vector3(0, 0.03, 0)),
      salt: LAYOUT.saltCenter.clone().add(new THREE.Vector3(0, 0.03, 0)),
      daikon: LAYOUT.daikonCenter.clone().add(new THREE.Vector3(0, 0.03, 0)),
      pitcher: LAYOUT.pitcherCenter.clone().add(new THREE.Vector3(0, 0.07, 0)),
      cup: LAYOUT.cupCenter.clone().add(new THREE.Vector3(0, 0.05, 0)),
      knob: LAYOUT.knobCenter.clone().add(new THREE.Vector3(0, 0.03, 0)),
      mama: mama.getMouthWorldPos(),
      ebi0: pieces.find((p) => p.type === 'ebi' && p.state === 'tray')?.group.getWorldPosition(new THREE.Vector3()) || LAYOUT.trayCenter,
    };
    const v = map[name];
    return v ? projectToScreenPx(v) : null;
  },
  getStats() {
    return {
      isPortrait: LAYOUT.isPortrait,
      triangles: dofPass.lastSceneTriangles || 0,
      calls: dofPass.lastSceneCalls || 0,
      renderMs: +lastRenderMs.toFixed(2),
      fps: Math.round(fpsSmooth),
      pixelRatio: renderer.getPixelRatio(),
      pieces: pieces.map((p) => ({
        id: p.id,
        type: p.type,
        state: p.state,
        batter: +p.batterAmount.toFixed(2),
        doneness: +p.doneness.toFixed(2),
        salt: +p.saltAmount.toFixed(2),
        tentsuyu: +p.tentsuyuAmount.toFixed(2),
        daikon: p.daikonCount,
      })),
      cupFill: +cupFillLevel.toFixed(2),
      splatters: kitchen.getSplatterCount(),
      heatLevel: gasHeatLevel,
      eatenCount,
    };
  },
  stageAction(kind) {
    if (kind === 'hero_lift') {
      const ebiHero = pieces.find((p) => p.type === 'ebi' && p.state === 'tray');
      const kabocha = pieces.find((p) => p.type === 'kabocha' && p.state === 'tray');
      const renkon = pieces.find((p) => p.type === 'renkon' && p.state === 'tray');
      const nasu = pieces.find((p) => p.type === 'nasu' && p.state === 'tray');
      const shiso = pieces.find((p) => p.type === 'shiso' && p.state === 'tray');
      if (kabocha) {
        kabocha.addBatter(0.85);
        kabocha.state = 'frying';
        kabocha.doneness = 0.65;
        kabocha.moisture = 0.92;
        kabocha.targetPos.set(LAYOUT.potCenter.x - 0.1, LAYOUT.oilY, LAYOUT.potCenter.z + 0.04);
        kabocha.group.position.copy(kabocha.targetPos);
        kabocha.updateVisuals();
        oilSurface.addRipple(-0.1, 0.04, 0.032, 1.45, 26.0);
        fx.spawnBubbleBurst(kabocha.targetPos.x, kabocha.targetPos.z, 55, 0.10, 1.15);
        fx.spawnTenkasu(kabocha.targetPos.x, kabocha.targetPos.z, 14);
        respawnQueue.push({ slotIdx: kabocha.traySlot, timer: 0.02 });
      }
      if (shiso) {
        shiso.addBatter(0.42);
        shiso.state = 'rack';
        shiso.doneness = 0.78;
        shiso.targetPos.set(LAYOUT.potCenter.x + 0.16, LAYOUT.rackY + shiso.groundOffset * 0.85, LAYOUT.potCenter.z - 0.19);
        shiso.group.position.copy(shiso.targetPos);
        shiso.targetRot.set(0, -0.5, 0);
        shiso.updateVisuals();
        respawnQueue.push({ slotIdx: shiso.traySlot, timer: 0.02 });
      }
      if (ebiHero) {
        ebiHero.addBatter(0.92);
        ebiHero.state = 'held';
        ebiHero.doneness = 0.84;
        ebiHero.oilWetness = 1.0;
        ebiHero.targetPos.set(LAYOUT.potCenter.x + 0.04, LAYOUT.oilY + 0.17, LAYOUT.potCenter.z + 0.07);
        ebiHero.group.position.copy(ebiHero.targetPos);
        ebiHero.targetRot.set(0.22, Math.PI - 0.34, -0.16);
        ebiHero.group.rotation.copy(ebiHero.targetRot);
        ebiHero.updateVisuals();
        chopsticks.setTarget(ebiHero.targetPos, true, true);
        chopsticks.group.position.copy(ebiHero.targetPos);
        oilSurface.addRipple(0.04, 0.07, 0.028, 1.5, 28.0);
        fx.spawnDrop({ x: ebiHero.targetPos.x - 0.02, y: ebiHero.targetPos.y - 0.03, z: ebiHero.targetPos.z, color: 0xeeb13e, scale: 0.95, stretchY: 2.2, targetY: LAYOUT.oilY });
        fx.spawnSteam(LAYOUT.potCenter.x, LAYOUT.oilY + 0.1, LAYOUT.potCenter.z, 1.35);
        respawnQueue.push({ slotIdx: ebiHero.traySlot, timer: 0.02 });
      }
      if (renkon) {
        renkon.addBatter(0.72);
        renkon.state = 'plate';
        renkon.doneness = 0.92;
        renkon.targetPos.set(LAYOUT.plateCenter.x - 0.045, computePlateStackHeight(LAYOUT.plateCenter.x - 0.045, LAYOUT.plateCenter.z + 0.025, renkon, renkon), LAYOUT.plateCenter.z + 0.025);
        renkon.group.position.copy(renkon.targetPos);
        renkon.updateVisuals();
        for (let k = 0; k < 14; k++) {
          renkon.addSaltCrystal(renkon.targetPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.08, 0.03, (Math.random() - 0.5) * 0.08)));
        }
        kitchen.washiCtrl.addOilSpot(0.45, 0.48, 44, 0.26);
        respawnQueue.push({ slotIdx: renkon.traySlot, timer: 0.02 });
      }
      if (nasu) {
        nasu.addBatter(0.68);
        nasu.state = 'plate';
        nasu.doneness = 0.96;
        nasu.targetPos.set(LAYOUT.plateCenter.x + 0.055, computePlateStackHeight(LAYOUT.plateCenter.x + 0.055, LAYOUT.plateCenter.z - 0.03, nasu, nasu), LAYOUT.plateCenter.z - 0.03);
        nasu.group.position.copy(nasu.targetPos);
        nasu.updateVisuals();
        nasu.addDaikonScoop(nasu.targetPos.clone().add(new THREE.Vector3(0, 0.035, 0)), textures);
        respawnQueue.push({ slotIdx: nasu.traySlot, timer: 0.02 });
      }
      cupFillLevel = 0.72;
      kitchen.setCupFill(cupFillLevel);
      gasHeatLevel = 2; // High vivid blue flame ring visible!
      mama.react('happy', 4.0);
      mama.setLookTarget(LAYOUT.potCenter);
    }
  },
};
