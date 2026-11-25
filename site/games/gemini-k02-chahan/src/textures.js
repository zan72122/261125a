import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function configureTex(tex, repeatX = 1, repeatY = 1, isColor = true) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Rich cinematic late-afternoon sunset kitchen HDR environment map via PMREMGenerator.
 */
export function createSunsetKitchenEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();

  const domeGeo = new THREE.SphereGeometry(12, 32, 24);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float up = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 floorCol = vec3(0.08, 0.06, 0.05);
        vec3 wallCol = vec3(0.24, 0.19, 0.16);
        vec3 ceilCol = vec3(0.42, 0.36, 0.32);
        vec3 col = mix(floorCol, wallCol, smoothstep(0.15, 0.55, up));
        col = mix(col, ceilCol, smoothstep(0.55, 0.95, up));

        float coolSide = max(0.0, dot(d, normalize(vec3(0.82, 0.22, 0.52))));
        col += vec3(0.10, 0.15, 0.24) * pow(coolSide, 2.0);

        vec3 sunDir = normalize(vec3(-0.78, 0.32, -0.54));
        float sunDot = max(0.0, dot(d, sunDir));
        col += vec3(3.4, 1.65, 0.58) * pow(sunDot, 5.0);
        col += vec3(7.0, 3.8, 1.4) * pow(sunDot, 42.0);

        vec3 topDir = normalize(vec3(0.12, 0.96, 0.18));
        float topDot = max(0.0, dot(d, topDir));
        col += vec3(1.5, 1.35, 1.15) * pow(topDot, 22.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const winPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 3.6),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(4.8, 2.35, 0.95), side: THREE.DoubleSide })
  );
  winPanel.position.set(-6.4, 2.5, -4.3);
  winPanel.lookAt(0, 0, 0);
  envScene.add(winPanel);

  const hoodStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.55),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.75), side: THREE.DoubleSide })
  );
  hoodStrip.position.set(0.0, 6.2, 0.35);
  hoodStrip.rotation.x = Math.PI / 2;
  envScene.add(hoodStrip);

  const rt = pmrem.fromScene(envScene, 0.02);
  pmrem.dispose();
  domeGeo.dispose();
  domeMat.dispose();
  return rt.texture;
}

/**
 * Seasoned hammered carbon-steel wok textures (albedo, bump, roughness).
 */
export function createWokTextures() {
  const size = 512;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const roughCtx = roughC.getContext('2d');
  const rand = seededRand(4201);

  const gCol = colCtx.createLinearGradient(0, 0, 0, size);
  gCol.addColorStop(0.0, '#181617');
  gCol.addColorStop(0.26, '#211e20');
  gCol.addColorStop(0.55, '#252326');
  gCol.addColorStop(0.80, '#1e1d20');
  gCol.addColorStop(1.0, '#363332');
  colCtx.fillStyle = gCol;
  colCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 55; i++) {
    const y = rand() * size;
    const h = 6 + rand() * 34;
    colCtx.fillStyle = rand() > 0.45 ? 'rgba(64, 48, 32, 0.16)' : 'rgba(28, 38, 56, 0.17)';
    colCtx.fillRect(0, y, size, h);
  }

  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#585858';
  roughCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const v = Math.floor(114 + rand() * 28);
    bumpCtx.fillStyle = `rgb(${v},${v},${v})`;
    bumpCtx.fillRect(0, y, size, 1.2);
    const rv = Math.floor(66 + rand() * 44);
    roughCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    roughCtx.fillRect(0, y, size, 1.4);
  }

  for (let i = 0; i < 720; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 5 + rand() * 8;
    const ry = 4 + rand() * 7;

    const bg = bumpCtx.createRadialGradient(x, y, 0, x, y, rx);
    bg.addColorStop(0, 'rgba(54,54,54,0.48)');
    bg.addColorStop(0.7, 'rgba(138,138,138,0.2)');
    bg.addColorStop(1, 'rgba(128,128,128,0)');
    bumpCtx.fillStyle = bg;
    bumpCtx.beginPath();
    bumpCtx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    bumpCtx.fill();
  }

  const oilGrad = roughCtx.createLinearGradient(0, 0, 0, size);
  oilGrad.addColorStop(0, 'rgba(26,26,26,0.62)');
  oilGrad.addColorStop(0.45, 'rgba(44,44,44,0.45)');
  oilGrad.addColorStop(0.82, 'rgba(110,110,110,0.38)');
  oilGrad.addColorStop(1, 'rgba(140,140,140,0.48)');
  roughCtx.fillStyle = oilGrad;
  roughCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 140; i++) {
    const x = rand() * size;
    const y = rand() * size * 0.65;
    const len = 18 + rand() * 58;
    colCtx.strokeStyle = 'rgba(165, 158, 148, 0.09)';
    colCtx.lineWidth = 0.8;
    colCtx.beginPath();
    colCtx.moveTo(x, y);
    colCtx.lineTo(x + len, y + (rand() - 0.5) * 9);
    colCtx.stroke();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 1, 1, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 1, 1, false),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 1, 1, false),
  };
}

