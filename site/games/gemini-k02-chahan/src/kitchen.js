import * as THREE from 'three';
import {
  createWokTextures,
  createSteelTextures,
  createTileTextures,
  createWoodTextures,
  createPlateTexture,
  createLinenTextures,
  createKnitFabricTextures,
  createSkinTextures,
  createMomFaceController,
  createHairTextures,
} from './textures.js';

export const WOK_POS = new THREE.Vector3(-0.04, 0.098, 0.02);
export const WOK_RADIUS = 0.42;
export const WOK_DEPTH = 0.16;

export function wokLocalSurfaceY(r) {
  const clamped = Math.min(r, WOK_RADIUS * 0.98);
  const t = clamped / WOK_RADIUS;
  return WOK_DEPTH * (0.18 * t * t + 0.82 * Math.pow(t, 2.35));
}

/**
 * Creates a BoxGeometry whose UVs are strictly scaled in world meters
 * so ceramic tiles are 100% square and aligned across walls of ANY height/width!
 */
function makeWorldUVBox(w, h, d, tileRepeatMeters = 0.62) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    if (nx > 0.5) {
      uv.setXY(i, z / tileRepeatMeters, y / tileRepeatMeters);
    } else if (ny > 0.5) {
      uv.setXY(i, x / tileRepeatMeters, z / tileRepeatMeters);
    } else {
      uv.setXY(i, x / tileRepeatMeters, y / tileRepeatMeters);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function createKitchen(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const wokTex = createWokTextures();
  const steelTex = createSteelTextures();
  const tileTex = createTileTextures();
  const darkWoodTex = createWoodTextures(true);
  const lightWoodTex = createWoodTextures(false);
  const plateTex = createPlateTexture();
  const linenTex = createLinenTextures('#b87458');
  const knitTex = createKnitFabricTextures('#dfd5c7', 'rgba(98, 84, 70, 0.16)');
  const skinTex = createSkinTextures();

  // ===========================================================================
  // 1. STAINLESS STEEL COUNTERTOP & REALISTIC BUILT-IN GAS RANGE DECK
  // ===========================================================================
  const counterMat = new THREE.MeshStandardMaterial({
    map: steelTex.map,
    roughnessMap: steelTex.roughnessMap,
    bumpMap: steelTex.bumpMap,
    bumpScale: 0.004,
    metalness: 0.74,
    roughness: 0.38,
  });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 2.8), counterMat);
  counter.position.set(0.06, -0.06, 0.24);
  counter.receiveShadow = true;
  group.add(counter);

  // Compact brushed gunmetal built-in gas stove deck
  const stoveGroup = new THREE.Group();
  group.add(stoveGroup);

  const stovePanelMat = new THREE.MeshPhysicalMaterial({
    color: 0x202226,
    roughness: 0.30,
    metalness: 0.56,
    clearcoat: 0.48,
    clearcoatRoughness: 0.22,
    bumpMap: steelTex.bumpMap,
    bumpScale: 0.002,
  });
  const stovePanel = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.022, 0.72), stovePanelMat);
  stovePanel.position.set(WOK_POS.x - 0.05, 0.011, WOK_POS.z + 0.02);
  stovePanel.receiveShadow = true;
  stovePanel.castShadow = true;
  stoveGroup.add(stovePanel);

  const stoveRimMat = new THREE.MeshStandardMaterial({ color: 0xbcc2c8, metalness: 0.88, roughness: 0.26 });
  const rimF = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.010, 0.014), stoveRimMat);
  rimF.position.set(WOK_POS.x - 0.05, 0.020, WOK_POS.z + 0.382);
  const rimB = rimF.clone(); rimB.position.z = WOK_POS.z - 0.342;
  const rimL = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.010, 0.736), stoveRimMat);
  rimL.position.set(WOK_POS.x - 0.472, 0.020, WOK_POS.z + 0.02);
  const rimR = rimL.clone(); rimR.position.x = WOK_POS.x + 0.372;
  stoveGroup.add(rimF, rimB, rimL, rimR);

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xd0d4da,
    metalness: 0.9,
    roughness: 0.22,
  });
  const dripPan = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.11, 0.015),
      new THREE.Vector2(0.21, 0.021),
      new THREE.Vector2(0.245, 0.032),
      new THREE.Vector2(0.252, 0.026),
    ], 40),
    trimMat
  );
  dripPan.position.set(WOK_POS.x, 0.0, WOK_POS.z);
  dripPan.receiveShadow = true;
  stoveGroup.add(dripPan);

  const wellMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.78, metalness: 0.32 });
  const burnerWell = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.18, 0.014, 32), wellMat);
  burnerWell.position.set(WOK_POS.x, 0.019, WOK_POS.z);
  stoveGroup.add(burnerWell);

  // Heavy cast-iron 6-prong gas trivet (五徳) — contoured strictly BELOW wok outer wall (ZERO penetration!)
  const castIronMat = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.84, metalness: 0.35 });
  const trivetGroup = new THREE.Group();
  trivetGroup.position.set(WOK_POS.x, 0.029, WOK_POS.z);
  const trivetBase = new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.013, 10, 40), castIronMat);
  trivetBase.rotation.x = Math.PI / 2;
  trivetBase.castShadow = true;
  trivetGroup.add(trivetBase);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    // Outer riser + horizontal-sloped cradle arm hugging under wok belly without poking through y=0.098!
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.030, 0.115), castIronMat);
    prong.position.set(Math.cos(a) * 0.182, 0.026, Math.sin(a) * 0.182);
    prong.rotation.y = -a + Math.PI / 2;
    prong.rotation.x = -0.18; // Slopes DOWN inward to match wok's curved underside!
    prong.castShadow = true;
    trivetGroup.add(prong);
  }
  stoveGroup.add(trivetGroup);

  const brassMat = new THREE.MeshStandardMaterial({ color: 0x8a7048, metalness: 0.78, roughness: 0.34 });
  const burnerCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.122, 0.024, 28), brassMat);
  burnerCrown.position.set(WOK_POS.x, 0.036, WOK_POS.z);
  stoveGroup.add(burnerCrown);

  // ===========================================================================
  // 2. ROARING BLUE-ORANGE GAS FLAMES
  // ===========================================================================
  const flameUniforms = { uTime: { value: 0 }, uHeat: { value: 0.45 } };
  const flameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: flameUniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uHeat;
      varying vec2 vUv;
      varying float vTip;
      void main() {
        vUv = uv;
        vTip = uv.y;
        vec3 p = position;
        float angle = atan(p.z, p.x);
        float flicker = sin(uTime * 28.0 + angle * 9.0) * 0.5 + sin(uTime * 43.0 - angle * 5.0) * 0.5;
        float spread = uHeat * (0.04 + 0.14 * pow(uv.y, 1.3));
        vec2 radial = normalize(p.xz + vec2(0.0001));
        p.xz += radial * (spread + flicker * 0.012 * uHeat * uv.y);
        p.y *= (0.18 + uHeat * 1.18) * (0.92 + 0.14 * flicker);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uHeat;
      varying vec2 vUv;
      varying float vTip;
      void main() {
        if (uHeat < 0.02) discard;
        float jets = pow(0.5 + 0.5 * sin(vUv.x * 6.283185 * 24.0), 1.7);
        float pulse = 0.85 + 0.15 * sin(uTime * 34.0 + vUv.x * 40.0);
        float alpha = smoothstep(0.0, 0.16, vTip) * smoothstep(1.0, 0.25, vTip) * (0.45 + 0.55 * jets);
        alpha *= smoothstep(0.0, 0.16, uHeat) * pulse;

        vec3 blueCore = vec3(0.16, 0.55, 2.0);
        vec3 violetMid = vec3(0.40, 0.42, 1.65);
        vec3 orangeTip = vec3(2.6, 1.0, 0.22);
        vec3 col = mix(blueCore, violetMid, smoothstep(0.1, 0.52, vTip));
        float orangeMask = smoothstep(0.42, 0.90, vTip) * smoothstep(0.28, 0.92, uHeat);
        col = mix(col, orangeTip, orangeMask);

        gl_FragColor = vec4(col * (0.75 + 0.9 * uHeat), alpha * 0.9);
      }
    `,
  });

  const flameOuterGeo = new THREE.CylinderGeometry(0.215, 0.12, 0.095, 44, 6, true);
  flameOuterGeo.translate(0, 0.047, 0);
  const flameOuter = new THREE.Mesh(flameOuterGeo, flameMat);
  flameOuter.position.set(WOK_POS.x, 0.042, WOK_POS.z);
  stoveGroup.add(flameOuter);

  const flameInnerGeo = new THREE.CylinderGeometry(0.115, 0.068, 0.06, 28, 4, true);
  flameInnerGeo.translate(0, 0.03, 0);
  const flameInner = new THREE.Mesh(flameInnerGeo, flameMat);
  flameInner.position.set(WOK_POS.x, 0.044, WOK_POS.z);
  stoveGroup.add(flameInner);

  const flameLight = new THREE.PointLight(0xff7d2b, 1.2, 1.8, 1.6);
  flameLight.position.set(WOK_POS.x, 0.098, WOK_POS.z + 0.06);
  stoveGroup.add(flameLight);

  // ===========================================================================
  // 3. REALISTIC BRUSHED-METAL GAS HEAT DIAL KNOB (NO PLASTIC COLORED BEADS!)
  // ===========================================================================
  const knobGroup = new THREE.Group();
  knobGroup.position.set(-0.40, 0.026, 0.30);
  group.add(knobGroup);

  // Brushed stainless escutcheon plate with finely machined metallic tick notches
  const knobCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.078, 0.012, 32), trimMat);
  knobCollar.receiveShadow = true;
  knobGroup.add(knobCollar);

  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x2a2d32, metalness: 0.78, roughness: 0.32 });
  const heatArcMat = new THREE.MeshStandardMaterial({
    color: 0xc95a2b,
    emissive: 0x8f2e08,
    emissiveIntensity: 0.45,
    metalness: 0.35,
    roughness: 0.35,
  });

  // Tapered brushed-metal heat-level graduation ticks (increasing length = higher fire, zero text!)
  for (let t = 0; t < 7; t++) {
    const frac = t / 6;
    const ang = 2.35 - frac * 3.6;
    const tickLen = 0.009 + frac * 0.011;
    const tickMat = t === 0 ? darkMetalMat : t >= 5 ? heatArcMat : darkMetalMat;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.0032, 0.003, tickLen), tickMat);
    const rad = 0.062;
    tick.position.set(Math.cos(ang) * rad, 0.007, -Math.sin(ang) * rad);
    tick.rotation.y = ang + Math.PI / 2;
    knobGroup.add(tick);
  }

  // Subtle recessed metallic heat indicator ring
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.0022, 8, 32, 2.8),
    heatArcMat
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.rotation.z = -0.8;
  glowRing.position.y = 0.007;
  knobGroup.add(glowRing);

  // Machined matte-gunmetal ergonomic stove knob dial
  const knobDial = new THREE.Group();
  knobDial.position.y = 0.016;
  knobGroup.add(knobDial);

  const gunmetalMat = new THREE.MeshStandardMaterial({ color: 0x1f2125, roughness: 0.28, metalness: 0.55 });
  const dialBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.028, 32), gunmetalMat);
  dialBody.castShadow = true;
  knobDial.add(dialBody);

  const dialBevel = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.003, 8, 28), trimMat);
  dialBevel.rotation.x = Math.PI / 2;
  dialBevel.position.y = 0.013;
  knobDial.add(dialBevel);

  const dialBar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.036, 0.088), gunmetalMat);
  dialBar.position.y = 0.010;
  dialBar.castShadow = true;
  knobDial.add(dialBar);

  // Slim machined orange-amber pilot slit on knob pointer
  const pointerMat = new THREE.MeshStandardMaterial({
    color: 0xe85820,
    emissive: 0xc23408,
    emissiveIntensity: 0.85,
    roughness: 0.22,
  });
  const dialPointer = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.008, 0.036), pointerMat);
  dialPointer.position.set(0, 0.029, -0.025);
  knobDial.add(dialPointer);

  const knobHit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.13, 14),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  knobHit.position.y = 0.04;
  knobHit.userData = { interactType: 'knob' };
  knobGroup.add(knobHit);

  // ===========================================================================
  // 4. HUGE SEASONED HAMMERED IRON WOK (中華鍋)
  // ===========================================================================
  const wokPivot = new THREE.Group();
  wokPivot.position.copy(WOK_POS);
  group.add(wokPivot);

  const wokPoints = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = t * WOK_RADIUS;
    wokPoints.push(new THREE.Vector2(r, wokLocalSurfaceY(r)));
  }
  wokPoints.push(new THREE.Vector2(WOK_RADIUS + 0.008, WOK_DEPTH + 0.004));
  wokPoints.push(new THREE.Vector2(WOK_RADIUS + 0.007, WOK_DEPTH - 0.007));
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = t * WOK_RADIUS;
    wokPoints.push(new THREE.Vector2(r, wokLocalSurfaceY(r) - 0.009));
  }

  const wokGeo = new THREE.LatheGeometry(wokPoints, 52);
  const wokMat = new THREE.MeshPhysicalMaterial({
    map: wokTex.map,
    bumpMap: wokTex.bumpMap,
    bumpScale: 0.005,
    roughnessMap: wokTex.roughnessMap,
    metalness: 0.80,
    roughness: 0.40,
    clearcoat: 0.38,
    clearcoatRoughness: 0.24,
    envMapIntensity: 1.45,
  });
  const wokMesh = new THREE.Mesh(wokGeo, wokMat);
  wokMesh.castShadow = true;
  wokMesh.receiveShadow = true;
  wokPivot.add(wokMesh);

  // Riveted iron socket & turned dark walnut wooden handle
  const handleGroup = new THREE.Group();
  handleGroup.position.set(-WOK_RADIUS + 0.01, WOK_DEPTH - 0.01, 0.03);
  handleGroup.rotation.y = 0.14;
  handleGroup.rotation.z = -0.32;
  wokPivot.add(handleGroup);

  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.026, 0.075, 12), castIronMat);
  socket.rotation.z = Math.PI / 2;
  socket.position.x = -0.028;
  socket.castShadow = true;
  handleGroup.add(socket);

  const woodHandleMat = new THREE.MeshStandardMaterial({
    map: darkWoodTex.map,
    bumpMap: darkWoodTex.bumpMap,
    bumpScale: 0.004,
    roughness: 0.52,
    metalness: 0.04,
  });
  const handleWood = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.017, 0.24, 14), woodHandleMat);
  handleWood.rotation.z = Math.PI / 2;
  handleWood.position.x = -0.17;
  handleWood.castShadow = true;
  handleGroup.add(handleWood);

  const endRing = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.0030, 8, 16), brassMat);
  endRing.position.x = -0.30;
  handleGroup.add(endRing);

  const earHandle = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.0075, 8, 18, Math.PI), castIronMat);
  earHandle.position.set(WOK_RADIUS + 0.002, WOK_DEPTH - 0.018, -0.02);
  earHandle.rotation.x = Math.PI / 2 - 0.35;
  earHandle.rotation.z = -Math.PI / 2;
  wokPivot.add(earHandle);

  const wokHit = new THREE.Mesh(
    new THREE.CylinderGeometry(WOK_RADIUS * 1.06, WOK_RADIUS * 0.86, 0.28, 20),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  wokHit.position.y = 0.11;
  wokHit.userData = { interactType: 'wok' };
  wokPivot.add(wokHit);

  // Snug hitbox around wooden handle so it NEVER steals clicks from the oil bottle!
  const handleHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.095, 0.095),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  handleHit.position.set(-0.18, 0.0, 0);
  handleHit.userData = { interactType: 'wokHandle' };
  handleGroup.add(handleHit);

  // ===========================================================================
  // 5. WORLD-SCALED SQUARE CERAMIC TILES + PHOTOREALISTIC SUNSET WINDOW
  // ===========================================================================
  const tileMat = new THREE.MeshStandardMaterial({
    map: tileTex.map,
    bumpMap: tileTex.bumpMap,
    bumpScale: 0.006,
    roughnessMap: tileTex.roughnessMap,
    roughness: 0.30,
    metalness: 0.05,
  });

  // Exact world-space UVs so tiles under the window are 100% identical square size to main backsplash!
  const backWallRight = new THREE.Mesh(makeWorldUVBox(2.9, 2.4, 0.12), tileMat);
  backWallRight.position.set(1.18, 1.0, -1.18);
  backWallRight.receiveShadow = true;
  group.add(backWallRight);

  const backWallSill = new THREE.Mesh(makeWorldUVBox(1.9, 0.56, 0.12), tileMat);
  backWallSill.position.set(-1.14, 0.14, -1.18);
  backWallSill.receiveShadow = true;
  group.add(backWallSill);

  const sideWall = new THREE.Mesh(makeWorldUVBox(0.12, 2.5, 2.8), tileMat);
  sideWall.position.set(-1.90, 1.0, 0.1);
  sideWall.receiveShadow = true;
  group.add(sideWall);

  // Late-Afternoon Photographic Western Sunset Kitchen Window (Soft bokeh neighborhood & layered golden clouds!)
  const windowGroup = new THREE.Group();
  windowGroup.position.set(-1.02, 0.98, -1.14);
  group.add(windowGroup);

  const sunsetSkyMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }
      void main() {
        // Photographic warm golden-hour sky with atmospheric perspective haze
        vec3 horizon = vec3(1.95, 1.05, 0.54);
        vec3 mid = vec3(1.38, 0.72, 0.44);
        vec3 upper = vec3(0.48, 0.44, 0.62);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.50, vUv.y));
        col = mix(col, upper, smoothstep(0.45, 1.0, vUv.y));

        // Layered realistic sunset cumulus clouds with lit golden underbellies
        float c1 = fbm(vUv * vec2(4.2, 8.5) + vec2(1.2, 0.4));
        float c2 = fbm(vUv * vec2(9.0, 16.0) + vec2(3.7, 1.8));
        float cloud = smoothstep(0.44, 0.74, c1 * 0.7 + c2 * 0.3) * smoothstep(0.22, 0.78, vUv.y);
        col = mix(col, vec3(2.35, 1.32, 0.68), cloud * 0.58);
        col = mix(col, vec3(0.75, 0.44, 0.42), smoothstep(0.62, 0.85, c1) * smoothstep(0.55, 0.92, vUv.y) * 0.35);

        // Low western sun blooming softly through atmospheric haze
        float d = length((vUv - vec2(0.38, 0.40)) * vec2(1.25, 1.0));
        col += vec3(3.1, 1.9, 0.92) * exp(-d * 3.8);
        col += vec3(4.2, 3.3, 2.0) * exp(-d * 13.0);

        // Soft out-of-focus bokeh distant Japanese residential silhouette (NO harsh hard-edged geometric brown box!)
        float farTrees = smoothstep(0.26, 0.16, vUv.y - 0.08 * fbm(vec2(vUv.x * 11.0, 2.0)));
        col = mix(col, vec3(0.56, 0.34, 0.28), farTrees * 0.52);

        float nearFoliage = smoothstep(0.16, 0.07, vUv.y - 0.06 * fbm(vec2(vUv.x * 18.0 + 4.0, 5.0)));
        col = mix(col, vec3(0.32, 0.20, 0.17), nearFoliage * 0.72);

        // Delicate blurred suburban utility wire hint
        float wireY = 0.48 - 0.08 * sin(vUv.x * 3.14159);
        float wire = smoothstep(0.008, 0.001, abs(vUv.y - wireY));
        col = mix(col, vec3(0.34, 0.22, 0.18), wire * 0.32);

        // Soft Japanese frosted glass sheen
        float frost = 0.97 + 0.03 * noise(vUv * 95.0);
        gl_FragColor = vec4(col * frost, 1.0);
      }
    `,
  });
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 1.18), sunsetSkyMat);
  skyPlane.position.z = -0.14;
  windowGroup.add(skyPlane);

  const sashMat = new THREE.MeshStandardMaterial({ color: 0x3b312b, metalness: 0.45, roughness: 0.42 });
  const sillMat = new THREE.MeshStandardMaterial({ map: darkWoodTex.map, roughness: 0.48 });
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.055, 0.12), sashMat);
  frameTop.position.y = 0.58;
  frameTop.castShadow = true;
  const frameBot = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.065, 0.20), sillMat);
  frameBot.position.set(0, -0.58, 0.05);
  frameBot.receiveShadow = true;
  frameBot.castShadow = true;
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.18, 0.12), sashMat);
  frameL.position.x = -0.77;
  frameL.castShadow = true;
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.18, 0.12), sashMat);
  frameR.position.x = 0.77;
  frameR.castShadow = true;
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.032, 1.16, 0.06), sashMat);
  mullionV.position.x = -0.08;
  mullionV.castShadow = true;
  const mullionH = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.026, 0.05), sashMat);
  mullionH.position.y = 0.06;
  mullionH.castShadow = true;
  windowGroup.add(frameTop, frameBot, frameL, frameR, mullionV, mullionH);

  // Realistic fluted terracotta windowsill herb pot with tapered botanical leaf blades (NOT sphere balls!)
  const herbGroup = new THREE.Group();
  herbGroup.position.set(-0.42, -0.545, 0.065);
  const potProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.034, 0.0),
    new THREE.Vector2(0.045, 0.066),
    new THREE.Vector2(0.050, 0.072),
    new THREE.Vector2(0.048, 0.084),
    new THREE.Vector2(0.040, 0.084),
  ];
  const potMesh = new THREE.Mesh(
    new THREE.LatheGeometry(potProfile, 18),
    new THREE.MeshStandardMaterial({ color: 0x9b543a, roughness: 0.82 })
  );
  potMesh.castShadow = true;
  herbGroup.add(potMesh);

  const soilMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.039, 14),
    new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.95 })
  );
  soilMesh.rotation.x = -Math.PI / 2;
  soilMesh.position.y = 0.074;
  herbGroup.add(soilMesh);

  // Tapered botanical herb leaves curving gently out of stems
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.011, 0.016, 0, 0.040);
  leafShape.quadraticCurveTo(-0.011, 0.016, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 5);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x355e28, roughness: 0.48, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.3;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    const tier = i % 3;
    leaf.position.set(Math.cos(a) * (0.008 + tier * 0.006), 0.074 + tier * 0.014, Math.sin(a) * (0.008 + tier * 0.006));
    leaf.rotation.set(0.45 + tier * 0.25, -a + Math.PI / 2, 0.15);
    leaf.scale.setScalar(0.85 + (i % 4) * 0.15);
    herbGroup.add(leaf);
  }
  windowGroup.add(herbGroup);

  // Volumetric diagonal western sunlight shafts streaming across the sizzling wok
  const sunbeamUniforms = { uTime: { value: 0 }, uSmokeBoost: { value: 0.25 } };
  const sunbeamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: sunbeamUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSmokeBoost;
      varying vec2 vUv;
      void main() {
        float across = smoothstep(0.0, 0.28, vUv.x) * smoothstep(1.0, 0.72, vUv.x);
        float along = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.14, vUv.y);
        float streaks = 0.68 + 0.32 * sin(vUv.x * 20.0 + sin(uTime * 0.35 + vUv.y * 4.0));
        float wisps = 0.80 + 0.20 * sin(vUv.y * 10.0 - uTime * 0.8 + vUv.x * 7.0);
        float a = across * along * streaks * wisps * (0.042 + uSmokeBoost * 0.075);
        vec3 col = vec3(1.0, 0.66, 0.30);
        gl_FragColor = vec4(col, a);
      }
    `,
  });

  const beamGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.92 + i * 0.22, 2.15), sunbeamMat);
    beam.position.set(-0.48 + i * 0.26, 0.62 - i * 0.08, -0.58 + i * 0.22);
    beam.rotation.set(0.28, 0.60, -0.58);
    beamGroup.add(beam);
  }
  group.add(beamGroup);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.3, 10), trimMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0.92, 0.76, -1.08);
  group.add(rail);

  // ===========================================================================
  // 6. WAITING CHINESE OCTAGONAL PORCELAIN PLATE + WALNUT TRAY + CURVED RENGE
  // ===========================================================================
  const plateStation = new THREE.Group();
  plateStation.position.set(0.70, 0.006, -0.10);
  group.add(plateStation);

  const trayMat = new THREE.MeshStandardMaterial({
    map: darkWoodTex.map,
    bumpMap: darkWoodTex.bumpMap,
    bumpScale: 0.003,
    roughness: 0.46,
  });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.016, 0.46), trayMat);
  tray.position.y = 0.008;
  tray.castShadow = true;
  tray.receiveShadow = true;
  plateStation.add(tray);

  const lipLong = new THREE.BoxGeometry(0.50, 0.011, 0.013);
  const lipShort = new THREE.BoxGeometry(0.013, 0.011, 0.46);
  const l1 = new THREE.Mesh(lipLong, trayMat); l1.position.set(0, 0.020, -0.224);
  const l2 = new THREE.Mesh(lipLong, trayMat); l2.position.set(0, 0.020, 0.224);
  const l3 = new THREE.Mesh(lipShort, trayMat); l3.position.set(-0.244, 0.020, 0);
  const l4 = new THREE.Mesh(lipShort, trayMat); l4.position.set(0.244, 0.020, 0);
  plateStation.add(l1, l2, l3, l4);

  const plateProfile = [
    new THREE.Vector2(0.0, 0.005),
    new THREE.Vector2(0.110, 0.005),
    new THREE.Vector2(0.136, 0.016),
    new THREE.Vector2(0.180, 0.031),
    new THREE.Vector2(0.188, 0.031),
    new THREE.Vector2(0.172, 0.013),
    new THREE.Vector2(0.112, 0.0),
    new THREE.Vector2(0.0, 0.0),
  ];
  const plateGeo = new THREE.LatheGeometry(plateProfile, 8);
  const pPos = plateGeo.attributes.position;
  const pUv = plateGeo.attributes.uv;
  for (let i = 0; i < pPos.count; i++) {
    pUv.setXY(i, pPos.getX(i) / 0.38 + 0.5, pPos.getZ(i) / 0.38 + 0.5);
  }
  pUv.needsUpdate = true;

  const plateMat = new THREE.MeshPhysicalMaterial({
    map: plateTex,
    roughness: 0.12,
    metalness: 0.02,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.15,
  });
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.position.set(-0.02, 0.017, 0.0);
  plateMesh.rotation.y = Math.PI / 8;
  plateMesh.castShadow = true;
  plateMesh.receiveShadow = true;
  plateStation.add(plateMesh);

  // Smooth sculpted curved porcelain Chinese renge soup spoon (continuous ceramic curve!)
  const rengeGroup = new THREE.Group();
  const rengeRestPos = new THREE.Vector3(0.175, 0.024, 0.06);
  rengeGroup.position.copy(rengeRestPos);
  rengeGroup.rotation.y = -0.32;
  plateStation.add(rengeGroup);

  const porcelainMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7f3eb,
    roughness: 0.10,
    clearcoat: 0.98,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
  });

  // Curved boat scoop bowl
  const rengeBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.029, 18, 12, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.54),
    porcelainMat
  );
  rengeBowl.scale.set(0.78, 0.62, 1.42);
  rengeBowl.position.set(0, 0.017, -0.028);
  rengeBowl.castShadow = true;
  rengeGroup.add(rengeBowl);

  // Smoothly arched ergonomic ceramic handle flowing seamlessly out of the scoop!
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.014, 0.008),
    new THREE.Vector3(0, 0.024, 0.042),
    new THREE.Vector3(0, 0.044, 0.078),
    new THREE.Vector3(0, 0.056, 0.105),
  ]);
  const rengeHandleGeo = new THREE.TubeGeometry(handleCurve, 14, 0.0072, 8, false);
  rengeHandleGeo.scale(1.18, 0.52, 1.0);
  const rengeHandle = new THREE.Mesh(rengeHandleGeo, porcelainMat);
  rengeHandle.castShadow = true;
  rengeGroup.add(rengeHandle);

  // Subtle vermilion porcelain accent dot at handle tip
  const rengeTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.0085, 10, 8),
    new THREE.MeshPhysicalMaterial({ color: 0xb82920, roughness: 0.14, clearcoat: 0.9 })
  );
  rengeTip.scale.set(1.0, 0.55, 1.1);
  rengeTip.position.set(0, 0.029, 0.105);
  rengeGroup.add(rengeTip);

  // Glistening scoop of chahan inside the renge during tasting
  const rengeBite = new THREE.Mesh(
    new THREE.SphereGeometry(0.021, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xeac05c, roughness: 0.35 })
  );
  rengeBite.scale.set(0.85, 0.65, 1.18);
  rengeBite.position.set(0, 0.018, -0.028);
  rengeBite.visible = false;
  rengeGroup.add(rengeBite);

  // Generous direct raycast hitbox spanning the entire plate + tray for effortless 1-finger plating on mobile!
  const plateHit = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.14, 0.52),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  plateHit.position.set(0.0, 0.06, 0);
  plateHit.userData = { interactType: 'plate' };
  plateStation.add(plateHit);

  // Stacked spare clean plate for natural wordless replay
  const freshPlateGroup = new THREE.Group();
  freshPlateGroup.position.set(1.00, 0.004, -0.44);
  freshPlateGroup.visible = false;
  group.add(freshPlateGroup);
  for (let i = 0; i < 2; i++) {
    const sp = new THREE.Mesh(plateGeo, plateMat);
    sp.scale.setScalar(0.56);
    sp.position.y = i * 0.019;
    sp.castShadow = true;
    freshPlateGroup.add(sp);
  }
  const freshHit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  freshHit.position.y = 0.05;
  freshHit.userData = { interactType: 'freshReset' };
  freshPlateGroup.add(freshHit);

  // ===========================================================================
  // 7. MOM (ママ) — COMPLETELY REBUILT LIFELIKE PROPORTIONS, HAIR, ARMS & EXPRESSIONS
  // ===========================================================================
  const mom = createMomCharacter(linenTex, knitTex, skinTex);
  mom.root.position.set(0.38, -0.25, -0.82);
  mom.root.rotation.y = -0.30;
  group.add(mom.root);

  return {
    group,
    stoveGroup,
    wokPivot,
    wokMesh,
    handleGroup,
    knobGroup,
    knobDial,
    flameUniforms,
    flameLight,
    sunbeamUniforms,
    plateStation,
    plateMesh,
    plateHit,
    rengeGroup,
    rengeRestPos,
    rengeBite,
    freshPlateGroup,
    mom,
    interactables: [knobHit, wokHit, handleHit, plateHit, freshHit],
  };
}

/**
 * Naturalistic Japanese mother with true anatomical shoulder width (arms OUTSIDE torso!),
 * ribbed knit sweater, draped terracotta linen apron + kitchen towel, contoured sculpted head
 * with dynamic painted portrait expressions, layered dark-brown hair, and exact hand-grip anchor for the tasting spoon!
 */
function createMomCharacter(linenTex, knitTex, skinTex) {
  const root = new THREE.Group();

  const faceCtrl = createMomFaceController();
  const hairTex = createHairTextures();

  const skinMat = new THREE.MeshPhysicalMaterial({
    map: skinTex.map,
    bumpMap: skinTex.bumpMap,
    bumpScale: 0.002,
    roughness: 0.56,
    metalness: 0.0,
    sheen: 0.36,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(0xffb592),
    clearcoat: 0.04,
  });

  const faceMat = new THREE.MeshPhysicalMaterial({
    map: faceCtrl.texture,
    bumpMap: skinTex.bumpMap,
    bumpScale: 0.0015,
    roughness: 0.52,
    metalness: 0.0,
    sheen: 0.34,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(0xffb896),
    clearcoat: 0.05,
  });

  const hairMat = new THREE.MeshPhysicalMaterial({
    map: hairTex.map,
    bumpMap: hairTex.bumpMap,
    bumpScale: 0.008,
    color: 0x322118,
    roughness: 0.78,
    metalness: 0.0,
    sheen: 0.36,
    sheenRoughness: 0.68,
    sheenColor: new THREE.Color(0x885c3e),
    clearcoat: 0.0,
  });

  // Natural muted Japanese kitchenwear: warm heather-taupe wool knit + washed charcoal-indigo linen apron
  // (Eliminates bright white+orange Playmobil toy palette!)
  const sweaterMat = new THREE.MeshStandardMaterial({
    map: knitTex.map,
    bumpMap: knitTex.bumpMap,
    bumpScale: 0.005,
    color: 0x8d8177,
    roughness: 0.96,
  });

  const apronMat = new THREE.MeshStandardMaterial({
    map: linenTex.map,
    bumpMap: linenTex.bumpMap,
    bumpScale: 0.007,
    color: 0x45505c,
    roughness: 0.90,
  });

  const torso = new THREE.Group();
  torso.position.y = 0.20;
  root.add(torso);

  // Full grounded feminine torso extending smoothly down behind the counter with organic sloped trapezius/shoulders!
  const torsoPts = [
    new THREE.Vector2(0.160, -0.28),
    new THREE.Vector2(0.148, -0.10),
    new THREE.Vector2(0.132, 0.04),
    new THREE.Vector2(0.125, 0.14),
    new THREE.Vector2(0.145, 0.25),
    new THREE.Vector2(0.164, 0.340),
    new THREE.Vector2(0.166, 0.376),
    new THREE.Vector2(0.136, 0.414),
    new THREE.Vector2(0.088, 0.444),
    new THREE.Vector2(0.054, 0.464),
  ];
  const bodyGeo = new THREE.LatheGeometry(torsoPts, 32);
  bodyGeo.scale(1.06, 1.0, 0.66);
  const bodyMesh = new THREE.Mesh(bodyGeo, sweaterMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  torso.add(bodyMesh);

  // Soft crew-neck knit neckline collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 8, 22), sweaterMat);
  collar.rotation.x = Math.PI / 2 + 0.18;
  collar.scale.set(1.08, 0.88, 1.0);
  collar.position.set(0, 0.456, 0.010);
  torso.add(collar);

  // Tailored draped Japanese café linen apron extending cleanly below counter line
  const apronPts = [
    new THREE.Vector2(0.166, -0.28),
    new THREE.Vector2(0.154, -0.10),
    new THREE.Vector2(0.140, 0.04),
    new THREE.Vector2(0.132, 0.14),
    new THREE.Vector2(0.150, 0.25),
    new THREE.Vector2(0.156, 0.340),
    new THREE.Vector2(0.116, 0.376),
  ];
  const apronGeo = new THREE.LatheGeometry(apronPts, 24, -Math.PI * 0.35, Math.PI * 0.70);
  apronGeo.scale(1.04, 1.0, 0.72);
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.z = 0.008;
  apronMesh.castShadow = true;
  apronMesh.receiveShadow = true;
  torso.add(apronMesh);

  // Apron waist tie + front stitched pocket
  const waistTie = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.010, 8, 24), apronMat);
  waistTie.rotation.x = Math.PI / 2;
  waistTie.scale.set(1.06, 0.76, 1.0);
  waistTie.position.set(0, 0.145, 0.006);
  torso.add(waistTie);

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.012), apronMat);
  pocket.position.set(0, 0.085, 0.105);
  torso.add(pocket);

  // Soft woven linen straps + small wooden buttons
  const btnMat = new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.55 });
  for (const side of [-1, 1]) {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.082, 0.365, 0.095),
      new THREE.Vector3(side * 0.086, 0.448, 0.032),
      new THREE.Vector3(side * 0.082, 0.422, -0.068),
    ]);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(strapCurve, 12, 0.010, 6, false), apronMat);
    strap.scale.z = 0.55;
    torso.add(strap);

    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.004, 10), btnMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(side * 0.082, 0.366, 0.102);
    torso.add(btn);
  }

  // Slender anatomical neck (natural proportion, slightly forward-pitched)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.048, 0.105, 16), skinMat);
  neck.position.set(0, 0.492, 0.006);
  neck.rotation.x = 0.06;
  neck.castShadow = true;
  torso.add(neck);

  // Head Group — sculpted realistic human oval with jaw, cheek contour & brow ridge!
  const head = new THREE.Group();
  head.position.set(0, 0.592, 0.018);
  torso.add(head);

  const headGeo = new THREE.SphereGeometry(0.096, 36, 26);
  const hp = headGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    let x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    // Natural tapered jaw & soft chin contour
    if (y < 0) {
      const chinT = Math.min(1, -y / 0.096);
      x *= 1.0 - chinT * 0.27;
      z *= 1.0 - chinT * 0.15;
    }
    // Gentle cheekbone & brow ridge sculpting on +X side (remember headMesh rotates -PI/2 so +X becomes +Z front!)
    if (x > 0.03) {
      const frontMask = THREE.MathUtils.smoothstep(x, 0.03, 0.09);
      // Subtle eye-socket dip around y = 0.004, |z| = 0.030
      const eyeDist = Math.hypot((Math.abs(z) - 0.032) * 1.1, (y - 0.002) * 1.6);
      const eyeDip = Math.exp(-eyeDist * eyeDist * 1400) * 0.0055 * frontMask;
      // Subtle cheekbone lift below eyes
      const cheekDist = Math.hypot(Math.abs(z) - 0.044, y + 0.022);
      const cheekLift = Math.exp(-cheekDist * cheekDist * 750) * 0.0045 * frontMask;
      // Subtle chin prominence
      const chinDist = Math.hypot(z, y + 0.082);
      const chinLift = Math.exp(-chinDist * chinDist * 1100) * 0.005 * frontMask;
      x += -eyeDip + cheekLift + chinLift;
    }
    hp.setXYZ(i, x * 1.02, y * 1.13, z * 0.89);
  }
  headGeo.computeVertexNormals();
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  head.add(headMesh);

  // Delicate sculpted nose bridge + subtle tip (blends organically with face map!)
  const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, 0.020, 6, 8), skinMat);
  noseBridge.position.set(0, -0.006, 0.094);
  noseBridge.rotation.x = -0.22;
  head.add(noseBridge);
  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), skinMat);
  noseTip.scale.set(1.05, 0.78, 0.92);
  noseTip.position.set(0, -0.017, 0.098);
  head.add(noseTip);

  // Natural ears
  const earGeo = new THREE.SphereGeometry(0.016, 10, 8);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.scale.set(0.32, 1.15, 0.72);
  earL.position.set(-0.083, -0.008, -0.004);
  const earR = earL.clone();
  earR.position.x = 0.083;
  head.add(earL, earR);

  // Natural Layered Chestnut Hair Silhouette (soft side curtains + low chignon bun + tortoiseshell hair clip!)
  const hairShellGeo = new THREE.SphereGeometry(0.103, 30, 22);
  const hsp = hairShellGeo.attributes.position;
  for (let i = 0; i < hsp.count; i++) {
    let x = hsp.getX(i), y = hsp.getY(i), z = hsp.getZ(i);
    if (z > 0.006 && y < 0.048 && Math.abs(x) < 0.090) {
      const sideEdge = THREE.MathUtils.smoothstep(0.090, 0.056, Math.abs(x));
      const topEdge = THREE.MathUtils.smoothstep(0.048, 0.020, y);
      const faceMask = THREE.MathUtils.smoothstep(z, 0.006, 0.068) * sideEdge * topEdge;
      z -= faceMask * 0.068;
    }
    // Natural gentle hair wave contour covering head crown cleanly with zero scalp poke-through!
    const wave = 1.0 + 0.025 * Math.sin(y * 36.0 + x * 18.0);
    hsp.setXYZ(i, x * 0.98 * wave, y * 1.15, z * 1.06 * wave);
  }
  hairShellGeo.computeVertexNormals();
  const hairShell = new THREE.Mesh(hairShellGeo, hairMat);
  hairShell.position.set(0, 0.009, -0.010);
  hairShell.castShadow = true;
  head.add(hairShell);

  // Soft side-swept hair locks framing cheeks cleanly behind ears to the low nape bun
  for (const side of [-1, 1]) {
    const lock1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.038, 0.082, 0.028),
      new THREE.Vector3(side * 0.082, 0.028, 0.012),
      new THREE.Vector3(side * 0.086, -0.042, -0.014),
      new THREE.Vector3(side * 0.048, -0.086, -0.072),
    ]);
    const m1 = new THREE.Mesh(new THREE.TubeGeometry(lock1, 14, 0.017, 8, false), hairMat);
    m1.scale.set(0.78, 1.0, 0.84);
    head.add(m1);
  }

  // Low kitchen chignon bun + warm amber-tortoiseshell hair clip accent
  const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.054, 16, 14), hairMat);
  hairBun.scale.set(1.08, 0.86, 0.94);
  hairBun.position.set(0, -0.024, -0.114);
  hairBun.castShadow = true;
  head.add(hairBun);

  const hairClip = new THREE.Mesh(
    new THREE.BoxGeometry(0.046, 0.012, 0.010),
    new THREE.MeshPhysicalMaterial({ color: 0x7a421e, roughness: 0.18, clearcoat: 0.9 })
  );
  hairClip.position.set(0.032, 0.008, -0.106);
  hairClip.rotation.set(0.2, 0.45, -0.2);
  head.add(hairClip);

  // ===========================================================================
  // ANATOMICAL CONTINUOUS SLOPED SHOULDERS & TAPERED SLEEVES (ZERO BLOCK CORNERS / ZERO SEAM!)
  // ===========================================================================
  const upperSleevePts = [
    new THREE.Vector2(0.028, 0.0),
    new THREE.Vector2(0.033, 0.014),
    new THREE.Vector2(0.032, 0.055),
    new THREE.Vector2(0.037, 0.130),
    new THREE.Vector2(0.038, 0.172),
    new THREE.Vector2(0.022, 0.196),
  ];
  const upperSleeveGeo = new THREE.LatheGeometry(upperSleevePts, 20);
  upperSleeveGeo.translate(0, -0.188, 0);

  const forearmPts = [
    new THREE.Vector2(0.026, 0.0),
    new THREE.Vector2(0.025, 0.058),
    new THREE.Vector2(0.021, 0.130),
    new THREE.Vector2(0.017, 0.190),
  ];
  const forearmGeo = new THREE.LatheGeometry(forearmPts, 16);
  // Angles cleanly into hand.position (0, -0.028, 0.182) with ZERO wrist gap!
  forearmGeo.rotateX(Math.PI * 0.55);

  function makeArm(side) {
    const shoulder = new THREE.Group();
    // Smoothly embedded inside the sloped upper chest contour (zero horizontal ledge or right-angle step!)
    shoulder.position.set(side * 0.144, 0.354, 0.004);
    torso.add(shoulder);

    // Smoothly sloped trapezius-to-deltoid bridge curving gently downward into the upper sleeve
    const shoulderSlope = new THREE.Mesh(new THREE.SphereGeometry(0.044, 16, 12), sweaterMat);
    shoulderSlope.scale.set(1.22, 0.72, 0.90);
    shoulderSlope.position.set(-side * 0.012, 0.008, 0);
    shoulderSlope.rotation.z = -side * 0.52;
    shoulderSlope.castShadow = true;
    shoulder.add(shoulderSlope);

    // Organic downward-draped knit upper sleeve flowing smoothly out of the curved shoulder
    const upperArm = new THREE.Mesh(upperSleeveGeo, sweaterMat);
    upperArm.position.set(side * 0.014, -0.006, 0.002);
    upperArm.rotation.set(-0.20, 0, side * 0.14);
    upperArm.castShadow = true;
    upperArm.receiveShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.036, -0.178, 0.040);
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.set(0, -0.004, 0.004);
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = new THREE.Group();
    hand.position.set(0, -0.028, 0.182);
    elbow.add(hand);

    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.029, 12, 10), skinMat);
    palm.scale.set(0.86, 0.46, 1.15);
    palm.castShadow = true;
    hand.add(palm);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.0050, 0.025, 4, 6), skinMat);
      finger.rotation.x = Math.PI / 2 + 0.20;
      finger.position.set((f - 1.5) * 0.010, -0.003, 0.036);
      hand.add(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0058, 0.021, 4, 6), skinMat);
    thumb.rotation.set(Math.PI / 2, 0, -side * 0.50);
    thumb.position.set(-side * 0.024, -0.002, 0.015);
    hand.add(thumb);

    // Exact grip point in palm/fingers for holding the porcelain renge spoon cleanly!
    const spoonAnchor = new THREE.Object3D();
    spoonAnchor.position.set(-side * 0.010, 0.004, 0.032);
    hand.add(spoonAnchor);

    return { shoulder, elbow, hand, spoonAnchor };
  }

  const armL = makeArm(-1);
  const armR = makeArm(1);

  armL.shoulder.rotation.set(0.18, 0.10, 0.10);
  armL.elbow.rotation.set(-0.28, -0.10, 0);
  armR.shoulder.rotation.set(0.16, -0.10, -0.10);
  armR.elbow.rotation.set(-0.26, 0.10, 0);

  const state = {
    mood: 'watch', // 'watch' | 'excited' | 'invitePlate' | 'tasting' | 'celebrate' | 'burnt_laugh' | 'cold_surprise' | 'salty' | 'crispy_joy'
    moodTimer: 0,
    lookTarget: new THREE.Vector3(-0.04, 0.16, 0.02),
    clapPhase: 0,
  };

  function setMood(mood, duration = 2.6) {
    state.mood = mood;
    state.moodTimer = duration;
    // Update Mom's dynamic facial expression canvas immediately!
    const exprMap = {
      watch: 'watch',
      invitePlate: 'watch',
      excited: 'excited',
      tasting: 'tasting',
      celebrate: 'celebrate',
      crispy_joy: 'celebrate',
      burnt_laugh: 'burnt_laugh',
      cold_surprise: 'cold_surprise',
      salty: 'salty',
    };
    faceCtrl.setExpression(exprMap[mood] || 'watch');
  }

  function update(dt, time, targetWorldPos) {
    if (targetWorldPos) {
      state.lookTarget.lerp(targetWorldPos, Math.min(1, dt * 4.5));
    }
    if (state.moodTimer > 0) {
      state.moodTimer -= dt;
      if (state.moodTimer <= 0 && state.mood !== 'invitePlate') {
        setMood('watch', 0);
      }
    }

    torso.position.y = 0.20 + Math.sin(time * 2.0) * 0.008;

    const localTarget = root.worldToLocal(state.lookTarget.clone());
    const dx = localTarget.x;
    const dy = localTarget.y - 0.78;
    const dz = Math.max(0.28, localTarget.z);
    const targetYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz) * 0.58, -0.50, 0.50);
    const targetPitch = THREE.MathUtils.clamp(-Math.atan2(dy, dz) * 0.48, -0.20, 0.36);

    let nodOffset = 0;
    let tiltOffset = Math.sin(time * 1.1) * 0.024;
    let leanZ = 0;

    if (state.mood === 'excited') {
      nodOffset = Math.sin(time * 10.0) * 0.07;
      leanZ = 0.07;
    } else if (state.mood === 'tasting') {
      nodOffset = 0.14 + Math.sin(time * 7.5) * 0.04;
      leanZ = 0.12;
    } else if (state.mood === 'celebrate' || state.mood === 'crispy_joy') {
      nodOffset = Math.sin(time * 9.5) * 0.10;
      tiltOffset = Math.sin(time * 4.8) * 0.10;
      leanZ = 0.09;
    } else if (state.mood === 'burnt_laugh') {
      nodOffset = -0.05 + Math.sin(time * 13.0) * 0.08;
      tiltOffset = Math.sin(time * 7.0) * 0.14;
      leanZ = -0.04;
    } else if (state.mood === 'cold_surprise') {
      nodOffset = -0.06;
      tiltOffset = Math.sin(time * 22.0) * 0.06; // Playful chilly shiver!
      leanZ = -0.03;
    } else if (state.mood === 'salty') {
      nodOffset = 0.04;
      tiltOffset = 0.16 + Math.sin(time * 8.0) * 0.05;
      leanZ = 0.04;
    } else if (state.mood === 'invitePlate') {
      nodOffset = Math.sin(time * 3.0) * 0.035;
      leanZ = 0.06;
    }

    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetYaw, dt * 5.2);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetPitch + nodOffset, dt * 5.8);
    head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, tiltOffset, dt * 4.5);
    torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, leanZ, dt * 3.8);

    // Expressive arm choreography tailored cleanly to each mood (arms always outside torso!)
    if (state.mood === 'celebrate' || state.mood === 'crispy_joy') {
      state.clapPhase += dt * 11.5;
      const clap = Math.abs(Math.sin(state.clapPhase));
      armL.shoulder.rotation.x = THREE.MathUtils.lerp(armL.shoulder.rotation.x, -0.36, dt * 7);
      armL.shoulder.rotation.y = THREE.MathUtils.lerp(armL.shoulder.rotation.y, 0.38 - clap * 0.20, dt * 12);
      armL.elbow.rotation.x = THREE.MathUtils.lerp(armL.elbow.rotation.x, -0.78, dt * 8);

      armR.shoulder.rotation.x = THREE.MathUtils.lerp(armR.shoulder.rotation.x, -0.36, dt * 7);
      armR.shoulder.rotation.y = THREE.MathUtils.lerp(armR.shoulder.rotation.y, -0.38 + clap * 0.20, dt * 12);
      armR.elbow.rotation.x = THREE.MathUtils.lerp(armR.elbow.rotation.x, -0.78, dt * 8);
    } else if (state.mood === 'burnt_laugh') {
      // Gently waves right hand in front of smoky aroma while giggling!
      const wave = Math.sin(time * 12.0) * 0.22;
      armR.shoulder.rotation.x = THREE.MathUtils.lerp(armR.shoulder.rotation.x, -0.68, dt * 7);
      armR.shoulder.rotation.y = THREE.MathUtils.lerp(armR.shoulder.rotation.y, -0.22 + wave, dt * 12);
      armR.elbow.rotation.x = THREE.MathUtils.lerp(armR.elbow.rotation.x, -1.05, dt * 7);

      armL.shoulder.rotation.x = THREE.MathUtils.lerp(armL.shoulder.rotation.x, -0.10, dt * 6);
      armL.shoulder.rotation.y = THREE.MathUtils.lerp(armL.shoulder.rotation.y, 0.18, dt * 6);
      armL.elbow.rotation.x = THREE.MathUtils.lerp(armL.elbow.rotation.x, -0.52, dt * 6);
    } else if (state.mood === 'cold_surprise' || state.mood === 'salty') {
      // Hands up near cheeks in delighted surprise / punchy taste reaction!
      armL.shoulder.rotation.x = THREE.MathUtils.lerp(armL.shoulder.rotation.x, -0.62, dt * 7);
      armL.shoulder.rotation.y = THREE.MathUtils.lerp(armL.shoulder.rotation.y, 0.26, dt * 7);
      armL.elbow.rotation.x = THREE.MathUtils.lerp(armL.elbow.rotation.x, -1.18, dt * 7);

      armR.shoulder.rotation.x = THREE.MathUtils.lerp(armR.shoulder.rotation.x, -0.62, dt * 7);
      armR.shoulder.rotation.y = THREE.MathUtils.lerp(armR.shoulder.rotation.y, -0.26, dt * 7);
      armR.elbow.rotation.x = THREE.MathUtils.lerp(armR.elbow.rotation.x, -1.18, dt * 7);
    } else if (state.mood === 'tasting') {
      // Right arm lifts smoothly up toward Mom's mouth holding the porcelain renge spoon!
      armR.shoulder.rotation.x = THREE.MathUtils.lerp(armR.shoulder.rotation.x, -0.66, dt * 6.5);
      armR.shoulder.rotation.y = THREE.MathUtils.lerp(armR.shoulder.rotation.y, -0.34, dt * 6.5);
      armR.elbow.rotation.x = THREE.MathUtils.lerp(armR.elbow.rotation.x, -1.05, dt * 6.5);

      armL.shoulder.rotation.x = THREE.MathUtils.lerp(armL.shoulder.rotation.x, 0.08, dt * 5);
      armL.shoulder.rotation.y = THREE.MathUtils.lerp(armL.shoulder.rotation.y, 0.16, dt * 5);
      armL.elbow.rotation.x = THREE.MathUtils.lerp(armL.elbow.rotation.x, -0.38, dt * 5);
    } else if (state.mood === 'excited') {
      const cheer = Math.sin(time * 8.5) * 0.14;
      armL.shoulder.rotation.x = THREE.MathUtils.lerp(armL.shoulder.rotation.x, -0.18 + cheer, dt * 7);
      armL.shoulder.rotation.y = THREE.MathUtils.lerp(armL.shoulder.rotation.y, 0.18, dt * 7);
      armL.elbow.rotation.x = THREE.MathUtils.lerp(armL.elbow.rotation.x, -0.52, dt * 7);

      armR.shoulder.rotation.x = THREE.MathUtils.lerp(armR.shoulder.rotation.x, -0.18 - cheer, dt * 7);
      armR.shoulder.rotation.y = THREE.MathUtils.lerp(armR.shoulder.rotation.y, -0.18, dt * 7);
      armR.elbow.rotation.x = THREE.MathUtils.lerp(armR.elbow.rotation.x, -0.52, dt * 7);
    } else {
      armL.shoulder.rotation.x = THREE.MathUtils.lerp(armL.shoulder.rotation.x, 0.18 + Math.sin(time * 1.4) * 0.025, dt * 4);
      armL.shoulder.rotation.y = THREE.MathUtils.lerp(armL.shoulder.rotation.y, 0.10, dt * 4);
      armL.elbow.rotation.x = THREE.MathUtils.lerp(armL.elbow.rotation.x, -0.28, dt * 4);

      armR.shoulder.rotation.x = THREE.MathUtils.lerp(armR.shoulder.rotation.x, 0.16 - Math.sin(time * 1.4) * 0.025, dt * 4);
      armR.shoulder.rotation.y = THREE.MathUtils.lerp(armR.shoulder.rotation.y, -0.10, dt * 4);
      armR.elbow.rotation.x = THREE.MathUtils.lerp(armR.elbow.rotation.x, -0.26, dt * 4);
    }
  }

  return { root, head, torso, armR, armL, setMood, update, state };
}
