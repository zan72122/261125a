import * as THREE from 'three';
import { LAYOUT } from './kitchen.js';

/**
 * Photorealistic Live-Action-Style Family Presence — ZERO mannequin/doll body parts!
 * Replaces procedural human hands/torso with an authentic warm Japanese night-kitchen tasting setting
 * directly across the hinoki counter from the tempura pot:
 * - Woven indigo-linen placemat (ランチョンマット)
 * - Handmade warm-ivory stoneware tasting plate (ママの取り皿) inviting the child to share freshly fried tempura
 * - Steaming ceramic teacup of roasted green tea (ほうじ茶の湯呑み) with subtle warm liquid sheen
 * - Mama's personal dark-lacquered chopsticks (塗り箸) resting on a glazed ceramic rest (箸置き),
 *   which lift gracefully with lively warm motion & happy crunch when the child shares tempura or completes a platter!
 * - Soft dark-indigo linen kitchen noren curtain (暖簾) hanging softly in the warm backlit bokeh behind!
 */
export function createMama(scene, textures) {
  const mama = new THREE.Group();
  mama.position.copy(LAYOUT.mamaPos);
  scene.add(mama);

  // 1. Low raised dark cedar serving tray (膳 / お盆) clearly visible on back-left counter!
  const trayWoodMat = new THREE.MeshStandardMaterial({
    map: textures.woodColor,
    bumpMap: textures.woodBump,
    bumpScale: 0.008,
    color: 0x3a2618,
    roughness: 0.42,
    metalness: 0.06,
  });
  const trayBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.032, 0.29), trayWoodMat);
  trayBase.position.set(0.0, 0.016, 0.0);
  trayBase.receiveShadow = true;
  trayBase.castShadow = true;
  mama.add(trayBase);

  const trayContent = new THREE.Group();
  trayContent.position.y = 0.032;
  mama.add(trayContent);

  // Woven indigo-linen placemat resting on top of cedar tray
  const matFabric = new THREE.MeshStandardMaterial({
    map: textures.linenColor,
    bumpMap: textures.linenBump,
    bumpScale: 0.008,
    color: 0x2d3540,
    roughness: 0.9,
  });
  const placemat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.004, 0.25), matFabric);
  placemat.position.set(0.0, 0.002, 0.0);
  placemat.receiveShadow = true;
  trayContent.add(placemat);

  // 2. Handmade warm-ivory glazed stoneware tasting plate (ママの取り皿 — clearly visible at back-left!)
  const ivoryCeramicMat = new THREE.MeshStandardMaterial({
    map: textures.ceramicColor,
    bumpMap: textures.ceramicBump,
    bumpScale: 0.006,
    color: 0xdfd6c7,
    roughness: 0.34,
    metalness: 0.04,
  });
  const dishPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.088, 0.0),
    new THREE.Vector2(0.132, 0.015),
    new THREE.Vector2(0.148, 0.032),
    new THREE.Vector2(0.142, 0.035),
    new THREE.Vector2(0.122, 0.019),
    new THREE.Vector2(0.084, 0.010),
    new THREE.Vector2(0.0, 0.010),
  ];
  const tastingDish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 40), ivoryCeramicMat);
  tastingDish.position.set(-0.045, 0.004, 0.015);
  tastingDish.castShadow = true;
  tastingDish.receiveShadow = true;
  trayContent.add(tastingDish);

  // Subtle folded crisp white napkin corner under chopsticks
  const napkin = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.005, 0.09),
    new THREE.MeshStandardMaterial({ map: textures.linenColor, color: 0xe3dacb, roughness: 0.9 })
  );
  napkin.position.set(0.135, 0.006, 0.045);
  napkin.rotation.y = -0.14;
  napkin.receiveShadow = true;
  trayContent.add(napkin);

  // 3. Handmade stoneware Japanese Teacup (湯呑み) filled with warm glossy roasted tea (ほうじ茶)
  const yunomiMat = new THREE.MeshStandardMaterial({
    map: textures.ceramicColor,
    bumpMap: textures.ceramicBump,
    bumpScale: 0.008,
    color: 0x5c5045,
    roughness: 0.38,
    metalness: 0.08,
  });
  const cupPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.034, 0.0),
    new THREE.Vector2(0.036, 0.012),
    new THREE.Vector2(0.048, 0.042),
    new THREE.Vector2(0.050, 0.108),
    new THREE.Vector2(0.047, 0.122),
    new THREE.Vector2(0.043, 0.122),
    new THREE.Vector2(0.044, 0.100),
    new THREE.Vector2(0.038, 0.020),
    new THREE.Vector2(0.0, 0.018),
  ];
  const teacup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 32), yunomiMat);
  teacup.position.set(0.145, 0.004, -0.045);
  teacup.castShadow = true;
  teacup.receiveShadow = true;
  trayContent.add(teacup);

  const teaSurface = new THREE.Mesh(
    new THREE.CircleGeometry(0.043, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0x6b3814,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    })
  );
  teaSurface.rotation.x = -Math.PI / 2;
  teaSurface.position.set(0.145, 0.105, -0.045);
  trayContent.add(teaSurface);

  // 4. Glazed ceramic Chopstick Rest (箸置き) + Mama's personal dark-lacquered Chopsticks (塗り箸)
  const restMat = new THREE.MeshStandardMaterial({
    color: 0x35505e,
    roughness: 0.24,
    metalness: 0.1,
  });
  const hashioki = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.034, 6, 12), restMat);
  hashioki.rotation.x = Math.PI / 2;
  hashioki.position.set(0.115, 0.014, 0.088);
  hashioki.castShadow = true;
  trayContent.add(hashioki);

  const mamaChopsticksPivot = new THREE.Group();
  mamaChopsticksPivot.position.set(0.115, 0.028, 0.088);
  trayContent.add(mamaChopsticksPivot);

  const lacquerStickMat = new THREE.MeshPhysicalMaterial({
    color: 0x2c160e,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
  });
  const goldBandMat = new THREE.MeshStandardMaterial({
    color: 0xc29848,
    roughness: 0.28,
    metalness: 0.85,
  });

  const mSticks = [];
  for (const dz of [-0.007, 0.007]) {
    const sp = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0046, 0.24, 10), lacquerStickMat);
    stick.rotation.z = Math.PI / 2;
    stick.position.set(0.04, 0, dz);
    stick.castShadow = true;
    sp.add(stick);

    // Subtle gold ring accent near handle end
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0044, 0.0045, 0.009, 10), goldBandMat);
    band.rotation.z = Math.PI / 2;
    band.position.set(0.11, 0, dz);
    sp.add(band);

    mamaChopsticksPivot.add(sp);
    mSticks.push(sp);
  }

  // 5. Atmospheric Soft Backlit Indigo Linen Noren Curtain (暖簾) hanging in the background night kitchen!
  const norenGroup = new THREE.Group();
  norenGroup.position.set(-0.26, 1.05, -0.78);
  mama.add(norenGroup);

  const norenMat = new THREE.MeshStandardMaterial({
    map: textures.linenColor,
    bumpMap: textures.linenBump,
    bumpScale: 0.01,
    color: 0x1d2633,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 1.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.65 })
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 0.32;
  norenGroup.add(rod);

  const norenPanels = [];
  for (let p = 0; p < 3; p++) {
    const pGeo = new THREE.PlaneGeometry(0.32, 0.62, 6, 10);
    const pos = pGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(x * 18 + p) * 0.014 * (0.35 - y));
    }
    pGeo.computeVertexNormals();
    const panel = new THREE.Mesh(pGeo, norenMat);
    panel.position.set((p - 1) * 0.34, 0.0, 0);
    norenGroup.add(panel);
    norenPanels.push(panel);
  }

  // Living warm non-verbal animation state (gentle noren sway, teacup steam pulse, joyful chopstick tasting!)
  let emotion = 'warm';
  let emotionTimer = 0;
  let idleNudgePhase = 0;

  return {
    group: mama,
    tastingDish,
    setLookTarget() {
      // No mannequin head to rotate — natural still-life kitchen ambiance!
    },
    react(type, duration = 2.2) {
      emotion = type;
      emotionTimer = duration;
    },
    triggerIdleNudge() {
      idleNudgePhase = 1.0;
    },
    getMouthWorldPos(out = new THREE.Vector3()) {
      tastingDish.getWorldPosition(out);
      out.y += 0.032;
      return out;
    },
    update(dt, elapsed) {
      if (emotionTimer > 0) {
        emotionTimer -= dt;
        if (emotionTimer <= 0) emotion = 'warm';
      }
      if (idleNudgePhase > 0) {
        idleNudgePhase = Math.max(0, idleNudgePhase - dt * 0.65);
      }

      // Ultra-gentle kitchen air drift on the hanging indigo linen noren panels
      norenPanels.forEach((panel, idx) => {
        panel.rotation.x = Math.sin(elapsed * 0.75 + idx * 1.1) * 0.025;
      });

      // Animate Mama's personal lacquered chopsticks warmly when tasting / celebrating!
      if (emotion === 'eating') {
        const t = Math.sin(elapsed * 10) * 0.5 + 0.5;
        mamaChopsticksPivot.position.lerp(new THREE.Vector3(-0.01, 0.14 + t * 0.04, 0.02), Math.min(1, dt * 8));
        mamaChopsticksPivot.rotation.set(0.15, 0.25, -0.35 - t * 0.12);
        mSticks[0].rotation.y = 0.06 * (1 - t);
        mSticks[1].rotation.y = -0.06 * (1 - t);
      } else if (emotion === 'clapping' || emotion === 'happy' || emotion === 'amazed') {
        const bob = Math.sin(elapsed * 9) * 0.018;
        mamaChopsticksPivot.position.lerp(new THREE.Vector3(0.08, 0.065 + bob, 0.075), Math.min(1, dt * 7));
        mamaChopsticksPivot.rotation.set(0, 0.14, -0.18 + bob * 3);
        mSticks[0].rotation.y = 0.04;
        mSticks[1].rotation.y = -0.04;
      } else if (idleNudgePhase > 0) {
        const tap = Math.sin(idleNudgePhase * Math.PI * 2) * 0.015;
        mamaChopsticksPivot.position.lerp(new THREE.Vector3(0.115, 0.038 + Math.abs(tap), 0.095), Math.min(1, dt * 8));
        mamaChopsticksPivot.rotation.set(0, 0, -Math.abs(tap) * 4);
      } else {
        mamaChopsticksPivot.position.lerp(new THREE.Vector3(0.115, 0.028, 0.095), Math.min(1, dt * 6));
        mamaChopsticksPivot.rotation.x += (0 - mamaChopsticksPivot.rotation.x) * Math.min(1, dt * 6);
        mamaChopsticksPivot.rotation.y += (0 - mamaChopsticksPivot.rotation.y) * Math.min(1, dt * 6);
        mamaChopsticksPivot.rotation.z += (0 - mamaChopsticksPivot.rotation.z) * Math.min(1, dt * 6);
        mSticks[0].rotation.y *= 0.85;
        mSticks[1].rotation.y *= 0.85;
      }
    },
  };
}