/**
 * Brushed stainless steel Japanese kitchen countertop.
 */
export function createSteelTextures() {
  const size = 512;
  const colC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const roughCtx = roughC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(9902);

  colCtx.fillStyle = '#9ea4aa';
  colCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#626262';
  roughCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const y = rand() * size;
    const x = rand() * size;
    const w = 30 + rand() * 160;
    const shade = 142 + Math.floor(rand() * 44);
    colCtx.fillStyle = `rgba(${shade},${shade + 2},${shade + 5},0.18)`;
    colCtx.fillRect(x, y, w, 1);

    const rv = 60 + Math.floor(rand() * 62);
    roughCtx.fillStyle = `rgba(${rv},${rv},${rv},0.25)`;
    roughCtx.fillRect(x, y, w, 1.2);

    const bv = 112 + Math.floor(rand() * 32);
    bumpCtx.fillStyle = `rgba(${bv},${bv},${bv},0.24)`;
    bumpCtx.fillRect(x, y, w, 1);
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 2, 2, true),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 2, 2, false),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2, 2, false),
  };
}

/**
 * Square Japanese kitchen ceramic tiles (1x1 unit repeat; meshes use exact world-space UVs so tiles are ALWAYS square!).
 */
export function createTileTextures() {
  const size = 512;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const roughC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const roughCtx = roughC.getContext('2d');
  const rand = seededRand(5151);

  colCtx.fillStyle = '#b4a89d';
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#323232';
  bumpCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#e4e4e4';
  roughCtx.fillRect(0, 0, size, size);

  const grid = 4;
  const step = size / grid;
  const grout = 4;

  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x = gx * step + grout;
      const y = gy * step + grout;
      const w = step - grout * 2;
      const h = step - grout * 2;

      const r = 228 + Math.floor((rand() - 0.5) * 14);
      const g = 219 + Math.floor((rand() - 0.5) * 14);
      const b = 204 + Math.floor((rand() - 0.5) * 14);

      const tg = colCtx.createLinearGradient(x, y, x + w, y + h);
      tg.addColorStop(0, `rgb(${r + 5},${g + 4},${b + 2})`);
      tg.addColorStop(1, `rgb(${r - 8},${g - 8},${b - 10})`);
      colCtx.fillStyle = tg;
      colCtx.fillRect(x, y, w, h);

      colCtx.strokeStyle = 'rgba(130, 118, 106, 0.24)';
      colCtx.lineWidth = 2;
      colCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      bumpCtx.fillStyle = '#dcdcdc';
      bumpCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
      bumpCtx.strokeStyle = '#929292';
      bumpCtx.lineWidth = 3;
      bumpCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);

      const rv = 30 + Math.floor(rand() * 24);
      roughCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      roughCtx.fillRect(x, y, w, h);
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 1, 1, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 1, 1, false),
    roughnessMap: configureTex(new THREE.CanvasTexture(roughC), 1, 1, false),
  };
}

/**
 * Natural wood grain texture (hinoki cutting board or dark walnut handle/tray).
 */
