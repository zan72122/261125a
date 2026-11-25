import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y, octaves = 4) {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return v;
}

function toTexture(canvas, { repeatX = 1, repeatY = 1, isColor = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a high-contrast night-kitchen equirectangular environment map
 * with a bright tungsten bare-bulb hotspot overhead-back, warm counter bounce,
 * dark cedar walls, and cool moonlit window reflection.
 */
export function createNightKitchenEnvMap(renderer) {
  const w = 512;
  const h = 256;
  const data = new Float32Array(w * h * 4);

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 = top, 1 = bottom
    const theta = v * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let x = 0; x < w; x++) {
      const u = x / w;
      const phi = (u - 0.5) * Math.PI * 2;
      const dx = sinT * Math.sin(phi);
      const dy = cosT;
      const dz = -sinT * Math.cos(phi);

      // Base dark warm night kitchen interior
      let r = 0.045;
      let g = 0.032;
      let b = 0.028;

      // Subtle warm wooden counter bounce from below
      if (dy < 0) {
        const down = Math.min(1, -dy);
        r += down * 0.16;
        g += down * 0.095;
        b += down * 0.048;
      }

      // Warm bare-bulb tungsten glow positioned upper-back-center (0, 0.72, -0.68)
      const bx = 0.0;
      const by = 0.72;
      const bz = -0.68;
      const dotB = Math.max(0, dx * bx + dy * by + dz * bz);
      const bulbCore = Math.pow(dotB, 140) * 18.0;
      const bulbHalo = Math.pow(dotB, 18) * 2.4;
      const bulbAmbient = Math.pow(dotB, 3) * 0.42;

      r += bulbCore * 1.0 + bulbHalo * 1.05 + bulbAmbient * 0.95;
      g += bulbCore * 0.78 + bulbHalo * 0.62 + bulbAmbient * 0.52;
      b += bulbCore * 0.42 + bulbHalo * 0.24 + bulbAmbient * 0.18;

      // Secondary golden oil surface bounce reflection slightly downward-front
      const ox = 0.0;
      const oy = -0.55;
      const oz = 0.45;
      const dotO = Math.max(0, dx * ox + dy * oy + dz * oz);
      const oilBounce = Math.pow(dotO, 6) * 0.35;
      r += oilBounce * 1.1;
      g += oilBounce * 0.68;
      b += oilBounce * 0.2;

      // Cool night window rectangle on back-left (-0.78, 0.25, -0.55)
      const wx = -0.78;
      const wy = 0.22;
      const wz = -0.58;
      const dotW = Math.max(0, dx * wx + dy * wy + dz * wz);
      const winGlow = Math.pow(dotW, 12) * 0.62;
      r += winGlow * 0.22;
      g += winGlow * 0.38;
      b += winGlow * 0.78;

      // Soft warm ceiling light reflection
      const ceil = Math.max(0, dy);
      r += Math.pow(ceil, 4) * 0.22;
      g += Math.pow(ceil, 4) * 0.12;
      b += Math.pow(ceil, 4) * 0.05;

      const idx = (y * w + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 1.0;
    }
  }

  const rawTex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  rawTex.mapping = THREE.EquirectangularReflectionMapping;
  rawTex.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromEquirectangular(rawTex);
  rawTex.dispose();
  pmrem.dispose();
  return envRT.texture;
}

export function createTextures() {
  const textures = {};

  // 1. Aged dark hinoki / walnut kitchen wood counter
  {
    const c = makeCanvas(512, 512);
    const b = makeCanvas(512, 512);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');
    const img = ctx.createImageData(512, 512);
    const bimg = bctx.createImageData(512, 512);

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const nx = x / 512;
        const ny = y / 512;
        const warp = fbm(nx * 3.5, ny * 12.0, 3) * 0.14;
        const grain = Math.sin((ny * 26.0 + warp * 18.0) * Math.PI) * 0.5 + 0.5;
        const fine = fbm(nx * 18, ny * 90, 3);
        const plank = Math.abs(((ny * 4) % 1) - 0.5) > 0.492 ? 0.45 : 1.0;
        const shade = (0.55 + grain * 0.32 + fine * 0.18) * plank;

        const i = (y * 512 + x) * 4;
        img.data[i] = Math.min(255, Math.floor(86 * shade));
        img.data[i + 1] = Math.min(255, Math.floor(54 * shade));
        img.data[i + 2] = Math.min(255, Math.floor(34 * shade));
        img.data[i + 3] = 255;

        const bv = Math.floor((grain * 0.5 + fine * 0.5) * plank * 255);
        bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv;
        bimg.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bimg, 0, 0);
    textures.woodColor = toTexture(c, { repeatX: 2, repeatY: 2, isColor: true });
    textures.woodBump = toTexture(b, { repeatX: 2, repeatY: 2, isColor: false });
  }

  // 2. Dark handmade glazed Japanese ceramic kitchen wall tiles
  {
    const c = makeCanvas(512, 512);
    const b = makeCanvas(512, 512);
    const r = makeCanvas(512, 512);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');
    const rctx = r.getContext('2d');

    ctx.fillStyle = '#151210';
    ctx.fillRect(0, 0, 512, 512);
    bctx.fillStyle = '#1c1c1c';
    bctx.fillRect(0, 0, 512, 512);
    rctx.fillStyle = '#d8d8d8';
    rctx.fillRect(0, 0, 512, 512);

    const cols = 4;
    const rows = 8;
    const tw = 512 / cols;
    const th = 512 / rows;
    const grout = 4;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (tw * 0.5);
      for (let col = -1; col <= cols; col++) {
        const x = col * tw + offset + grout * 0.5;
        const y = row * th + grout * 0.5;
        const w = tw - grout;
        const h = th - grout;
        const n = hash2(col + 13, row + 7);
        const cr = Math.floor(32 + n * 16);
        const cg = Math.floor(29 + n * 14);
        const cb = Math.floor(27 + n * 13);

        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, `rgb(${cr + 9},${cg + 8},${cb + 7})`);
        grad.addColorStop(0.5, `rgb(${cr},${cg},${cb})`);
        grad.addColorStop(1, `rgb(${cr - 6},${cg - 6},${cb - 5})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Subtle handmade glaze pillowing in bump
        const bgrad = bctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 4, x + w * 0.5, y + h * 0.5, w * 0.65);
        bgrad.addColorStop(0, '#f2f2f2');
        bgrad.addColorStop(0.85, '#b8b8b8');
        bgrad.addColorStop(1, '#585858');
        bctx.fillStyle = bgrad;
        bctx.fillRect(x, y, w, h);

        // Glossy glaze center, rougher edges
        const rv = Math.floor(28 + n * 35);
        rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
        rctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
    }
    textures.tileColor = toTexture(c, { repeatX: 3.5, repeatY: 2.2, isColor: true });
    textures.tileBump = toTexture(b, { repeatX: 3.5, repeatY: 2.2, isColor: false });
    textures.tileRough = toTexture(r, { repeatX: 3.5, repeatY: 2.2, isColor: false });
  }

  // 3. Hammered copper-brass / cast iron tempura pot texture (uchidashi dimples)
  {
    const c = makeCanvas(512, 512);
    const b = makeCanvas(512, 512);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');

    ctx.fillStyle = '#4e3521';
    ctx.fillRect(0, 0, 512, 512);
    bctx.fillStyle = '#909090';
    bctx.fillRect(0, 0, 512, 512);

    // Hammered dimples
    for (let i = 0; i < 650; i++) {
      const px = hash2(i, 1.3) * 512;
      const py = hash2(i, 7.9) * 512;
      const rad = 10 + hash2(i, 3.1) * 14;
      const shade = hash2(i, 5.5);

      const g = ctx.createRadialGradient(px - rad * 0.25, py - rad * 0.25, 1, px, py, rad);
      const rVal = Math.floor(110 + shade * 42);
      const gVal = Math.floor(72 + shade * 28);
      const bVal = Math.floor(38 + shade * 16);
      g.addColorStop(0, `rgba(${rVal + 24},${gVal + 16},${bVal + 10},0.45)`);
      g.addColorStop(0.7, `rgba(${rVal},${gVal},${bVal},0.35)`);
      g.addColorStop(1, 'rgba(32,20,12,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();

      const bg = bctx.createRadialGradient(px, py, 1, px, py, rad);
      bg.addColorStop(0, 'rgba(70,70,70,0.65)');
      bg.addColorStop(0.75, 'rgba(180,180,180,0.45)');
      bg.addColorStop(1, 'rgba(144,144,144,0)');
      bctx.fillStyle = bg;
      bctx.beginPath();
      bctx.arc(px, py, rad, 0, Math.PI * 2);
      bctx.fill();
    }
    textures.potColor = toTexture(c, { repeatX: 3, repeatY: 1, isColor: true });
    textures.potBump = toTexture(b, { repeatX: 3, repeatY: 1, isColor: false });
  }

  // 4. Woven bamboo zaru tray texture
  {
    const c = makeCanvas(512, 512);
    const b = makeCanvas(512, 512);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');

    ctx.fillStyle = '#3b2c1a';
    ctx.fillRect(0, 0, 512, 512);
    bctx.fillStyle = '#303030';
    bctx.fillRect(0, 0, 512, 512);

    const step = 24;
    for (let y = 0; y < 512; y += step) {
      for (let x = 0; x < 512; x += step) {
        const horiz = ((Math.floor(x / step) + Math.floor(y / step)) % 2) === 0;
        const n = hash2(x * 0.1, y * 0.1);
        const r = Math.floor(164 + n * 28);
        const g = Math.floor(132 + n * 24);
        const bl = Math.floor(82 + n * 18);

        if (horiz) {
          const gr = ctx.createLinearGradient(x, y, x, y + step);
          gr.addColorStop(0, `rgb(${r - 36},${g - 32},${bl - 22})`);
          gr.addColorStop(0.5, `rgb(${r + 12},${g + 10},${bl + 6})`);
          gr.addColorStop(1, `rgb(${r - 36},${g - 32},${bl - 22})`);
          ctx.fillStyle = gr;
          ctx.fillRect(x, y + 2, step, step - 4);

          bctx.fillStyle = '#d8d8d8';
          bctx.fillRect(x, y + 3, step, step - 6);
        } else {
          const gr = ctx.createLinearGradient(x, y, x + step, y);
          gr.addColorStop(0, `rgb(${r - 36},${g - 32},${bl - 22})`);
          gr.addColorStop(0.5, `rgb(${r + 8},${g + 8},${bl + 5})`);
          gr.addColorStop(1, `rgb(${r - 36},${g - 32},${bl - 22})`);
          ctx.fillStyle = gr;
          ctx.fillRect(x + 2, y, step - 4, step);

          bctx.fillStyle = '#b4b4b4';
          bctx.fillRect(x + 3, y, step - 6, step);
        }
      }
    }
    textures.bambooColor = toTexture(c, { repeatX: 2, repeatY: 2, isColor: true });
    textures.bambooBump = toTexture(b, { repeatX: 2, repeatY: 2, isColor: false });
  }

  // 5. Crispy porous tempura batter bump & albedo
  {
    const c = makeCanvas(512, 512);
    const b = makeCanvas(512, 512);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');
    const img = ctx.createImageData(512, 512);
    const bimg = bctx.createImageData(512, 512);

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const nx = x / 512;
        const ny = y / 512;
        const n1 = fbm(nx * 14, ny * 14, 4);
        const n2 = fbm(nx * 36 + 7.1, ny * 36 + 2.3, 3);
        const pore = Math.pow(Math.max(0, 1 - Math.abs(n2 - 0.5) * 4.2), 2);
        const crisp = Math.min(1, Math.max(0, n1 * 0.72 + n2 * 0.35 - pore * 0.35));

        const i = (y * 512 + x) * 4;
        // Neutral bright creamy base so material color tint smoothly drives frying color
        const val = Math.floor(205 + crisp * 50);
        img.data[i] = Math.min(255, val);
        img.data[i + 1] = Math.min(255, Math.floor(val * 0.96));
        img.data[i + 2] = Math.min(255, Math.floor(val * 0.86));
        img.data[i + 3] = 255;

        const bv = Math.floor(crisp * 255);
        bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv;
        bimg.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bimg, 0, 0);
    textures.batterColor = toTexture(c, { repeatX: 2, repeatY: 2, isColor: true });
    textures.batterBump = toTexture(b, { repeatX: 2, repeatY: 2, isColor: false });
  }

  // 6. Photorealistic Raw Kuruma-Ebi Shrimp Flesh Texture (glassy pearlescent ivory-grey, subtle organic dorsal marbling — NO candy stripes!)
  {
    const c = makeCanvas(512, 256);
    const b = makeCanvas(512, 256);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');

    // Cool glassy translucent pearlescent raw shrimp flesh gradient -> warm coral tint ONLY near tail joint!
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, '#dfd6ce');
    grad.addColorStop(0.45, '#d8cec6');
    grad.addColorStop(0.76, '#d9beb4');
    grad.addColorStop(0.92, '#d18d76');
    grad.addColorStop(1.0, '#ba4c34');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 512, 256);

    // Organic fine muscle fibers & translucent marbling
    for (let i = 0; i < 600; i++) {
      const px = hash2(i, 1.9) * 512;
      const py = hash2(i, 5.3) * 256;
      const rx = 6 + hash2(i, 8.1) * 18;
      const ry = 2 + hash2(i, 3.7) * 5;
      ctx.fillStyle = hash2(i, 4.4) > 0.5 ? 'rgba(255,248,242,0.14)' : 'rgba(170,136,124,0.10)';
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Very delicate natural anatomical somite overlaps (soft subtle shadow + pearlescent edge, NOT painted red bars!)
    for (let s = 0; s < 6; s++) {
      const sx = 46 + s * 70;
      const g = ctx.createLinearGradient(sx - 18, 0, sx + 18, 0);
      g.addColorStop(0, 'rgba(196, 134, 114, 0)');
      g.addColorStop(0.42, 'rgba(186, 112, 92, 0.24)');
      g.addColorStop(0.55, 'rgba(248, 236, 228, 0.28)');
      g.addColorStop(1, 'rgba(196, 134, 114, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 18, 0, 36, 256);

      // Subtle dorsal pigmentation freckles along top midline (y ~ 64 in cylindrical UV)
      for (let f = 0; f < 16; f++) {
        const fx = sx + (hash2(s * 20 + f, 2.1) - 0.5) * 26;
        const fy = 45 + hash2(s * 20 + f, 7.4) * 55;
        ctx.fillStyle = 'rgba(145, 72, 54, 0.16)';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.5 + hash2(f, 9.2) * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const bg = bctx.createLinearGradient(sx - 14, 0, sx + 14, 0);
      bg.addColorStop(0, 'rgba(128,128,128,0)');
      bg.addColorStop(0.46, 'rgba(220,220,220,0.65)');
      bg.addColorStop(0.72, 'rgba(60,60,60,0.65)');
      bg.addColorStop(1, 'rgba(128,128,128,0)');
      bctx.fillStyle = bg;
      bctx.fillRect(sx - 14, 0, 28, 256);
    }

    // Fine translucent shrimp tail-fin striated texture
    const tc = makeCanvas(128, 128);
    const tctx = tc.getContext('2d');
    const tg = tctx.createLinearGradient(0, 0, 128, 0);
    tg.addColorStop(0.0, '#d89a7a');
    tg.addColorStop(0.45, '#c95432');
    tg.addColorStop(0.82, '#a82c1a');
    tg.addColorStop(1.0, '#6b1c14');
    tctx.fillStyle = tg;
    tctx.fillRect(0, 0, 128, 128);
    tctx.strokeStyle = 'rgba(255,210,180,0.28)';
    tctx.lineWidth = 1.2;
    for (let r = 0; r < 14; r++) {
      tctx.beginPath();
      tctx.moveTo(0, 64);
      tctx.lineTo(128, (r / 13) * 128);
      tctx.stroke();
    }
    textures.shrimpTail = toTexture(tc, { isColor: true });

    textures.shrimpColor = toTexture(c, { isColor: true });
    textures.shrimpBump = toTexture(b, { isColor: false });
  }

  // 7. Handmade dark ceramic glaze (stoneware plate & bowls)
  {
    const c = makeCanvas(512, 512);
    const b = makeCanvas(512, 512);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');
    const img = ctx.createImageData(512, 512);
    const bimg = bctx.createImageData(512, 512);

    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const dx = (x - 256) / 256;
        const dy = (y - 256) / 256;
        const rad = Math.sqrt(dx * dx + dy * dy);
        const rings = Math.sin(rad * 48) * 0.5 + 0.5;
        const speck = fbm(x / 22, y / 22, 3);
        const ironSpot = hash2(Math.floor(x / 3), Math.floor(y / 3)) > 0.97 ? 0.55 : 0;

        const base = 36 + rings * 10 + speck * 16 - ironSpot * 20;
        const i = (y * 512 + x) * 4;
        img.data[i] = Math.max(12, Math.floor(base * 0.98));
        img.data[i + 1] = Math.max(12, Math.floor(base * 1.03));
        img.data[i + 2] = Math.max(12, Math.floor(base * 1.06));
        img.data[i + 3] = 255;

        const bv = Math.floor(110 + rings * 55 + speck * 45);
        bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv;
        bimg.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    bctx.putImageData(bimg, 0, 0);
    textures.ceramicColor = toTexture(c, { isColor: true });
    textures.ceramicBump = toTexture(b, { isColor: false });
  }

  // 8. Shiso leaf botanical vein texture
  {
    const c = makeCanvas(256, 256);
    const b = makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');

    ctx.fillStyle = '#2c6829';
    ctx.fillRect(0, 0, 256, 256);
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 256, 256);

    // Leaf cellular wrinkle noise
    for (let i = 0; i < 900; i++) {
      const px = hash2(i, 2.1) * 256;
      const py = hash2(i, 8.7) * 256;
      const rad = 3 + hash2(i, 4.4) * 6;
      ctx.fillStyle = hash2(i, 9.1) > 0.5 ? 'rgba(65,126,52,0.22)' : 'rgba(24,62,22,0.22)';
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();

      bctx.fillStyle = hash2(i, 9.1) > 0.5 ? 'rgba(175,175,175,0.28)' : 'rgba(85,85,85,0.28)';
      bctx.beginPath();
      bctx.arc(px, py, rad, 0, Math.PI * 2);
      bctx.fill();
    }

    // Main central vein + side veins
    ctx.strokeStyle = '#538c43';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 250);
    ctx.lineTo(128, 12);
    ctx.stroke();

    bctx.strokeStyle = '#ececec';
    bctx.lineWidth = 5;
    bctx.beginPath();
    bctx.moveTo(128, 250);
    bctx.lineTo(128, 12);
    bctx.stroke();

    for (let v = 0; v < 7; v++) {
      const y0 = 220 - v * 28;
      for (const dir of [-1, 1]) {
        ctx.strokeStyle = 'rgba(98,150,74,0.75)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(128, y0);
        ctx.quadraticCurveTo(128 + dir * 48, y0 - 16, 128 + dir * 102, y0 - 44);
        ctx.stroke();

        bctx.strokeStyle = 'rgba(225,225,225,0.75)';
        bctx.lineWidth = 3;
        bctx.beginPath();
        bctx.moveTo(128, y0);
        bctx.quadraticCurveTo(128 + dir * 48, y0 - 16, 128 + dir * 102, y0 - 44);
        bctx.stroke();
      }
    }
    textures.shisoColor = toTexture(c, { isColor: true });
    textures.shisoBump = toTexture(b, { isColor: false });
  }

  // 9. Soft radial sprite texture for steam, foam bubbles, glow halo
  {
    const c = makeCanvas(128, 128);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.32, 'rgba(255,248,236,0.68)');
    g.addColorStop(0.68, 'rgba(255,232,202,0.18)');
    g.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    textures.softGlow = toTexture(c, { isColor: true });
    textures.softGlow.wrapS = THREE.ClampToEdgeWrapping;
    textures.softGlow.wrapT = THREE.ClampToEdgeWrapping;
  }

  // 10. Translucent glistening micro-bubble oil-film sprite (thin warm rim + crisp highlight, NOT opaque white circle!)
  {
    const c = makeCanvas(128, 128);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(58, 56, 8, 64, 64, 56);
    g.addColorStop(0, 'rgba(255,244,210,0.06)');
    g.addColorStop(0.62, 'rgba(255,236,188,0.12)');
    g.addColorStop(0.84, 'rgba(255,248,225,0.68)');
    g.addColorStop(0.94, 'rgba(255,220,152,0.28)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    // Tiny sharp liquid specular catchlight
    ctx.fillStyle = 'rgba(255,253,242,0.92)';
    ctx.beginPath();
    ctx.arc(46, 44, 7, 0, Math.PI * 2);
    ctx.fill();

    textures.bubbleSprite = toTexture(c, { isColor: true });
    textures.bubbleSprite.wrapS = THREE.ClampToEdgeWrapping;
    textures.bubbleSprite.wrapT = THREE.ClampToEdgeWrapping;
  }

  // 11. Linen apron fabric texture for Mama
  {
    const c = makeCanvas(256, 256);
    const b = makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    const bctx = b.getContext('2d');
    ctx.fillStyle = '#c8b9a4';
    ctx.fillRect(0, 0, 256, 256);
    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(150,134,112,0.25)' : 'rgba(240,232,218,0.18)';
      ctx.fillRect(0, y, 256, 1.5);
      bctx.fillStyle = y % 6 === 0 ? 'rgba(60,60,60,0.45)' : 'rgba(195,195,195,0.45)';
      bctx.fillRect(0, y, 256, 1.5);
    }
    for (let x = 0; x < 256; x += 3) {
      ctx.fillStyle = x % 6 === 0 ? 'rgba(145,128,108,0.22)' : 'rgba(245,238,225,0.15)';
      ctx.fillRect(x, 0, 1.5, 256);
      bctx.fillStyle = x % 6 === 0 ? 'rgba(60,60,60,0.45)' : 'rgba(195,195,195,0.45)';
      bctx.fillRect(x, 0, 1.5, 256);
    }
    textures.linenColor = toTexture(c, { repeatX: 4, repeatY: 4, isColor: true });
    textures.linenBump = toTexture(b, { repeatX: 4, repeatY: 4, isColor: false });
  }

  // 12. Real vegetable cross-section & rind procedural textures (kabocha, nasu, renkon, porous batter lace)
  {
    // 12a. Fibrous Kabocha pumpkin flesh texture
    const kc = makeCanvas(256, 256);
    const kctx = kc.getContext('2d');
    const kgrad = kctx.createRadialGradient(128, 168, 12, 128, 128, 140);
    kgrad.addColorStop(0, '#f4a226');
    kgrad.addColorStop(0.7, '#e27d16');
    kgrad.addColorStop(1, '#c46210');
    kctx.fillStyle = kgrad;
    kctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 420; i++) {
      const ang = hash2(i, 1.3) * Math.PI * 2;
      const r0 = 18 + hash2(i, 4.1) * 95;
      const len = 10 + hash2(i, 7.2) * 26;
      kctx.strokeStyle = hash2(i, 9.1) > 0.5 ? 'rgba(255,212,115,0.22)' : 'rgba(165,78,12,0.18)';
      kctx.lineWidth = 1.4;
      kctx.beginPath();
      kctx.moveTo(128 + Math.cos(ang) * r0, 148 + Math.sin(ang) * r0);
      kctx.lineTo(128 + Math.cos(ang) * (r0 + len), 148 + Math.sin(ang) * (r0 + len));
      kctx.stroke();
    }
    textures.kabochaFlesh = toTexture(kc, { isColor: true });

    // 12b. Mottled dark-green Kabocha bumpy rind
    const rc = makeCanvas(256, 256);
    const rctx = rc.getContext('2d');
    rctx.fillStyle = '#1b381d';
    rctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 240; i++) {
      const px = hash2(i, 2.2) * 256;
      const py = hash2(i, 6.4) * 256;
      const rad = 4 + hash2(i, 8.1) * 14;
      rctx.fillStyle = hash2(i, 3.7) > 0.35 ? 'rgba(62,102,48,0.28)' : 'rgba(18,36,16,0.38)';
      rctx.beginPath();
      rctx.ellipse(px, py, rad, rad * 0.55, hash2(i, 5.1) * 3, 0, Math.PI * 2);
      rctx.fill();
    }
    textures.kabochaRind = toTexture(rc, { isColor: true });

    // 12c. Seed-speckled spongy pale Nasu (eggplant) interior flesh
    const nc = makeCanvas(256, 256);
    const nctx = nc.getContext('2d');
    nctx.fillStyle = '#e7e2c7';
    nctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 650; i++) {
      const px = hash2(i, 1.8) * 256;
      const py = hash2(i, 5.9) * 256;
      nctx.fillStyle = hash2(i, 7.3) > 0.72 ? 'rgba(162,148,96,0.34)' : 'rgba(210,206,174,0.32)';
      nctx.beginPath();
      nctx.ellipse(px, py, 2.2, 1.3, hash2(i, 2.1) * 3, 0, Math.PI * 2);
      nctx.fill();
    }
    textures.nasuFlesh = toTexture(nc, { isColor: true });

    // 12d. Starchy crisp Renkon (lotus root) cross-section with subtle radial vascular fibers
    const lc = makeCanvas(256, 256);
    const lctx = lc.getContext('2d');
    const lg = lctx.createRadialGradient(128, 128, 8, 128, 128, 128);
    lg.addColorStop(0, '#eee4cf');
    lg.addColorStop(0.84, '#e3d4b8');
    lg.addColorStop(1, '#ba9d76');
    lctx.fillStyle = lg;
    lctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
      const a = hash2(i, 3.1) * Math.PI * 2;
      const r0 = 20 + hash2(i, 5.2) * 90;
      lctx.strokeStyle = 'rgba(176,154,120,0.22)';
      lctx.lineWidth = 1;
      lctx.beginPath();
      lctx.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
      lctx.lineTo(128 + Math.cos(a) * (r0 + 18), 128 + Math.sin(a) * (r0 + 18));
      lctx.stroke();
    }
    textures.renkonFlesh = toTexture(lc, { isColor: true });

    // 12e. Delicate porous lace alpha/roughness map for thin translucent tempura batter (usugoromo)
    const bc = makeCanvas(256, 256);
    const bctx = bc.getContext('2d');
    const bimg = bctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const n1 = fbm((x / 256) * 16, (y / 256) * 16, 4);
        const n2 = fbm((x / 256) * 42 + 4.3, (y / 256) * 42 + 9.1, 3);
        // Crispy lace webs with micro pores
        const web = Math.min(1, Math.max(0, (n1 * 0.68 + n2 * 0.42 - 0.14) * 1.45));
        const v = Math.floor(web * 255);
        const idx = (y * 256 + x) * 4;
        bimg.data[idx] = bimg.data[idx + 1] = bimg.data[idx + 2] = v;
        bimg.data[idx + 3] = 255;
      }
    }
    bctx.putImageData(bimg, 0, 0);
    textures.batterLace = toTexture(bc, { repeatX: 2.5, repeatY: 2.5, isColor: false });

    // 12f. Bubbly oil-film foam ring texture for active frying waterline
    const fc = makeCanvas(256, 256);
    const fctx = fc.getContext('2d');
    fctx.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 340; i++) {
      const ang = hash2(i, 2.3) * Math.PI * 2;
      const rad = 52 + (hash2(i, 6.1) - 0.5) * 56;
      const bx = 128 + Math.cos(ang) * rad;
      const by = 128 + Math.sin(ang) * rad;
      const br = 2.0 + Math.pow(hash2(i, 8.9), 2.2) * 11.0;
      const bg = fctx.createRadialGradient(bx - br * 0.2, by - br * 0.2, 0.5, bx, by, br);
      bg.addColorStop(0, 'rgba(255,248,224,0.14)');
      bg.addColorStop(0.7, 'rgba(255,242,204,0.52)');
      bg.addColorStop(0.92, 'rgba(255,232,174,0.22)');
      bg.addColorStop(1, 'rgba(255,220,150,0)');
      fctx.fillStyle = bg;
      fctx.beginPath();
      fctx.arc(bx, by, br, 0, Math.PI * 2);
      fctx.fill();
    }
    textures.fryFoamRing = toTexture(fc, { isColor: true });
    textures.fryFoamRing.wrapS = THREE.ClampToEdgeWrapping;
    textures.fryFoamRing.wrapT = THREE.ClampToEdgeWrapping;
  }

  return textures;
}

/**
 * Dynamic canvas texture for the white folded washi paper (ten-shi) on the plate,
 * which gradually absorbs translucent warm oil blotches wherever fried tempura rests!
 */
export function createWashiPaperTexture() {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');

  function drawBase() {
    ctx.fillStyle = '#f3ede1';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle organic washi mulberry fibers
    for (let i = 0; i < 420; i++) {
      const x = hash2(i, 1.7) * 512;
      const y = hash2(i, 4.9) * 512;
      const len = 8 + hash2(i, 8.2) * 26;
      const ang = hash2(i, 2.8) * Math.PI * 2;
      ctx.strokeStyle = hash2(i, 5.1) > 0.5 ? 'rgba(255,253,248,0.55)' : 'rgba(218,205,184,0.38)';
      ctx.lineWidth = 0.8 + hash2(i, 9.4) * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Subtle diagonal fold crease
    ctx.strokeStyle = 'rgba(185,172,152,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(512, 0);
    ctx.stroke();
  }

  drawBase();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  return {
    texture: tex,
    addOilSpot(u, v, radius = 44, strength = 0.24) {
      const px = u * 512;
      const py = (1 - v) * 512;
      const g = ctx.createRadialGradient(px, py, 4, px, py, radius);
      g.addColorStop(0, `rgba(188, 150, 92, ${strength})`);
      g.addColorStop(0.65, `rgba(202, 168, 112, ${strength * 0.55})`);
      g.addColorStop(1, 'rgba(220, 195, 145, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      tex.needsUpdate = true;
    },
    addTentsuyuSpot(u, v, radius = 34) {
      const px = u * 512;
      const py = (1 - v) * 512;
      const g = ctx.createRadialGradient(px, py, 2, px, py, radius);
      g.addColorStop(0, 'rgba(84, 46, 20, 0.36)');
      g.addColorStop(0.7, 'rgba(116, 68, 32, 0.18)');
      g.addColorStop(1, 'rgba(140, 88, 44, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      tex.needsUpdate = true;
    },
    reset() {
      drawBase();
      tex.needsUpdate = true;
    },
  };
}
