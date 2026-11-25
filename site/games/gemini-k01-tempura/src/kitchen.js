import * as THREE from 'three';
import { createWashiPaperTexture } from './textures.js';

// Dynamic layout coordinates (automatically switches between Landscape iPad and Compact Portrait iPhone!)
export const LAYOUT = {
  isPortrait: false,
  potCenter: new THREE.Vector3(0.0, 0.0, -0.04),
  potRadius: 0.31,
  potRimY: 0.275,
  oilY: 0.215,
  rackY: 0.288,
  batterCenter: new THREE.Vector3(-0.56, 0.0, -0.20),
  batterRadius: 0.175,
  batterY: 0.11,
  trayCenter: new THREE.Vector3(-0.62, 0.024, 0.24),
  plateCenter: new THREE.Vector3(0.62, 0.030, 0.04),
  plateRadius: 0.26,
  saltCenter: new THREE.Vector3(0.45, 0.02, 0.37),
  daikonCenter: new THREE.Vector3(0.73, 0.02, 0.36),
  pitcherCenter: new THREE.Vector3(0.74, 0.02, -0.29),
  cupCenter: new THREE.Vector3(0.46, 0.02, -0.29),
  knobCenter: new THREE.Vector3(-0.29, 0.04, 0.36),
  bulbPos: new THREE.Vector3(0.30, 0.94, -0.66),
  mamaPos: new THREE.Vector3(-0.56, 0.0, -0.64),
};

export function setLayoutMode(isPortrait) {
  LAYOUT.isPortrait = isPortrait;
  if (isPortrait) {
    // Compact 3-tier vertical layout for iPhone portrait (375x667 / 390x844): ZERO horizontal clipping!
    LAYOUT.potCenter.set(0.0, 0.0, -0.14);
    LAYOUT.knobCenter.set(-0.38, 0.04, 0.14);
    LAYOUT.batterCenter.set(-0.25, 0.0, 0.39);
    LAYOUT.plateCenter.set(0.24, 0.030, 0.39);
    LAYOUT.trayCenter.set(-0.18, 0.024, 0.80);
    LAYOUT.saltCenter.set(0.19, 0.02, 0.74);
    LAYOUT.daikonCenter.set(0.36, 0.02, 0.76);
    LAYOUT.cupCenter.set(0.22, 0.02, 0.94);
    LAYOUT.pitcherCenter.set(0.39, 0.02, 0.94);
    LAYOUT.bulbPos.set(0.22, 1.06, -0.62);
    LAYOUT.mamaPos.set(-0.24, 0.0, -0.72);
  } else {
    // Wide horizontal cinema layout for iPad / desktop
    LAYOUT.potCenter.set(0.0, 0.0, -0.04);
    LAYOUT.knobCenter.set(-0.29, 0.04, 0.36);
    LAYOUT.batterCenter.set(-0.56, 0.0, -0.20);
    LAYOUT.trayCenter.set(-0.62, 0.024, 0.24);
    LAYOUT.plateCenter.set(0.62, 0.030, 0.04);
    LAYOUT.saltCenter.set(0.45, 0.02, 0.37);
    LAYOUT.daikonCenter.set(0.73, 0.02, 0.36);
    LAYOUT.pitcherCenter.set(0.74, 0.02, -0.29);
    LAYOUT.cupCenter.set(0.46, 0.02, -0.29);
    LAYOUT.bulbPos.set(0.30, 0.94, -0.66);
    LAYOUT.mamaPos.set(-0.56, 0.0, -0.64);
  }
}