export function createWoodTextures(dark = false) {
  const size = 512;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(dark ? 7711 : 3322);

  colCtx.fillStyle = dark ? '#452b19' : '#cca574';
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 260; i++) {
    const y = (i / 260) * size;
    const wave = Math.sin(i * 0.11) * 9;
    const tone = dark
      ? `rgba(${50 + Math.floor(rand() * 34)}, ${28 + Math.floor(rand() * 20)}, ${15 + Math.floor(rand() * 14)}, 0.48)`
      : `rgba(${176 + Math.floor(rand() * 38)}, ${134 + Math.floor(rand() * 32)}, ${86 + Math.floor(rand() * 28)}, 0.44)`;
    colCtx.strokeStyle = tone;
    colCtx.lineWidth = 1.4 + rand() * 3.4;
    colCtx.beginPath();
    colCtx.moveTo(0, y);
    colCtx.bezierCurveTo(size * 0.33, y + wave, size * 0.66, y - wave, size, y + (rand() - 0.5) * 6);
    colCtx.stroke();

    const bv = 104 + Math.floor(rand() * 44);
    bumpCtx.strokeStyle = `rgba(${bv},${bv},${bv},0.35)`;
    bumpCtx.lineWidth = 1.5;
    bumpCtx.beginPath();
    bumpCtx.moveTo(0, y);
    bumpCtx.lineTo(size, y + (rand() - 0.5) * 4);
    bumpCtx.stroke();
  }

  if (!dark) {
    for (let i = 0; i < 85; i++) {
      const x = 80 + rand() * (size - 160);
      const y = 70 + rand() * (size - 140);
      const len = 35 + rand() * 90;
      const ang = (rand() - 0.5) * 0.38;
      colCtx.strokeStyle = 'rgba(118, 84, 52, 0.22)';
      colCtx.lineWidth = 1;
      colCtx.beginPath();
      colCtx.moveTo(x, y);
      colCtx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      colCtx.stroke();
      bumpCtx.strokeStyle = 'rgba(60, 60, 60, 0.42)';
      bumpCtx.beginPath();
      bumpCtx.moveTo(x, y);
      bumpCtx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      bumpCtx.stroke();
    }
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 1, 1, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 1, 1, false),
  };
}

/**
 * Authentic Chinese porcelain chahan plate texture with crisp vermilion raimon border.
 */
export function createPlateTexture() {
  const size = 512;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.5);
  bg.addColorStop(0, '#f8f4ec');
  bg.addColorStop(0.75, '#efe9dd');
  bg.addColorStop(1, '#e3dac8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#b4261c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.435, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#c2963a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.415, 0, Math.PI * 2);
  ctx.stroke();

  const segments = 24;
  const rOuter = size * 0.402;
  const rInner = size * 0.354;
  ctx.strokeStyle = '#bc2b20';
  ctx.lineWidth = 3.8;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 0.82) / segments) * Math.PI * 2;
    const am = ((i + 0.42) / segments) * Math.PI * 2;
    const rMid = (rOuter + rInner) * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * rInner, cy + Math.sin(a0) * rInner);
    ctx.lineTo(cx + Math.cos(a0) * rOuter, cy + Math.sin(a0) * rOuter);
    ctx.lineTo(cx + Math.cos(a1) * rOuter, cy + Math.sin(a1) * rOuter);
    ctx.lineTo(cx + Math.cos(a1) * rInner, cy + Math.sin(a1) * rInner);
    ctx.lineTo(cx + Math.cos(am) * rInner, cy + Math.sin(am) * rInner);
    ctx.lineTo(cx + Math.cos(am) * rMid, cy + Math.sin(am) * rMid);
    ctx.stroke();
  }

  ctx.strokeStyle = '#bc2b20';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.332, 0, Math.PI * 2);
  ctx.stroke();

  return configureTex(new THREE.CanvasTexture(c), 1, 1, true);
}

/**
 * Juicy marbled rosy-pink ham texture.
 */