/**
 * Foreground Long Dark-Bamboo Cooking Chopsticks (菜箸) extending cleanly from right edge
 */
export function createCookingChopsticks(scene, textures) {
  const group = new THREE.Group();
  scene.add(group);

  const stickMat = new THREE.MeshStandardMaterial({
    color: 0x9c6e38,
    bumpMap: textures.woodBump,
    bumpScale: 0.006,
    roughness: 0.38,
    metalness: 0.05,
  });

  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x3b2412,
    roughness: 0.34,
    metalness: 0.06,
  });

  function makeStick(yOff) {
    const pivot = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0082, 1.05, 10), stickMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.525, yOff, 0);
    shaft.castShadow = true;
    pivot.add(shaft);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0044, 0.14, 10), tipMat);
    tip.rotation.z = Math.PI / 2;
    tip.position.set(0.07, yOff, 0);
    pivot.add(tip);
    return pivot;
  }

  const topPivot = makeStick(0.012);
  const botPivot = makeStick(-0.012);
  group.add(topPivot, botPivot);

  group.rotation.order = 'YXZ';
  group.rotation.y = -0.58;
  group.rotation.z = 0.20;
  group.position.set(0.86, 0.56, 0.92);

  const restPos = new THREE.Vector3(0.86, 0.56, 0.92);
  let targetPos = restPos.clone();
  let clamping = false;
  let active = false;

  return {
    group,
    setTarget(pos, isClamping, isActive) {
      targetPos.copy(pos);
      clamping = isClamping;
      active = isActive;
    },
    release() {
      active = false;
      clamping = false;
      targetPos.copy(restPos);
    },
    update(dt) {
      const speed = active ? 18 : 6;
      group.position.lerp(targetPos, Math.min(1, dt * speed));
      const openAngle = clamping ? 0.018 : 0.095;
      topPivot.rotation.z += (openAngle - topPivot.rotation.z) * Math.min(1, dt * 16);
      botPivot.rotation.z += (-openAngle - botPivot.rotation.z) * Math.min(1, dt * 16);
      const targetZ = active ? 0.24 : 0.16;
      group.rotation.z += (targetZ - group.rotation.z) * Math.min(1, dt * 10);
    },
  };
}