export function createKitchen(scene, textures) {
  const kitchenGroup = new THREE.Group();
  scene.add(kitchenGroup);

  // 1. Aged dark hinoki / walnut wood counter (oiled satin wood grain!)
  const counterMat = new THREE.MeshStandardMaterial({
    map: textures.woodColor,
    bumpMap: textures.woodBump,
    bumpScale: 0.011,
    roughness: 0.36,
    metalness: 0.06,
  });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.16, 2.8), counterMat);
  counter.position.set(0, -0.08, 0.25);
  counter.receiveShadow = true;
  kitchenGroup.add(counter);

  // 2. Dark handmade glazed ceramic backsplash wall (catching warm bokeh glints)
  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.tileColor,
    bumpMap: textures.tileBump,
    bumpScale: 0.012,
    roughnessMap: textures.tileRough,
    roughness: 0.28,
    metalness: 0.08,
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.4), wallMat);
  backWall.position.set(0, 1.45, -1.65);
  backWall.receiveShadow = true;
  kitchenGroup.add(backWall);

  // Wooden night kitchen spice shelf with dark amber glass bottles (creamy background bokeh!)
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.045, 0.24), counterMat);
  shelf.position.set(0.25, 1.12, -1.52);
  kitchenGroup.add(shelf);

  const jarMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a1c,
    roughness: 0.34,
    metalness: 0.08,
    transparent: true,
    opacity: 0.86,
  });
  const bgProps = [
    { x: -0.92, r: 0.055, h: 0.22, col: 0x2a1d14 },
    { x: -0.76, r: 0.045, h: 0.16, col: 0x453220 },
    { x: 0.72, r: 0.052, h: 0.24, col: 0x2e2117 },
    { x: 0.89, r: 0.062, h: 0.18, col: 0x3b3834 },
    { x: 1.07, r: 0.048, h: 0.21, col: 0x4d3420 },
  ];
  bgProps.forEach((p) => {
    const m = jarMat.clone();
    m.color.setHex(p.col);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.78, p.r, p.h, 16), m);
    bottle.position.set(p.x, 1.14 + p.h * 0.5, -1.5);
    kitchenGroup.add(bottle);
  });

  // Cool night window on back-left wall
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x1b1512, roughness: 0.7 });
  const nightGlassMat = new THREE.MeshBasicMaterial({ color: 0x0b1628 });
  const winGroup = new THREE.Group();
  winGroup.position.set(-1.45, 1.22, -1.62);
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.15), nightGlassMat);
  winGroup.add(winGlass);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.05, 0.04), windowFrameMat);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.22, 0.04), windowFrameMat);
  barH.position.z = 0.02;
  barV.position.z = 0.02;
  winGroup.add(barH, barV);
  kitchenGroup.add(winGroup);

  // 3. Signature Bare Tungsten Edison Bulb hanging on braided cloth cord (夜の裸電球)
  const bulbGroup = new THREE.Group();
  bulbGroup.position.copy(LAYOUT.bulbPos);
  kitchenGroup.add(bulbGroup);

  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 })
  );
  cord.position.y = 0.80;
  bulbGroup.add(cord);

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0x7c5a30,
    roughness: 0.34,
    metalness: 0.85,
  });
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.085, 16), brassMat);
  socket.position.y = 0.08;
  bulbGroup.add(socket);

  const bulbPts = [
    new THREE.Vector2(0.0, -0.095),
    new THREE.Vector2(0.032, -0.090),
    new THREE.Vector2(0.052, -0.062),
    new THREE.Vector2(0.056, -0.022),
    new THREE.Vector2(0.042, 0.020),
    new THREE.Vector2(0.026, 0.048),
  ];
  const bulbGlass = new THREE.Mesh(
    new THREE.LatheGeometry(bulbPts, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0xffd292,
      emissive: 0xff8e2c,
      emissiveIntensity: 1.5,
      roughness: 0.06,
      metalness: 0.0,
      transparent: true,
      opacity: 0.62,
      clearcoat: 1.0,
    })
  );
  bulbGroup.add(bulbGlass);

  const filMat = new THREE.MeshBasicMaterial({ color: 0xfff8df });
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.068, 6), filMat);
    rod.position.set(Math.cos(a) * 0.012, -0.028, Math.sin(a) * 0.012);
    bulbGroup.add(rod);
  }
  const filCore = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  filCore.position.y = -0.032;
  bulbGroup.add(filCore);

  const bulbHaloMat = new THREE.SpriteMaterial({
    map: textures.softGlow,
    color: 0xffa846,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const bulbHalo = new THREE.Sprite(bulbHaloMat);
  bulbHalo.scale.set(0.68, 0.68, 1);
  bulbHalo.position.y = -0.03;
  bulbGroup.add(bulbHalo);

  const bulbOuterHaze = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.softGlow,
      color: 0xff8428,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  bulbOuterHaze.scale.set(1.85, 1.85, 1);
  bulbOuterHaze.position.y = -0.06;
  bulbGroup.add(bulbOuterHaze);

  // 4. Authentic Japanese Gas Stove (ガスコンロ): Enamel plate, recessed drip pan, 6-arm cast-iron Gotoku trivet, slotted burner crown & vivid dynamic Blue Flames!
  const burnerGroup = new THREE.Group();
  burnerGroup.position.set(LAYOUT.potCenter.x, 0.0, LAYOUT.potCenter.z);
  kitchenGroup.add(burnerGroup);

  const enamelMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1f,
    roughness: 0.34,
    metalness: 0.52,
  });
  const dripPanMat = new THREE.MeshStandardMaterial({
    color: 0x5c6066,
    roughness: 0.3,
    metalness: 0.82,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x201f20,
    roughness: 0.72,
    metalness: 0.65,
  });

  // Rounded-bevel dark enamel stove deck
  const stoveDeck = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.028, 0.78), enamelMat);
  stoveDeck.position.set(0, 0.014, 0.02);
  stoveDeck.receiveShadow = true;
  stoveDeck.castShadow = true;
  burnerGroup.add(stoveDeck);

  // Recessed circular brushed stainless drip pan (汁受け皿)
  const dripPts = [
    new THREE.Vector2(0.0, 0.024),
    new THREE.Vector2(0.14, 0.024),
    new THREE.Vector2(0.29, 0.026),
    new THREE.Vector2(0.34, 0.036),
    new THREE.Vector2(0.36, 0.032),
  ];
  const dripPan = new THREE.Mesh(new THREE.LatheGeometry(dripPts, 40), dripPanMat);
  dripPan.receiveShadow = true;
  burnerGroup.add(dripPan);

  // Cast-iron Gotoku outer support ring + 6 sculpted curved trivet arms cradling the hammered pot!
  const gotokuRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.011, 10, 40), ironMat);
  gotokuRing.rotation.x = Math.PI / 2;
  gotokuRing.position.y = 0.044;
  gotokuRing.castShadow = true;
  burnerGroup.add(gotokuRing);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.25;
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(ang) * 0.33, 0.044, Math.sin(ang) * 0.33),
      new THREE.Vector3(Math.cos(ang) * 0.30, 0.072, Math.sin(ang) * 0.30),
      new THREE.Vector3(Math.cos(ang) * 0.22, 0.074, Math.sin(ang) * 0.22),
      new THREE.Vector3(Math.cos(ang) * 0.19, 0.056, Math.sin(ang) * 0.19),
    ]);
    const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 10, 0.0095, 8, false), ironMat);
    arm.castShadow = true;
    burnerGroup.add(arm);
  }

  // Central slotted gas burner crown
  const burnerCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.20, 0.032, 28), brassMat);
  burnerCrown.position.y = 0.038;
  burnerGroup.add(burnerCrown);

  // Vivid Blue-Core + Flickering Orange-Tip Gas Flame Ring visibly licking around the bottom curve of the pot!
  // Scales dramatically with heat (Low / Med / High)!
  const flameMeshes = [];
  const blueFlameMat = new THREE.MeshBasicMaterial({
    color: 0x3da5ff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const cyanCoreMat = new THREE.MeshBasicMaterial({
    color: 0x8be4ff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const orangeTipMat = new THREE.MeshBasicMaterial({
    color: 0xff8c24,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const flameGroup = new THREE.Group();
    // Positioned cleanly around outer lower curve of pot (r = 0.225..0.28) so flames NEVER poke inside the oil!
    flameGroup.position.set(Math.cos(ang) * 0.225, 0.044, Math.sin(ang) * 0.225);
    flameGroup.rotation.y = -ang;

    const outerBlue = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.068, 7), blueFlameMat);
    outerBlue.rotation.z = -Math.PI * 0.34;
    outerBlue.position.set(0.026, 0.012, 0);
    flameGroup.add(outerBlue);

    const innerCyan = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.042, 6), cyanCoreMat);
    innerCyan.rotation.z = -Math.PI * 0.34;
    innerCyan.position.set(0.018, 0.008, 0);
    flameGroup.add(innerCyan);

    if (i % 3 === 0) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.036, 6), orangeTipMat);
      tip.rotation.z = -Math.PI * 0.24;
      tip.position.set(0.042, 0.024, 0);
      flameGroup.add(tip);
    }

    burnerGroup.add(flameGroup);
    flameMeshes.push(flameGroup);
  }

  // Subtle blue flame reflection glow right on the stainless drip pan!
  const blueFlameGlow = new THREE.PointLight(0x2e88ff, 0.9, 0.72, 2.0);
  blueFlameGlow.position.set(0, 0.065, 0.16);
  burnerGroup.add(blueFlameGlow);

  // Interactive Chunky Brass Gas Knob (scaled up 1.24x for effortless 5yo touch on iPhone & iPad!)
  const knobGroup = new THREE.Group();
  knobGroup.position.copy(LAYOUT.knobCenter);
  knobGroup.scale.setScalar(1.24);
  kitchenGroup.add(knobGroup);

  const knobBase = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.070, 0.024, 24), ironMat);
  knobGroup.add(knobBase);

  const knobDial = new THREE.Group();
  knobDial.position.y = 0.024;
  const knobBody = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.034, 24), brassMat);
  const knobBar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.098), brassMat);
  knobBar.position.y = 0.011;
  const knobIndicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff6b2b })
  );
  knobIndicator.position.set(0, 0.032, -0.036);
  knobDial.add(knobBody, knobBar, knobIndicator);
  knobGroup.add(knobDial);

  // 5. Hero Hammered Copper-Brass / Iron Tempura Pot (揚げ鍋) seated cleanly on the Gotoku trivet!
  const potGroup = new THREE.Group();
  potGroup.position.copy(LAYOUT.potCenter);
  kitchenGroup.add(potGroup);

  const potPts = [
    new THREE.Vector2(0.0, 0.058),
    new THREE.Vector2(0.22, 0.058),
    new THREE.Vector2(0.285, 0.095),
    new THREE.Vector2(0.322, 0.185),
    new THREE.Vector2(0.338, 0.27),
    new THREE.Vector2(0.358, 0.282),
    new THREE.Vector2(0.345, 0.292),
    new THREE.Vector2(0.318, 0.275),
    new THREE.Vector2(0.305, 0.185),
    new THREE.Vector2(0.272, 0.102),
    new THREE.Vector2(0.21, 0.072),
    new THREE.Vector2(0.0, 0.072),
  ];
  const potGeo = new THREE.LatheGeometry(potPts, 64);
  const potMat = new THREE.MeshStandardMaterial({
    map: textures.potColor,
    bumpMap: textures.potBump,
    bumpScale: 0.014,
    roughness: 0.34,
    metalness: 0.84,
  });
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  potGroup.add(potMesh);

  const potInnerFloor = new THREE.Mesh(
    new THREE.CircleGeometry(0.265, 36),
    new THREE.MeshStandardMaterial({ color: 0x160a02, roughness: 0.52, metalness: 0.45 })
  );
  potInnerFloor.rotation.x = -Math.PI / 2;
  potInnerFloor.position.y = 0.074;
  potGroup.add(potInnerFloor);

  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.056, 0.011, 10, 20, Math.PI),
      brassMat
    );
    handle.position.set(side * 0.342, 0.245, 0);
    handle.rotation.z = side * -Math.PI * 0.45;
    handle.rotation.y = Math.PI * 0.5;
    handle.castShadow = true;
    potGroup.add(handle);
  }

  // Half-Moon Wire Oil-Draining Rack (油切り網) clipped to back-right rim of pot
  const rackGroup = new THREE.Group();
  rackGroup.position.set(0, LAYOUT.rackY, 0);
  potGroup.add(rackGroup);

  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xd0ccc4,
    roughness: 0.25,
    metalness: 0.92,
  });
  const rackStart = -2.12;
  const rackEnd = -0.15;
  const rackOuterPts = [];
  for (let i = 0; i <= 20; i++) {
    const a = THREE.MathUtils.lerp(rackStart, rackEnd, i / 20);
    rackOuterPts.push(new THREE.Vector3(Math.cos(a) * 0.332, 0, Math.sin(a) * 0.332));
  }
  const rackCurve = new THREE.CatmullRomCurve3(rackOuterPts);
  const rackRim = new THREE.Mesh(new THREE.TubeGeometry(rackCurve, 24, 0.0058, 8, false), wireMat);
  rackGroup.add(rackRim);

  const pA = rackOuterPts[0];
  const pB = rackOuterPts[rackOuterPts.length - 1];
  const chordMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(pA, pB), 8, 0.0058, 8, false), wireMat);
  rackGroup.add(chordMesh);

  const midDir = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
  const chordDir = new THREE.Vector3().subVectors(pB, pA).normalize();
  const perpDir = new THREE.Vector3(-chordDir.z, 0, chordDir.x);
  if (perpDir.dot(midDir) < 0) perpDir.negate();

  for (let i = 1; i <= 8; i++) {
    const frac = i / 9;
    const base = new THREE.Vector3().lerpVectors(pA, pB, frac);
    const bDotP = base.dot(perpDir);
    const disc = bDotP * bDotP - (base.lengthSq() - 0.332 * 0.332);
    if (disc > 0) {
      const dist = -bDotP + Math.sqrt(disc);
      if (dist > 0.02) {
        const end = base.clone().addScaledVector(perpDir, dist);
        rackGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(base, end), 2, 0.003, 6, false), wireMat));
      }
    }
  }
  for (let j = 1; j <= 3; j++) {
    const d = j * 0.052;
    const cPts = [];
    for (let k = 0; k <= 12; k++) {
      const pt = new THREE.Vector3().lerpVectors(pA, pB, k / 12).addScaledVector(perpDir, d);
      if (pt.length() <= 0.328) cPts.push(pt);
    }
    if (cPts.length >= 2) {
      rackGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(cPts[0], cPts[cPts.length - 1]), 2, 0.0028, 6, false), wireMat));
    }
  }

  // 6. Cold Batter Bowl (衣のボウル) with Creamy Batter + Organically Melted Irregular Ice Chunks (NO cube blocks!)
  const batterGroup = new THREE.Group();
  batterGroup.position.copy(LAYOUT.batterCenter);
  kitchenGroup.add(batterGroup);

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xcbd0d6,
    roughness: 0.24,
    metalness: 0.88,
  });
  const bowlPts = [
    new THREE.Vector2(0.0, 0.005),
    new THREE.Vector2(0.11, 0.006),
    new THREE.Vector2(0.165, 0.055),
    new THREE.Vector2(0.185, 0.14),
    new THREE.Vector2(0.194, 0.148),
    new THREE.Vector2(0.18, 0.15),
    new THREE.Vector2(0.172, 0.135),
    new THREE.Vector2(0.152, 0.055),
    new THREE.Vector2(0.10, 0.016),
    new THREE.Vector2(0.0, 0.016),
  ];
  const batterBowlMesh = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 40), steelMat);
  batterBowlMesh.castShadow = true;
  batterBowlMesh.receiveShadow = true;
  batterGroup.add(batterBowlMesh);

  const batterUniforms = {
    uTime: { value: 0 },
    uRippleTime: { value: -99 },
    uRippleStrength: { value: 0 },
  };
  const batterSurfaceGeo = new THREE.CircleGeometry(0.168, 36);
  batterSurfaceGeo.rotateX(-Math.PI / 2);
  const batterSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0xf6ebd0,
    roughness: 0.2,
    metalness: 0.02,
    bumpMap: textures.batterBump,
    bumpScale: 0.003,
  });
  batterSurfaceMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = batterUniforms.uTime;
    shader.uniforms.uRippleTime = batterUniforms.uRippleTime;
    shader.uniforms.uRippleStrength = batterUniforms.uRippleStrength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `
        #include <common>
        uniform float uTime;
        uniform float uRippleTime;
        uniform float uRippleStrength;
      `)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float age = uTime - uRippleTime;
        float dist = length(transformed.xz);
        float w = sin(dist * 58.0 - age * 14.0) * exp(-max(0.0, age) * 2.2) * uRippleStrength;
        transformed.y += w * smoothstep(0.168, 0.04, dist);
      `);
  };
  const batterSurface = new THREE.Mesh(batterSurfaceGeo, batterSurfaceMat);
  batterSurface.position.y = LAYOUT.batterY;
  batterSurface.receiveShadow = true;
  batterGroup.add(batterSurface);

  // 3 organically melted, irregularly facetted translucent ice chunks floating in cold batter!
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9eefc,
    roughness: 0.07,
    metalness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.54,
  });
  const iceCubes = [];
  const iceSpecs = [
    { x: -0.058, z: -0.042, rx: 0.25, ry: 0.8, s: 1.05 },
    { x: 0.062, z: 0.046, rx: 0.42, ry: 2.1, s: 0.88 },
    { x: 0.028, z: -0.068, rx: 0.18, ry: 1.4, s: 0.72 },
  ];
  iceSpecs.forEach((sp, idx) => {
    const ig = new THREE.IcosahedronGeometry(0.026 * sp.s, 1);
    const ip = ig.attributes.position;
    for (let i = 0; i < ip.count; i++) {
      const vx = ip.getX(i);
      const vy = ip.getY(i);
      const vz = ip.getZ(i);
      const melt = 0.82 + 0.28 * Math.sin(vx * 90 + idx * 3.1) * Math.cos(vz * 85 - idx * 2.2);
      ip.setXYZ(i, vx * melt * 1.18, vy * melt * 0.62, vz * melt * 0.96);
    }
    ig.computeVertexNormals();
    const ice = new THREE.Mesh(ig, iceMat);
    ice.position.set(sp.x, LAYOUT.batterY - 0.002, sp.z);
    ice.rotation.set(sp.rx, sp.ry, 0.12);
    batterGroup.add(ice);
    iceCubes.push(ice);
  });

  // 7. Woven Bamboo Prep Tray (竹ざる) holding raw ingredients
  const trayGroup = new THREE.Group();
  trayGroup.position.copy(LAYOUT.trayCenter);
  kitchenGroup.add(trayGroup);

  const bambooMat = new THREE.MeshStandardMaterial({
    map: textures.bambooColor,
    bumpMap: textures.bambooBump,
    bumpScale: 0.009,
    roughness: 0.72,
    metalness: 0.02,
  });
  const trayBase = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.024, 36), bambooMat);
  trayBase.scale.set(1.10, 1.0, 0.84);
  trayBase.receiveShadow = true;
  trayBase.castShadow = true;
  trayGroup.add(trayBase);

  const trayRim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.014, 10, 36), bambooMat);
  trayRim.rotation.x = Math.PI / 2;
  trayRim.scale.set(1.10, 0.84, 1.0);
  trayRim.position.y = 0.014;
  trayRim.castShadow = true;
  trayGroup.add(trayRim);

  // 8. Handmade Dark Ceramic Tempura Plate + Dynamic Oil-Absorbing Washi Paper (天紙)
  const plateGroup = new THREE.Group();
  plateGroup.position.copy(LAYOUT.plateCenter);
  kitchenGroup.add(plateGroup);

  const ceramicMat = new THREE.MeshStandardMaterial({
    map: textures.ceramicColor,
    bumpMap: textures.ceramicBump,
    bumpScale: 0.007,
    roughness: 0.36,
    metalness: 0.08,
  });
  const platePts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.17, 0.0),
    new THREE.Vector2(0.24, 0.018),
    new THREE.Vector2(0.275, 0.044),
    new THREE.Vector2(0.268, 0.049),
    new THREE.Vector2(0.225, 0.026),
    new THREE.Vector2(0.16, 0.014),
    new THREE.Vector2(0.0, 0.014),
  ];
  const plateMesh = new THREE.Mesh(new THREE.LatheGeometry(platePts, 48), ceramicMat);
  plateMesh.castShadow = true;
  plateMesh.receiveShadow = true;
  plateGroup.add(plateMesh);

  const washiCtrl = createWashiPaperTexture();
  const washiGeo = new THREE.PlaneGeometry(0.31, 0.31, 12, 12);
  washiGeo.rotateX(-Math.PI / 2);
  const wp = washiGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i);
    const z = wp.getZ(i);
    const edgeLift = Math.max(0, Math.hypot(x, z) - 0.135) * 0.10;
    const crinkle = Math.sin(x * 32) * Math.cos(z * 28) * 0.0022;
    wp.setY(i, edgeLift + crinkle);
  }
  washiGeo.computeVertexNormals();
  const washiMat = new THREE.MeshStandardMaterial({
    map: washiCtrl.texture,
    roughness: 0.86,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const washiMesh = new THREE.Mesh(washiGeo, washiMat);
  washiMesh.position.y = 0.017;
  washiMesh.rotation.y = Math.PI * 0.22;
  washiMesh.receiveShadow = true;
  plateGroup.add(washiMesh);

  // 9. Sparkling Flaky Sea Salt Dish (scaled 1.22x for big clear touch target!)
  const saltGroup = new THREE.Group();
  saltGroup.position.copy(LAYOUT.saltCenter);
  saltGroup.scale.setScalar(1.22);
  kitchenGroup.add(saltGroup);

  const smallDishPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.056, 0.0),
    new THREE.Vector2(0.088, 0.028),
    new THREE.Vector2(0.082, 0.032),
    new THREE.Vector2(0.052, 0.01),
    new THREE.Vector2(0.0, 0.01),
  ];
  const smallDishGeo = new THREE.LatheGeometry(smallDishPts, 28);
  const saltDish = new THREE.Mesh(smallDishGeo, ceramicMat);
  saltDish.castShadow = true;
  saltDish.receiveShadow = true;
  saltGroup.add(saltDish);

  // Coarse flaky crystalline sea salt pile
  const saltMoundGeo = new THREE.ConeGeometry(0.056, 0.036, 20, 5);
  const sp = saltMoundGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const vx = sp.getX(i);
    const vy = sp.getY(i);
    const vz = sp.getZ(i);
    const jitter = 0.84 + 0.30 * Math.abs(Math.sin(vx * 140 + vz * 165 + vy * 90));
    sp.setXYZ(i, vx * jitter, vy, vz * jitter);
  }
  saltMoundGeo.computeVertexNormals();
  const saltMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbfaf6,
    roughness: 0.26,
    metalness: 0.05,
    clearcoat: 0.85,
    bumpMap: textures.batterBump,
    bumpScale: 0.011,
  });
  const saltMound = new THREE.Mesh(saltMoundGeo, saltMat);
  saltMound.position.y = 0.026;
  saltGroup.add(saltMound);

  // 10. Coarse Fibrous Snowy Grated Daikon Radish Dish (NO whipped cream swirl!)
  const daikonGroup = new THREE.Group();
  daikonGroup.position.copy(LAYOUT.daikonCenter);
  daikonGroup.scale.setScalar(1.22);
  kitchenGroup.add(daikonGroup);

  const daikonDish = new THREE.Mesh(smallDishGeo, ceramicMat);
  daikonDish.castShadow = true;
  daikonDish.receiveShadow = true;
  daikonGroup.add(daikonDish);

  // Subtle watery daikon juice sheen at base of dish
  const daikonJuice = new THREE.Mesh(
    new THREE.CircleGeometry(0.062, 20),
    new THREE.MeshPhysicalMaterial({ color: 0xdfe4dd, roughness: 0.08, clearcoat: 1.0, transparent: true, opacity: 0.55 })
  );
  daikonJuice.rotation.x = -Math.PI / 2;
  daikonJuice.position.y = 0.012;
  daikonGroup.add(daikonJuice);

  // Fine moist granular snowy grated daikon mound (NO chunky origami triangles, NO smooth whipped cream!)
  const daikonMoundGeo = new THREE.SphereGeometry(0.046, 26, 20);
  const dp = daikonMoundGeo.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const vx = dp.getX(i);
    const vy = dp.getY(i);
    const vz = dp.getZ(i);
    const g1 = Math.sin(vx * 320 + vy * 270) * Math.cos(vz * 310);
    const g2 = Math.sin(vx * 590 - vz * 530 + vy * 440) * 0.5;
    const gran = 1.0 + (g1 + g2) * 0.085;
    const ny = Math.max(-0.012, vy * 0.72);
    const coneTaper = ny > 0 ? Math.max(0.45, 1.0 - ny * 11.5) : 1.06;
    dp.setXYZ(i, vx * coneTaper * gran, ny * gran, vz * coneTaper * gran);
  }
  daikonMoundGeo.computeVertexNormals();
  const daikonMat = new THREE.MeshPhysicalMaterial({
    color: 0xf1f3ed,
    roughness: 0.62,
    sheen: 0.68,
    sheenColor: new THREE.Color(0xffffff),
    bumpMap: textures.batterBump,
    bumpScale: 0.026,
  });
  const daikonMound = new THREE.Mesh(daikonMoundGeo, daikonMat);
  daikonMound.position.y = 0.022;
  daikonGroup.add(daikonMound);

  // 11. Amber Tentsuyu Pitcher (片口) + Dipping Cup (猪口) — scaled 1.18x for clear mobile touch!
  const pitcherGroup = new THREE.Group();
  pitcherGroup.position.copy(LAYOUT.pitcherCenter);
  pitcherGroup.scale.setScalar(1.18);
  kitchenGroup.add(pitcherGroup);

  const pitcherMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c25,
    bumpMap: textures.ceramicBump,
    bumpScale: 0.008,
    roughness: 0.34,
    metalness: 0.1,
  });
  const pitcherPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.062, 0.0),
    new THREE.Vector2(0.088, 0.055),
    new THREE.Vector2(0.082, 0.115),
    new THREE.Vector2(0.068, 0.142),
    new THREE.Vector2(0.062, 0.142),
    new THREE.Vector2(0.072, 0.11),
    new THREE.Vector2(0.074, 0.05),
    new THREE.Vector2(0.0, 0.015),
  ];
  const pitcherBody = new THREE.Mesh(new THREE.LatheGeometry(pitcherPts, 32), pitcherMat);
  pitcherBody.castShadow = true;
  pitcherBody.receiveShadow = true;
  pitcherGroup.add(pitcherBody);

  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.052, 10, 1, true, 0, Math.PI), pitcherMat);
  spout.position.set(-0.066, 0.132, 0);
  spout.rotation.z = Math.PI * 0.42;
  spout.rotation.y = Math.PI * 0.5;
  pitcherGroup.add(spout);

  const tentsuyuMat = new THREE.MeshPhysicalMaterial({
    color: 0x2d1205,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const pitcherLiquid = new THREE.Mesh(new THREE.CircleGeometry(0.066, 20), tentsuyuMat);
  pitcherLiquid.rotation.x = -Math.PI / 2;
  pitcherLiquid.position.y = 0.115;
  pitcherGroup.add(pitcherLiquid);

  const cupGroup = new THREE.Group();
  cupGroup.position.copy(LAYOUT.cupCenter);
  cupGroup.scale.setScalar(1.18);
  kitchenGroup.add(cupGroup);

  const cupPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.052, 0.0),
    new THREE.Vector2(0.078, 0.042),
    new THREE.Vector2(0.092, 0.088),
    new THREE.Vector2(0.086, 0.092),
    new THREE.Vector2(0.07, 0.042),
    new THREE.Vector2(0.045, 0.012),
    new THREE.Vector2(0.0, 0.012),
  ];
  const cupMesh = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 32), ceramicMat);
  cupMesh.castShadow = true;
  cupMesh.receiveShadow = true;
  cupGroup.add(cupMesh);

  const cupLiquid = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), tentsuyuMat);
  cupLiquid.rotation.x = -Math.PI / 2;
  cupLiquid.position.y = 0.018;
  cupLiquid.scale.setScalar(0.55);
  cupGroup.add(cupLiquid);

  const overflowPuddle = new THREE.Mesh(new THREE.CircleGeometry(0.14, 24), tentsuyuMat);
  overflowPuddle.rotation.x = -Math.PI / 2;
  overflowPuddle.position.y = 0.002;
  overflowPuddle.scale.setScalar(0.001);
  cupGroup.add(overflowPuddle);

  // Dynamic counter batter-splatter droplets
  const maxSplatters = 32;
  const splatterGeo = new THREE.CircleGeometry(0.018, 12);
  splatterGeo.rotateX(-Math.PI / 2);
  const splatterMat = new THREE.MeshStandardMaterial({
    color: 0xf3e7c8,
    roughness: 0.25,
    transparent: true,
    opacity: 0.9,
  });
  const splatterMesh = new THREE.InstancedMesh(splatterGeo, splatterMat, maxSplatters);
  const dummy = new THREE.Object3D();
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  for (let i = 0; i < maxSplatters; i++) splatterMesh.setMatrixAt(i, dummy.matrix);
  splatterMesh.instanceMatrix.needsUpdate = true;
  kitchenGroup.add(splatterMesh);
  let splatterCount = 0;

  function syncPositionsToLayout() {
    potGroup.position.copy(LAYOUT.potCenter);
    burnerGroup.position.set(LAYOUT.potCenter.x, 0.0, LAYOUT.potCenter.z);
    knobGroup.position.copy(LAYOUT.knobCenter);
    batterGroup.position.copy(LAYOUT.batterCenter);
    trayGroup.position.copy(LAYOUT.trayCenter);
    plateGroup.position.copy(LAYOUT.plateCenter);
    saltGroup.position.copy(LAYOUT.saltCenter);
    daikonGroup.position.copy(LAYOUT.daikonCenter);
    pitcherGroup.position.copy(LAYOUT.pitcherCenter);
    cupGroup.position.copy(LAYOUT.cupCenter);
    bulbGroup.position.copy(LAYOUT.bulbPos);

    // Compact scaling in portrait so all props fit side-by-side with zero clipping!
    const compact = LAYOUT.isPortrait ? 0.86 : 1.0;
    batterGroup.scale.setScalar(compact);
    trayGroup.scale.setScalar(LAYOUT.isPortrait ? 0.90 : 1.0);
    plateGroup.scale.setScalar(LAYOUT.isPortrait ? 0.88 : 1.0);
    saltGroup.scale.setScalar(LAYOUT.isPortrait ? 1.08 : 1.22);
    daikonGroup.scale.setScalar(LAYOUT.isPortrait ? 1.08 : 1.22);
    pitcherGroup.scale.setScalar(LAYOUT.isPortrait ? 1.02 : 1.18);
    cupGroup.scale.setScalar(LAYOUT.isPortrait ? 1.02 : 1.18);
    knobGroup.scale.setScalar(LAYOUT.isPortrait ? 1.16 : 1.24);
  }

  return {
    group: kitchenGroup,
    bulbGroup,
    bulbHalo,
    flameMeshes,
    knobGroup,
    knobDial,
    potGroup,
    batterGroup,
    batterUniforms,
    iceCubes,
    trayGroup,
    plateGroup,
    washiCtrl,
    saltGroup,
    daikonGroup,
    pitcherGroup,
    cupGroup,
    cupLiquid,
    overflowPuddle,
    syncPositionsToLayout,
    triggerBatterRipple(strength = 0.014) {
      batterUniforms.uRippleTime.value = batterUniforms.uTime.value;
      batterUniforms.uRippleStrength.value = strength;
    },
    addCounterSplatter(wx, wz) {
      if (splatterCount >= maxSplatters) return;
      dummy.position.set(wx, 0.003, wz);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const s = 0.55 + Math.random() * 1.1;
      dummy.scale.set(s, 1, s * (0.7 + Math.random() * 0.6));
      dummy.updateMatrix();
      splatterMesh.setMatrixAt(splatterCount, dummy.matrix);
      splatterMesh.instanceMatrix.needsUpdate = true;
      splatterCount++;
    },
    getSplatterCount() {
      return splatterCount;
    },
    setCupFill(level) {
      const clamped = Math.min(1.0, Math.max(0, level));
      cupLiquid.position.y = 0.016 + clamped * 0.068;
      cupLiquid.scale.setScalar(0.55 + clamped * 0.48);
      if (level > 1.0) {
        const over = Math.min(1.0, (level - 1.0) * 2.4);
        overflowPuddle.scale.setScalar(0.6 + over * 0.72);
      } else {
        overflowPuddle.scale.setScalar(0.001);
      }
    },
    update(dt, elapsed, heat) {
      batterUniforms.uTime.value = elapsed;

      const flicker = 1.0 + Math.sin(elapsed * 7.3) * 0.015 + Math.sin(elapsed * 19.1) * 0.008;
      bulbHalo.scale.setScalar(0.68 * flicker);
      bulbGroup.rotation.z = Math.sin(elapsed * 0.65) * 0.012;

      iceCubes.forEach((ice, idx) => {
        ice.position.y = LAYOUT.batterY - 0.002 + Math.sin(elapsed * 1.9 + idx * 2.2) * 0.0022;
        ice.rotation.y += dt * (idx % 2 === 0 ? 0.12 : -0.1);
      });

      // Dramatic, clearly readable blue gas flame scaling across Low (0.42) -> Med (0.74) -> High (1.0)!
      const flamePower = Math.pow(heat, 1.35); // 0.31 -> 0.67 -> 1.0
      blueFlameGlow.intensity = 0.35 + flamePower * 1.45 + Math.sin(elapsed * 22) * 0.08;
      flameMeshes.forEach((fg, idx) => {
        const j = 0.88 + Math.sin(elapsed * 28 + idx * 1.9) * 0.16;
        const scX = (0.45 + flamePower * 1.15) * j;
        const scY = (0.42 + flamePower * 1.10) * j;
        fg.scale.set(scX, scY, 0.7 + flamePower * 0.5);
      });

      const targetRot = -(heat - 0.5) * 2.0;
      knobDial.rotation.y += (targetRot - knobDial.rotation.y) * Math.min(1, dt * 10);
    },
  };
}