export function createHamTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rand = seededRand(8812);

  ctx.fillStyle = '#cf7c7a';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 180; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 24;
    const isFat = rand() > 0.78;
    ctx.fillStyle = isFat
      ? `rgba(244, 222, 214, ${0.22 + rand() * 0.25})`
      : `rgba(${176 + Math.floor(rand() * 35)}, ${96 + Math.floor(rand() * 28)}, ${98 + Math.floor(rand() * 26)}, 0.28)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.4 + rand() * 0.6), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 38; i++) {
    ctx.strokeStyle = 'rgba(248, 228, 220, 0.36)';
    ctx.lineWidth = 1 + rand() * 1.8;
    ctx.beginPath();
    const x = rand() * size;
    const y = rand() * size;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rand() - 0.5) * 40, y + (rand() - 0.5) * 40, x + (rand() - 0.5) * 70, y + (rand() - 0.5) * 70);
    ctx.stroke();
  }

  return configureTex(new THREE.CanvasTexture(c), 1, 1, true);
}

/**
 * Woven linen apron textures with soft fabric drape shading.
 */
export function createLinenTextures(baseHex = '#b9775b') {
  const size = 256;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(6120);

  colCtx.fillStyle = baseHex;
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < size; i += 3) {
    const a = 0.08 + rand() * 0.09;
    colCtx.fillStyle = `rgba(245, 228, 214, ${a})`;
    colCtx.fillRect(0, i, size, 1.4);
    colCtx.fillStyle = `rgba(75, 42, 28, ${a})`;
    colCtx.fillRect(i, 0, 1.4, size);

    bumpCtx.fillStyle = 'rgba(175,175,175,0.42)';
    bumpCtx.fillRect(0, i, size, 1.2);
    bumpCtx.fillStyle = 'rgba(85,85,85,0.42)';
    bumpCtx.fillRect(i, 0, 1.2, size);
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 4, 4, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 4, 4, false),
  };
}

/**
 * Soft matte heather cotton-linen knit texture for sweaters & POV sleeves (zero robotic stripes!).
 */
export function createKnitFabricTextures(baseHex = '#ddd3c6', shadowRgba = 'rgba(92, 78, 66, 0.07)') {
  const size = 256;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(4812);

  colCtx.fillStyle = baseHex;
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  // Soft heather yarn slubs & organic matte fabric variation
  for (let i = 0; i < 480; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 14;
    const g = colCtx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? 'rgba(255, 250, 244, 0.09)' : 'rgba(84, 70, 58, 0.07)');
    g.addColorStop(1, 'rgba(180, 165, 150, 0)');
    colCtx.fillStyle = g;
    colCtx.beginPath();
    colCtx.arc(x, y, r, 0, Math.PI * 2);
    colCtx.fill();
  }

  // Ultra-fine subtle woven micro-texture (reads as cozy brushed cotton knit, never loud stripes!)
  for (let i = 0; i < size; i += 3) {
    colCtx.fillStyle = shadowRgba;
    colCtx.fillRect(i, 0, 1, size);
    colCtx.fillStyle = 'rgba(255, 249, 242, 0.05)';
    colCtx.fillRect(0, i, size, 1);

    bumpCtx.fillStyle = 'rgba(104, 104, 104, 0.35)';
    bumpCtx.fillRect(i, 0, 1, size);
    bumpCtx.fillStyle = 'rgba(154, 154, 154, 0.32)';
    bumpCtx.fillRect(0, i, size, 1);
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 4, 4, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 4, 4, false),
  };
}

/**
 * Natural realistic human skin texture with warm subsurface tonal variation & fine micro-texture.
 */
export function createSkinTextures() {
  const size = 256;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(2941);

  colCtx.fillStyle = '#d49f80';
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  // Subtle organic skin mottling (warm peach, soft rose & golden-olive undertones so hands never look like flat plastic)
  for (let i = 0; i < 320; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 5 + rand() * 22;
    const g = colCtx.createRadialGradient(x, y, 0, x, y, r);
    const kind = rand();
    g.addColorStop(
      0,
      kind > 0.66
        ? 'rgba(202, 126, 98, 0.14)'
        : kind > 0.33
        ? 'rgba(238, 198, 170, 0.12)'
        : 'rgba(164, 108, 82, 0.09)'
    );
    g.addColorStop(1, 'rgba(212, 159, 128, 0)');
    colCtx.fillStyle = g;
    colCtx.beginPath();
    colCtx.arc(x, y, r, 0, Math.PI * 2);
    colCtx.fill();

    const bv = 112 + Math.floor(rand() * 32);
    bumpCtx.fillStyle = `rgba(${bv},${bv},${bv},0.26)`;
    bumpCtx.fillRect(x, y, 2, 2);
  }
  // Fine skin micro-creases for realistic close-up POV hands
  for (let i = 0; i < 65; i++) {
    const y = rand() * size;
    colCtx.strokeStyle = 'rgba(138, 84, 62, 0.06)';
    colCtx.lineWidth = 1;
    colCtx.beginPath();
    colCtx.moveTo(0, y);
    colCtx.lineTo(size, y + (rand() - 0.5) * 10);
    colCtx.stroke();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 2, 2, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2, 2, false),
  };
}

/**
 * Photorealistic liquid beaten egg surface texture (silky yolk ribbons swirled into glossy albumen + micro-bubbles).
 * Replaces the toy-like torus swirl!
 */
export function createBeatenEggSurfaceTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const rand = seededRand(7129);

  // Deep golden-amber liquid beaten egg gradient
  const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, size * 0.5);
  bg.addColorStop(0.0, '#e39012');
  bg.addColorStop(0.55, '#eb9f1c');
  bg.addColorStop(0.86, '#d98a12');
  bg.addColorStop(1.0, '#b86c08');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Organic silky marbled swirls of pale translucent egg white & rich orange-gold yolk
  for (let s = 0; s < 14; s++) {
    const startA = rand() * Math.PI * 2;
    const isWhite = s % 3 === 0;
    ctx.strokeStyle = isWhite
      ? `rgba(255, 240, 196, ${0.26 + rand() * 0.18})`
      : `rgba(218, 114, 8, ${0.24 + rand() * 0.20})`;
    ctx.lineWidth = 4 + rand() * 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t <= 22; t++) {
      const f = t / 22;
      const a = startA + f * 3.8;
      const rad = 12 + f * (size * 0.37) + Math.sin(f * 6 + s) * 6;
      const px = cx + Math.cos(a) * rad;
      const py = cy + Math.sin(a) * rad;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Tiny natural whisk air micro-bubbles clustered near edge
  for (let i = 0; i < 42; i++) {
    const a = rand() * Math.PI * 2;
    const rad = size * (0.24 + rand() * 0.20);
    const bx = cx + Math.cos(a) * rad;
    const by = cy + Math.sin(a) * rad;
    const br = 1.2 + rand() * 2.8;
    ctx.fillStyle = 'rgba(255, 246, 218, 0.55)';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTex(new THREE.CanvasTexture(c), 1, 1, true);
}

/**
 * Organic sizzling egg bubble bump & detail texture for deforming egg pool.
 */
export function createEggBumpTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rand = seededRand(3091);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 240; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const bright = rand() > 0.35;
    g.addColorStop(0, bright ? 'rgba(225,225,225,0.55)' : 'rgba(55,55,55,0.45)');
    g.addColorStop(0.7, bright ? 'rgba(150,150,150,0.2)' : 'rgba(110,110,110,0.18)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTex(new THREE.CanvasTexture(c), 2, 2, false);
}

/**
 * Delicate curled wispy smoke/steam texture with realistic filament contrast for backlit oil smoke.
 */
export function createSmokeTexture() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rand = seededRand(1209);

  ctx.clearRect(0, 0, size, size);

  const core = ctx.createRadialGradient(size * 0.46, size * 0.50, 6, size * 0.5, size * 0.5, size * 0.44);
  core.addColorStop(0.0, 'rgba(255, 255, 255, 0.38)');
  core.addColorStop(0.42, 'rgba(255, 255, 255, 0.18)');
  core.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2 + rand() * 0.5;
    const dist = (0.05 + rand() * 0.24) * size;
    const x = size * 0.5 + Math.cos(ang) * dist;
    const y = size * 0.5 + Math.sin(ang) * dist;
    const rx = size * (0.14 + rand() * 0.16);
    const ry = size * (0.06 + rand() * 0.10);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 0.28)');
    g.addColorStop(0.55, 'rgba(255, 255, 255, 0.09)');
    g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Dynamic photorealistic portrait-shaded facial texture renderer for Mom.
 * Draws anatomically nuanced eyes, brows, nose shadow, lips & cheeks onto a shared canvas
 * so Mom's face genuinely changes expression based on the dish the child cooked!
 */
export function createMomFaceController() {
  const w = 512, h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  let currentExpr = '';

  function draw(expr = 'watch') {
    if (expr === currentExpr) return;
    currentExpr = expr;

    // Warm lifelike Japanese skin tone base with natural directional facial shading
    const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
    baseGrad.addColorStop(0.0, '#1e130e');
    baseGrad.addColorStop(0.24, '#241711');
    baseGrad.addColorStop(0.32, '#d5a387');
    baseGrad.addColorStop(0.50, '#e6b89c');
    baseGrad.addColorStop(0.76, '#dba88c');
    baseGrad.addColorStop(1.0, '#c69074');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const eyeY = h * 0.49;

    // Subtle temple & jawline contour shading (gives 3D photographic depth instead of flat doll ball!)
    const jawShade = ctx.createRadialGradient(cx, eyeY + 12, 55, cx, eyeY + 12, 130);
    jawShade.addColorStop(0, 'rgba(140, 82, 60, 0)');
    jawShade.addColorStop(1, 'rgba(130, 74, 52, 0.28)');
    ctx.fillStyle = jawShade;
    ctx.fillRect(0, h * 0.28, w, h * 0.72);

    // Feathered chestnut hairline + natural soft temple framing
    ctx.fillStyle = '#22150f';
    ctx.fillRect(0, 0, w, h * 0.30);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.29);
    ctx.lineTo(w, h * 0.29);
    ctx.lineTo(w, h * 0.68);
    ctx.lineTo(cx + 80, h * 0.68);
    ctx.quadraticCurveTo(cx + 72, eyeY - 26, cx + 30, eyeY - 46);
    ctx.quadraticCurveTo(cx - 2, eyeY - 50, cx - 26, eyeY - 40);
    ctx.quadraticCurveTo(cx - 72, eyeY - 24, cx - 80, h * 0.68);
    ctx.lineTo(0, h * 0.68);
    ctx.closePath();
    ctx.fill();

    // Soft side-parted wispy fringe strands
    ctx.strokeStyle = 'rgba(34, 21, 15, 0.65)';
    ctx.lineCap = 'round';
    for (let i = -7; i <= 7; i++) {
      const sx = cx + i * 9.0;
      const len = 14 + Math.abs(i) * 2.0 + ((i * 5) & 3) * 2.5;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(sx, eyeY - 52);
      ctx.quadraticCurveTo(sx + (i < 0 ? -4 : 6), eyeY - 52 + len * 0.55, sx + (i < 0 ? -7 : 9), eyeY - 52 + len);
      ctx.stroke();
    }

    // Cheek warmth (rosier when celebrating/laughing!)
    const blushAlpha = (expr === 'celebrate' || expr === 'burnt_laugh' || expr === 'salty') ? 0.38 : 0.24;
    for (const side of [-1, 1]) {
      const ch = ctx.createRadialGradient(cx + side * 38, eyeY + 25, 4, cx + side * 38, eyeY + 25, 32);
      ch.addColorStop(0, `rgba(216, 118, 104, ${blushAlpha})`);
      ch.addColorStop(1, 'rgba(216, 118, 104, 0)');
      ctx.fillStyle = ch;
      ctx.beginPath();
      ctx.arc(cx + side * 38, eyeY + 25, 32, 0, Math.PI * 2);
      ctx.fill();

      // Subtle eye-socket ambient shadow
      const sock = ctx.createRadialGradient(cx + side * 26, eyeY - 2, 4, cx + side * 26, eyeY - 2, 24);
      sock.addColorStop(0, 'rgba(135, 82, 62, 0.22)');
      sock.addColorStop(1, 'rgba(135, 82, 62, 0)');
      ctx.fillStyle = sock;
      ctx.beginPath();
      ctx.arc(cx + side * 26, eyeY - 2, 24, 0, Math.PI * 2);
      ctx.fill();

      // Natural eyebrows tailored to expression
      ctx.strokeStyle = 'rgba(42, 26, 18, 0.85)';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (expr === 'excited' || expr === 'cold_surprise' || expr === 'burnt_laugh') {
        ctx.moveTo(cx + side * 12, eyeY - 22);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 32, cx + side * 42, eyeY - 21);
      } else if (expr === 'salty') {
        ctx.moveTo(cx + side * 11, eyeY - 15);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 22, cx + side * 42, eyeY - 19);
      } else {
        ctx.moveTo(cx + side * 12, eyeY - 18);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 25, cx + side * 43, eyeY - 16);
      }
      ctx.stroke();

      // Eyes tailored to expression (100% naturalistic portrait rendering — ZERO cartoon/anime symbols!)
      if (expr === 'tasting' || expr === 'celebrate' || expr === 'burnt_laugh') {
        // Warm genuine smiling narrowed/closed eyelids with soft natural shadow & gentle lower lid
        ctx.strokeStyle = 'rgba(135, 82, 62, 0.35)';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(cx + side * 13, eyeY + 3);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 7, cx + side * 41, eyeY + 4);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(30, 18, 12, 0.88)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(cx + side * 13, eyeY + 3);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 8, cx + side * 42, eyeY + 4);
        ctx.stroke();

        // Subtle warm smile crease beneath lower lid
        ctx.strokeStyle = 'rgba(160, 102, 82, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + side * 16, eyeY + 8);
        ctx.quadraticCurveTo(cx + side * 27, eyeY + 5, cx + side * 39, eyeY + 9);
        ctx.stroke();
      } else if (expr === 'salty') {
        // Naturalistic squinting/wincing eyes (soft realistic narrowed almond lid, NO cartoon > < !)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx + side * 13, eyeY + 2);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 4.2, cx + side * 41, eyeY + 1);
        ctx.quadraticCurveTo(cx + side * 27, eyeY + 5.2, cx + side * 13, eyeY + 2);
        ctx.closePath();
        ctx.fillStyle = '#efe7df';
        ctx.fill();
        ctx.clip();

        ctx.fillStyle = '#2d1a10';
        ctx.beginPath();
        ctx.arc(cx + side * 27, eyeY + 1, 6.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3df';
        ctx.beginPath();
        ctx.arc(cx + side * 25, eyeY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = 'rgba(28, 16, 11, 0.86)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(cx + side * 13, eyeY + 2);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - 4.5, cx + side * 41, eyeY + 1);
        ctx.stroke();
      } else {
        // Lifelike open almond eyes (gently brightened when excited/surprised)
        const openH = (expr === 'excited' || expr === 'cold_surprise') ? 11.8 : 9.4;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx + side * 13, eyeY + 1);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - openH, cx + side * 41, eyeY + 1);
        ctx.quadraticCurveTo(cx + side * 27, eyeY + openH * 0.78, cx + side * 13, eyeY + 1);
        ctx.closePath();
        ctx.fillStyle = '#f2ebe3';
        ctx.fill();
        ctx.clip();

        const ix = cx + side * 27;
        const iy = eyeY + 1;
        const irisR = (expr === 'cold_surprise') ? 7.2 : 8.2;
        const irisGrad = ctx.createRadialGradient(ix, iy, 1.8, ix, iy, irisR);
        irisGrad.addColorStop(0, '#140b07');
        irisGrad.addColorStop(0.58, '#3d2415');
        irisGrad.addColorStop(1, '#1e110a');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ix, iy, irisR, 0, Math.PI * 2);
        ctx.fill();

        // Sunset window catchlight
        ctx.fillStyle = '#fff5e2';
        ctx.beginPath();
        ctx.arc(ix - 2.6, iy - 2.4, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Upper lash line & subtle eyelid crease
        ctx.strokeStyle = 'rgba(24, 14, 10, 0.88)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(cx + side * 13, eyeY + 1);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - openH, cx + side * 42, eyeY + 1);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(128, 78, 60, 0.40)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(cx + side * 15, eyeY - openH + 1);
        ctx.quadraticCurveTo(cx + side * 27, eyeY - openH - 5, cx + side * 39, eyeY - openH + 1);
        ctx.stroke();
      }
    }

    // Subtle nose bridge highlight & underside nostril shadow
    const noseHi = ctx.createLinearGradient(cx, eyeY + 2, cx, eyeY + 22);
    noseHi.addColorStop(0, 'rgba(255, 234, 218, 0.22)');
    noseHi.addColorStop(1, 'rgba(255, 234, 218, 0.0)');
    ctx.fillStyle = noseHi;
    ctx.fillRect(cx - 3.5, eyeY + 2, 7, 20);

    const noseShade = ctx.createRadialGradient(cx, eyeY + 25, 2, cx, eyeY + 25, 11);
    noseShade.addColorStop(0, 'rgba(138, 82, 62, 0.28)');
    noseShade.addColorStop(1, 'rgba(138, 82, 62, 0)');
    ctx.fillStyle = noseShade;
    ctx.beginPath();
    ctx.ellipse(cx, eyeY + 25, 10, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth tailored to expression (natural human lips — ZERO cartoon O or wavy lines!)
    const lipY = eyeY + 46;
    if (expr === 'celebrate' || expr === 'burnt_laugh' || expr === 'excited') {
      // Warm natural open joyful smile
      ctx.fillStyle = '#8b3a38';
      ctx.beginPath();
      ctx.moveTo(cx - 20, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY - 4, cx + 20, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY + 17, cx - 20, lipY - 1);
      ctx.fill();
      // Subtle upper teeth highlight
      ctx.fillStyle = '#f4eee6';
      ctx.beginPath();
      ctx.moveTo(cx - 14, lipY);
      ctx.quadraticCurveTo(cx, lipY + 2, cx + 14, lipY);
      ctx.lineTo(cx + 12, lipY + 4);
      ctx.quadraticCurveTo(cx, lipY + 5, cx - 12, lipY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#bc6b63';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(cx - 20, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY - 5, cx + 20, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY + 16, cx - 20, lipY - 1);
      ctx.stroke();
    } else if (expr === 'cold_surprise') {
      // Natural slightly parted surprised lips
      ctx.fillStyle = '#b4625b';
      ctx.beginPath();
      ctx.ellipse(cx, lipY + 2, 11, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6e2e2c';
      ctx.beginPath();
      ctx.ellipse(cx, lipY + 2, 6.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'salty') {
      // Natural wry pursed/amused lip smile
      ctx.fillStyle = '#bc6b63';
      ctx.beginPath();
      ctx.moveTo(cx - 14, lipY + 1);
      ctx.quadraticCurveTo(cx, lipY - 3, cx + 15, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY + 8, cx - 14, lipY + 1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(112, 46, 40, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 13, lipY + 1);
      ctx.quadraticCurveTo(cx, lipY + 3, cx + 14, lipY - 1);
      ctx.stroke();
    } else {
      // Warm loving natural closed smile
      ctx.fillStyle = '#c06f66';
      ctx.beginPath();
      ctx.moveTo(cx - 18, lipY - 1);
      ctx.quadraticCurveTo(cx - 6, lipY - 5, cx, lipY - 3);
      ctx.quadraticCurveTo(cx + 6, lipY - 5, cx + 18, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY + 10, cx - 18, lipY - 1);
      ctx.fill();

      ctx.strokeStyle = 'rgba(114, 46, 40, 0.74)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 17, lipY - 1);
      ctx.quadraticCurveTo(cx, lipY + 6, cx + 17, lipY - 1);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 230, 218, 0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, lipY + 3.5, 6.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    tex.needsUpdate = true;
  }

  draw('watch');
  return { texture: tex, setExpression: draw };
}

/**
 * Silky fine hair strand diffuse & bump textures for Mom's chestnut hair.
 */
export function createHairTextures() {
  const size = 256;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(8181);

  colCtx.fillStyle = '#241711';
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 680; i++) {
    const x = rand() * size;
    const tone = 24 + Math.floor(rand() * 42);
    colCtx.strokeStyle = `rgba(${tone + 20}, ${tone + 6}, ${tone - 4}, 0.55)`;
    colCtx.lineWidth = 0.8 + rand() * 1.4;
    colCtx.beginPath();
    colCtx.moveTo(x, 0);
    colCtx.bezierCurveTo(x + (rand() - 0.5) * 18, size * 0.33, x + (rand() - 0.5) * 18, size * 0.66, x + (rand() - 0.5) * 10, size);
    colCtx.stroke();

    const bv = 85 + Math.floor(rand() * 82);
    bumpCtx.strokeStyle = `rgba(${bv},${bv},${bv},0.48)`;
    bumpCtx.lineWidth = 1.0;
    bumpCtx.beginPath();
    bumpCtx.moveTo(x, 0);
    bumpCtx.lineTo(x, size);
    bumpCtx.stroke();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 2, 2, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 2, 2, false),
  };
}

/**
 * Textured Japanese stoneware glaze.
 */
export function createCeramicTexture(baseHex = '#2c4459', rimHex = '#8a6b4c') {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const rand = seededRand(4409);

  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, baseHex);
  g.addColorStop(0.82, baseHex);
  g.addColorStop(0.92, rimHex);
  g.addColorStop(1, rimHex);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.6 + rand() * 1.8;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(22,16,12,0.24)' : 'rgba(240,234,224,0.14)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTex(new THREE.CanvasTexture(c), 1, 1, true);
}

/**
 * Ultra-dense micro-grained cold white rice bed diffuse + bump textures so rice mounds look finely packed & photoreal!
 */
export function createColdRiceBedTextures() {
  const size = 512;
  const colC = makeCanvas(size, size);
  const bumpC = makeCanvas(size, size);
  const colCtx = colC.getContext('2d');
  const bumpCtx = bumpC.getContext('2d');
  const rand = seededRand(9021);

  colCtx.fillStyle = '#cfc7b8';
  colCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#484848';
  bumpCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const ang = rand() * Math.PI;
    const rx = 5.2 + rand() * 2.2;
    const ry = 2.4 + rand() * 1.0;

    colCtx.save();
    colCtx.translate(x, y);
    colCtx.rotate(ang);
    colCtx.fillStyle = 'rgba(132, 120, 104, 0.36)';
    colCtx.beginPath();
    colCtx.ellipse(1.2, 1.3, rx + 0.6, ry + 0.5, 0, 0, Math.PI * 2);
    colCtx.fill();

    const v = 232 + Math.floor(rand() * 20);
    colCtx.fillStyle = `rgb(${v}, ${v - 3}, ${v - 11})`;
    colCtx.beginPath();
    colCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    colCtx.fill();

    // Subtle specular pearl glint on grain
    colCtx.fillStyle = 'rgba(255, 255, 252, 0.45)';
    colCtx.beginPath();
    colCtx.ellipse(-rx * 0.25, -ry * 0.25, rx * 0.42, ry * 0.35, 0, 0, Math.PI * 2);
    colCtx.fill();
    colCtx.restore();

    bumpCtx.save();
    bumpCtx.translate(x, y);
    bumpCtx.rotate(ang);
    bumpCtx.fillStyle = '#d8d8d8';
    bumpCtx.beginPath();
    bumpCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    bumpCtx.fill();
    bumpCtx.restore();
  }

  return {
    map: configureTex(new THREE.CanvasTexture(colC), 1, 1, true),
    bumpMap: configureTex(new THREE.CanvasTexture(bumpC), 1, 1, false),
  };
}
