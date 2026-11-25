import * as THREE from 'three';

const MAX_RIPPLES = 12;

/**
 * Photorealistic dynamic oil surface with concentric expanding ripples,
 * heat convection shimmer, translucent golden-amber depth, and bare-bulb specular glints.
 */
export function createOilSurface(radius, bulbWorldPos) {
  const geo = new THREE.CircleGeometry(radius, 64);
  // Add radial rings by using RingGeometry or subdividing via Plane/Cylinder cap;
  // CylinderGeometry top cap isn't subdivided radially, so build a clean polar grid!
  geo.dispose();

  const rings = 30;
  const segs = 84; // Ultra-smooth circular meniscus along copper pot inner wall (ZERO sawtooth rim artifacts!)
  const positions = [];
  const uvs = [];
  const indices = [];

  positions.push(0, 0, 0);
  uvs.push(0.5, 0.5);

  for (let r = 1; r <= rings; r++) {
    const frac = r / rings;
    // Extend outer ring by +0.007 tucked cleanly inside opaque hammered pot wall so rim never shows gaps or sawtooth!
    const rad = frac * (radius + 0.007);
    for (let s = 0; s < segs; s++) {
      const ang = (s / segs) * Math.PI * 2;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      positions.push(x, 0, z);
      uvs.push(0.5 + (x / (radius * 2)), 0.5 + (z / (radius * 2)));
    }
  }

  // Center fan
  for (let s = 0; s < segs; s++) {
    const next = (s + 1) % segs;
    indices.push(0, 1 + next, 1 + s);
  }
  // Outer rings
  for (let r = 1; r < rings; r++) {
    const rowA = 1 + (r - 1) * segs;
    const rowB = 1 + r * segs;
    for (let s = 0; s < segs; s++) {
      const next = (s + 1) % segs;
      indices.push(rowA + s, rowA + next, rowB + next);
      indices.push(rowA + s, rowB + next, rowB + s);
    }
  }

  const polarGeo = new THREE.BufferGeometry();
  polarGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  polarGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  polarGeo.setIndex(indices);
  polarGeo.computeVertexNormals();

  const rippleOrigins = [];
  const rippleParams = [];
  for (let i = 0; i < MAX_RIPPLES; i++) {
    rippleOrigins.push(new THREE.Vector2(0, 0));
    // x: startTime, y: amplitude, z: speed, w: frequency
    rippleParams.push(new THREE.Vector4(-999, 0, 1.4, 24.0));
  }

  const uniforms = {
    uTime: { value: 0 },
    uHeat: { value: 0.72 },
    uRadius: { value: radius },
    uBulbPos: { value: bulbWorldPos.clone() },
    uRippleOrigins: { value: rippleOrigins },
    uRippleParams: { value: rippleParams },
    uActiveFryCount: { value: 0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uHeat;
      uniform float uRadius;
      uniform vec2 uRippleOrigins[${MAX_RIPPLES}];
      uniform vec4 uRippleParams[${MAX_RIPPLES}];
      uniform float uActiveFryCount;

      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vLocalXZ;
      varying float vWaveEnergy;

      float waveHeight(vec2 p) {
        // Living thermal oil convection + visible concentric ripple waves
        float h = sin(p.x * 20.0 + uTime * 2.4) * cos(p.y * 19.0 - uTime * 2.1) * 0.0028 * (0.55 + uHeat);
        h += sin(length(p) * 32.0 - uTime * 3.6) * 0.0018 * (0.45 + uActiveFryCount * 0.4);

        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          vec4 prm = uRippleParams[i];
          float age = uTime - prm.x;
          if (age > 0.0 && age < 2.8 && prm.y > 0.0001) {
            float d = length(p - uRippleOrigins[i]);
            float front = age * prm.z;
            float env = exp(-age * 1.25) * exp(-abs(d - front) * 4.2);
            h += sin((d - front) * prm.w) * prm.y * 1.35 * env;
          }
        }
        // Smoothly damp waves completely to 0 well before the pot wall so rim is 100% smooth circular meniscus!
        float rim = smoothstep(uRadius * 0.92, uRadius * 0.68, length(p));
        return h * rim * rim;
      }

      void main() {
        vec2 p = position.xz;
        float h = waveHeight(p);
        float eps = 0.012;
        float hx = waveHeight(p + vec2(eps, 0.0));
        float hz = waveHeight(p + vec2(0.0, eps));

        vec3 nLocal = normalize(vec3(h - hx, eps, h - hz));
        vec3 displaced = vec3(position.x, position.y + h, position.z);
        vec4 wp = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * nLocal);
        vLocalXZ = p;
        vWaveEnergy = abs(h) * 38.0;

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHeat;
      uniform float uRadius;
      uniform vec3 uBulbPos;
      uniform float uActiveFryCount;

      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vLocalXZ;
      varying float vWaveEnergy;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uBulbPos - vWorldPos);
        vec3 H = normalize(L + V);

        // Micro surface oil ripples driven by heat + frying
        vec2 uv = vLocalXZ * 6.5;
        float n1 = noise(uv + vec2(uTime * 0.65, -uTime * 0.5));
        float n2 = noise(uv * 2.6 - vec2(uTime * 1.0, uTime * 0.75));
        float micro = (n1 * 0.55 + n2 * 0.45) - 0.5;
        vec3 microN = normalize(N + vec3(micro * 0.22, 0.0, (n2 - 0.5) * 0.22));

        // Rich, glossy deep sesame/canola amber oil (rich golden-amber liquid, crisp wave highlights!)
        float rNorm = clamp(length(vLocalXZ) / uRadius, 0.0, 1.0);
        vec3 deepAmber = vec3(0.055, 0.020, 0.002);
        vec3 goldenOil = vec3(0.24, 0.105, 0.008);
        vec3 hotCenter = vec3(0.42, 0.20, 0.018);

        float caustic = noise(vLocalXZ * 10.5 + vec2(uTime * 0.55, uTime * 0.38));
        float caustic2 = noise(vLocalXZ * 17.0 - vec2(uTime * 0.7, -uTime * 0.5));
        float causticPattern = smoothstep(0.36, 0.86, caustic * caustic2 * 2.1);

        vec3 baseCol = mix(goldenOil, deepAmber, smoothstep(0.22, 0.96, rNorm));
        baseCol = mix(baseCol, hotCenter, causticPattern * 0.36 * (0.55 + uHeat * 0.45));

        // Subtle dark reflective kitchen ceiling + crisp golden rim meniscus
        float fresnel = pow(1.0 - max(dot(microN, V), 0.0), 3.6);
        vec3 darkKitchenRefl = vec3(0.04, 0.028, 0.018);
        vec3 warmBulbRefl = vec3(0.86, 0.48, 0.11);

        // Razor-sharp shimmering bare-bulb specular path across liquid ripple crests!
        float specPin = pow(max(dot(microN, H), 0.0), 340.0) * 4.2;
        float specRibbon = pow(max(dot(N, H), 0.0), 115.0) * (0.65 + vWaveEnergy * 2.8);
        float specWarm = pow(max(dot(microN, H), 0.0), 28.0) * 0.18;

        // Concentric wave crest bright golden rim so ripples are dramatically visible
        float waveCrest = clamp(vWaveEnergy * 0.65, 0.0, 1.0);
        float meniscus = smoothstep(0.92, 0.994, rNorm) * 0.48;

        vec3 col = mix(baseCol, mix(darkKitchenRefl, warmBulbRefl, 0.28), fresnel * 0.58);
        col += vec3(1.0, 0.85, 0.48) * (specPin + specRibbon);
        col += vec3(0.92, 0.52, 0.12) * (specWarm + meniscus + waveCrest * 0.42);

        // Translucent deep golden oil so submerged parts glow richly beneath the surface
        float alpha = mix(0.72, 0.95, smoothstep(0.22, 0.95, rNorm));
        alpha = clamp(alpha + fresnel * 0.16 + specPin * 0.18, 0.72, 0.97);

        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(polarGeo, mat);
  mesh.renderOrder = 2;

  let rippleCursor = 0;

  return {
    mesh,
    uniforms,
    addRipple(localX, localZ, amplitude = 0.018, speed = 1.45, freq = 26.0) {
      const idx = rippleCursor % MAX_RIPPLES;
      rippleCursor++;
      rippleOrigins[idx].set(localX, localZ);
      rippleParams[idx].set(uniforms.uTime.value, amplitude, speed, freq);
    },
    update(dt, heat, activeFryCount) {
      uniforms.uTime.value += dt;
      uniforms.uHeat.value = heat;
      uniforms.uActiveFryCount.value = activeFryCount;
    },
  };
}

/**
 * Multi-purpose GPU-friendly particle & instanced effects manager:
 * - Frying micro-bubbles & foaming collar particles
 * - Rising backlit translucent steam wisps
 * - Floating crispy golden tenkasu (batter droplets)
 * - Falling sparkling sea-salt crystals & oil drips
 */
export class TempuraFX {
  constructor(scene, textures, potCenter, oilY, potRadius) {
    this.scene = scene;
    this.potCenter = potCenter.clone();
    this.oilY = oilY;
    this.potRadius = potRadius;

    // 1. Frying oil micro-bubbles (dense fizzy golden-white foam clusters!)
    this.maxBubbles = 360;
    this.bubbles = [];
    this.bubblePos = new Float32Array(this.maxBubbles * 3);
    this.bubbleSize = new Float32Array(this.maxBubbles);
    this.bubbleAlpha = new Float32Array(this.maxBubbles);

    for (let i = 0; i < this.maxBubbles; i++) {
      this.bubbles.push({
        active: false,
        x: 0, y: -10, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0, life: 1,
        baseSize: 18,
      });
      this.bubblePos[i * 3 + 1] = -10;
    }

    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(this.bubblePos, 3));
    bGeo.setAttribute('aSize', new THREE.BufferAttribute(this.bubbleSize, 1));
    bGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.bubbleAlpha, 1));

    const bMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: textures.bubbleSprite },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (1.8 / max(0.3, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float a = t.a * vAlpha * 0.72;
          if (a < 0.015) discard;
          // Translucent amber-gold oil-film micro-bubbles with warm backlit specular rim (NOT opaque white snow dots!)
          vec3 col = mix(vec3(0.95, 0.76, 0.42), vec3(1.0, 0.97, 0.88), t.r);
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    this.bubblePoints = new THREE.Points(bGeo, bMat);
    this.bubblePoints.renderOrder = 4;
    this.bubblePoints.frustumCulled = false;
    scene.add(this.bubblePoints);

    // 2. Backlit rising steam wisps (translucent soft puffs catching bare bulb light!)
    this.maxSteam = 48;
    this.steam = [];
    this.steamPos = new Float32Array(this.maxSteam * 3);
    this.steamSize = new Float32Array(this.maxSteam);
    this.steamAlpha = new Float32Array(this.maxSteam);
    for (let i = 0; i < this.maxSteam; i++) {
      this.steam.push({
        active: false,
        x: 0, y: -10, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0, life: 2.5,
        startSize: 40, endSize: 150,
        maxAlpha: 0.14,
      });
      this.steamPos[i * 3 + 1] = -10;
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(this.steamPos, 3));
    sGeo.setAttribute('aSize', new THREE.BufferAttribute(this.steamSize, 1));
    sGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.steamAlpha, 1));

    const sMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: textures.softGlow },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (2.2 / max(0.4, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vAlpha;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float a = t.a * vAlpha;
          if (a < 0.005) discard;
          // Warm bare-bulb backlit steam color
          gl_FragColor = vec4(1.0, 0.83, 0.58, a);
        }
      `,
    });
    this.steamPoints = new THREE.Points(sGeo, sMat);
    this.steamPoints.renderOrder = 5;
    this.steamPoints.frustumCulled = false;
    scene.add(this.steamPoints);

    // 3. Floating golden Tenkasu (crispy batter droplets frying in the oil!)
    this.maxTenkasu = 55;
    this.tenkasuList = [];
    const tkGeo = new THREE.IcosahedronGeometry(0.016, 1);
    const posAttr = tkGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const bump = 0.72 + 0.52 * Math.abs(Math.sin(vx * 90 + vy * 70 + vz * 110));
      posAttr.setXYZ(i, vx * bump, vy * bump * 0.75, vz * bump);
    }
    tkGeo.computeVertexNormals();
    const tkMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.02,
      bumpMap: textures.batterBump,
      bumpScale: 0.008,
    });
    this.tenkasuMesh = new THREE.InstancedMesh(tkGeo, tkMat, this.maxTenkasu);
    this.tenkasuMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tenkasuMesh.castShadow = false;
    this.tenkasuMesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    const white = new THREE.Color(0xf6e6b8);
    for (let i = 0; i < this.maxTenkasu; i++) {
      this.tenkasuMesh.setMatrixAt(i, dummy.matrix);
      this.tenkasuMesh.setColorAt(i, white);
      this.tenkasuList.push({
        active: false,
        x: 0, y: oilY, z: 0,
        vx: 0, vz: 0,
        doneness: 0,
        scale: 1,
        rotY: Math.random() * Math.PI * 2,
      });
    }
    this.tenkasuMesh.instanceMatrix.needsUpdate = true;
    if (this.tenkasuMesh.instanceColor) this.tenkasuMesh.instanceColor.needsUpdate = true;
    scene.add(this.tenkasuMesh);

    // 4. Falling droplets (oil drips, batter drips, salt crystals, tentsuyu stream drops)
    this.maxDrops = 160;
    this.drops = [];
    const dropGeo = new THREE.SphereGeometry(0.0085, 6, 6);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.14,
      metalness: 0.0,
      clearcoat: 1.0,
    });
    this.dropMesh = new THREE.InstancedMesh(dropGeo, dropMat, this.maxDrops);
    this.dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < this.maxDrops; i++) {
      this.dropMesh.setMatrixAt(i, dummy.matrix);
      this.dropMesh.setColorAt(i, white);
      this.drops.push({
        active: false,
        x: 0, y: -10, z: 0,
        vx: 0, vy: 0, vz: 0,
        scale: 1,
        stretchY: 1,
        kind: 'oil',
        targetY: oilY,
        onLand: null,
      });
    }
    this.dropMesh.instanceMatrix.needsUpdate = true;
    scene.add(this.dropMesh);

    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();
    this._rawColor = new THREE.Color(0xf8f0d8);
    this._goldColor = new THREE.Color(0xe5a43e);
    this._darkColor = new THREE.Color(0x9c5519);
    this._steamTimer = 0;
  }

  spawnBubbleBurst(wx, wz, count = 16, spread = 0.11, intensity = 1.0) {
    let spawned = 0;
    for (let i = 0; i < this.maxBubbles && spawned < count; i++) {
      const b = this.bubbles[i];
      if (!b.active) {
        const ang = Math.random() * Math.PI * 2;
        // Cluster tighter around piece waterline like real fine sizzling foam!
        const r = Math.pow(Math.random(), 0.7) * spread;
        b.active = true;
        b.x = wx + Math.cos(ang) * r;
        b.z = wz + Math.sin(ang) * r;
        b.y = this.oilY + 0.004 + Math.random() * 0.009;
        b.vx = Math.cos(ang) * (0.025 + Math.random() * 0.055) * intensity;
        b.vz = Math.sin(ang) * (0.025 + Math.random() * 0.055) * intensity;
        b.vy = (0.015 + Math.random() * 0.065) * intensity;
        b.age = 0;
        b.life = 0.22 + Math.random() * 0.45;
        // Mixed sizes: mostly ultra-fine fizz (2.2-5.5px) + occasional translucent 7-10px oil-film bubbles
        const bigChance = Math.random() > 0.82 ? 1.8 : 1.0;
        b.baseSize = (2.2 + Math.random() * 4.2) * bigChance * (0.78 + intensity * 0.28);
        spawned++;
      }
    }
  }

  spawnSteam(wx, wy, wz, strength = 1.0) {
    for (let i = 0; i < this.maxSteam; i++) {
      const s = this.steam[i];
      if (!s.active) {
        s.active = true;
        s.x = wx + (Math.random() - 0.5) * 0.14;
        s.y = wy;
        s.z = wz + (Math.random() - 0.5) * 0.14;
        s.vx = (Math.random() - 0.5) * 0.05;
        s.vy = 0.22 + Math.random() * 0.16;
        s.vz = -0.02 + (Math.random() - 0.5) * 0.05;
        s.age = 0;
        s.life = 1.7 + Math.random() * 1.4;
        s.startSize = 54 * strength;
        s.endSize = 185 * strength;
        s.maxAlpha = Math.min(0.18, 0.075 * strength);
        break;
      }
    }
  }

  spawnTenkasu(wx, wz, count = 4) {
    let placed = 0;
    for (let i = 0; i < this.maxTenkasu && placed < count; i++) {
      const tk = this.tenkasuList[i];
      if (!tk.active) {
        tk.active = true;
        const ang = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.08;
        tk.x = wx + Math.cos(ang) * r;
        tk.z = wz + Math.sin(ang) * r;
        // Clamp inside pot
        const dx = tk.x - this.potCenter.x;
        const dz = tk.z - this.potCenter.z;
        const dist = Math.hypot(dx, dz);
        const maxR = this.potRadius * 0.84;
        if (dist > maxR) {
          tk.x = this.potCenter.x + (dx / dist) * maxR;
          tk.z = this.potCenter.z + (dz / dist) * maxR;
        }
        tk.y = this.oilY + 0.002;
        tk.vx = Math.cos(ang) * 0.08;
        tk.vz = Math.sin(ang) * 0.08;
        tk.doneness = 0;
        tk.scale = 0.65 + Math.random() * 0.85;
        tk.rotY = Math.random() * Math.PI * 2;
        placed++;
      }
    }
    // If full, recycle oldest
    if (placed === 0) {
      const tk = this.tenkasuList[Math.floor(Math.random() * this.maxTenkasu)];
      tk.x = wx;
      tk.z = wz;
      tk.doneness = 0;
      tk.scale = 0.75 + Math.random() * 0.7;
    }
  }

  clearOldestTenkasu(count = 4) {
    let removed = 0;
    for (let i = 0; i < this.maxTenkasu && removed < count; i++) {
      if (this.tenkasuList[i].active) {
        this.tenkasuList[i].active = false;
        removed++;
      }
    }
  }

  spawnDrop({ x, y, z, vx = 0, vy = -0.2, vz = 0, scale = 1, stretchY = 1.4, color = 0xf0be54, targetY = this.oilY, kind = 'oil', onLand = null }) {
    for (let i = 0; i < this.maxDrops; i++) {
      const d = this.drops[i];
      if (!d.active) {
        d.active = true;
        d.x = x; d.y = y; d.z = z;
        d.vx = vx; d.vy = vy; d.vz = vz;
        d.scale = scale;
        d.stretchY = stretchY;
        d.targetY = targetY;
        d.kind = kind;
        d.onLand = onLand;
        this._color.setHex(color);
        this.dropMesh.setColorAt(i, this._color);
        if (this.dropMesh.instanceColor) this.dropMesh.instanceColor.needsUpdate = true;
        break;
      }
    }
  }

  update(dt, heat, activeFryCount, oilSurface) {
    // Update bubbles
    for (let i = 0; i < this.maxBubbles; i++) {
      const b = this.bubbles[i];
      if (!b.active) {
        this.bubbleAlpha[i] = 0;
        continue;
      }
      b.age += dt;
      if (b.age >= b.life) {
        b.active = false;
        this.bubbleAlpha[i] = 0;
        this.bubblePos[i * 3 + 1] = -10;
        continue;
      }
      const t = b.age / b.life;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y += b.vy * dt;
      b.vy -= 0.16 * dt;
      if (b.y < this.oilY + 0.004) b.y = this.oilY + 0.004;

      // Stay inside pot
      const dx = b.x - this.potCenter.x;
      const dz = b.z - this.potCenter.z;
      const dist = Math.hypot(dx, dz);
      if (dist > this.potRadius * 0.92) {
        b.x = this.potCenter.x + (dx / dist) * this.potRadius * 0.92;
        b.z = this.potCenter.z + (dz / dist) * this.potRadius * 0.92;
      }

      this.bubblePos[i * 3] = b.x;
      this.bubblePos[i * 3 + 1] = b.y;
      this.bubblePos[i * 3 + 2] = b.z;
      this.bubbleSize[i] = b.baseSize * (0.55 + Math.sin(t * Math.PI) * 0.65);
      this.bubbleAlpha[i] = Math.sin(t * Math.PI) * 0.88;
    }
    this.bubblePoints.geometry.attributes.position.needsUpdate = true;
    this.bubblePoints.geometry.attributes.aSize.needsUpdate = true;
    this.bubblePoints.geometry.attributes.aAlpha.needsUpdate = true;

    // Ambient warm steam rising from hot oil
    this._steamTimer += dt;
    const steamRate = activeFryCount > 0 ? 0.09 : 0.24;
    if (this._steamTimer >= steamRate) {
      this._steamTimer = 0;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * this.potRadius * 0.6;
      this.spawnSteam(
        this.potCenter.x + Math.cos(ang) * r,
        this.oilY + 0.05,
        this.potCenter.z + Math.sin(ang) * r,
        activeFryCount > 0 ? (0.85 + heat * 0.55) : (0.55 + heat * 0.35)
      );
    }

    // Update steam
    for (let i = 0; i < this.maxSteam; i++) {
      const s = this.steam[i];
      if (!s.active) {
        this.steamAlpha[i] = 0;
        continue;
      }
      s.age += dt;
      if (s.age >= s.life) {
        s.active = false;
        this.steamAlpha[i] = 0;
        this.steamPos[i * 3 + 1] = -10;
        continue;
      }
      const t = s.age / s.life;
      s.x += (s.vx + Math.sin(s.age * 2.1 + i) * 0.025) * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      this.steamPos[i * 3] = s.x;
      this.steamPos[i * 3 + 1] = s.y;
      this.steamPos[i * 3 + 2] = s.z;
      this.steamSize[i] = THREE.MathUtils.lerp(s.startSize, s.endSize, t);
      this.steamAlpha[i] = Math.sin(t * Math.PI) * s.maxAlpha;
    }
    this.steamPoints.geometry.attributes.position.needsUpdate = true;
    this.steamPoints.geometry.attributes.aSize.needsUpdate = true;
    this.steamPoints.geometry.attributes.aAlpha.needsUpdate = true;

    // Update floating Tenkasu
    let tkDirty = false;
    for (let i = 0; i < this.maxTenkasu; i++) {
      const tk = this.tenkasuList[i];
      if (!tk.active) {
        this._dummy.scale.set(0, 0, 0);
        this._dummy.position.set(0, -10, 0);
        this._dummy.updateMatrix();
        this.tenkasuMesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }
      tkDirty = true;
      tk.doneness = Math.min(1.5, tk.doneness + dt * (0.14 + heat * 0.16));
      tk.vx *= 0.96;
      tk.vz *= 0.96;
      // Gentle thermal swirl
      const dx = tk.x - this.potCenter.x;
      const dz = tk.z - this.potCenter.z;
      tk.vx += (-dz * 0.04 + (Math.random() - 0.5) * 0.02) * dt;
      tk.vz += (dx * 0.04 + (Math.random() - 0.5) * 0.02) * dt;
      tk.x += tk.vx * dt;
      tk.z += tk.vz * dt;

      const dist = Math.hypot(tk.x - this.potCenter.x, tk.z - this.potCenter.z);
      const maxR = this.potRadius * 0.88;
      if (dist > maxR) {
        tk.x = this.potCenter.x + ((tk.x - this.potCenter.x) / dist) * maxR;
        tk.z = this.potCenter.z + ((tk.z - this.potCenter.z) / dist) * maxR;
      }

      // Fresh tenkasu fizz slightly
      if (tk.doneness < 0.45 && Math.random() < dt * 4.5) {
        this.spawnBubbleBurst(tk.x, tk.z, 1, 0.025, 0.5);
      }

      const puff = 0.7 + Math.min(1, tk.doneness * 2.4) * 0.55;
      this._dummy.position.set(tk.x, this.oilY + 0.003 + Math.sin(tk.doneness * 10 + i) * 0.002, tk.z);
      this._dummy.rotation.set(0, tk.rotY + tk.doneness * 0.6, 0);
      this._dummy.scale.setScalar(tk.scale * puff);
      this._dummy.updateMatrix();
      this.tenkasuMesh.setMatrixAt(i, this._dummy.matrix);

      if (tk.doneness < 0.8) {
        this._color.copy(this._rawColor).lerp(this._goldColor, tk.doneness / 0.8);
      } else {
        this._color.copy(this._goldColor).lerp(this._darkColor, Math.min(1, (tk.doneness - 0.8) / 0.7));
      }
      this.tenkasuMesh.setColorAt(i, this._color);
    }
    this.tenkasuMesh.instanceMatrix.needsUpdate = true;
    if (tkDirty && this.tenkasuMesh.instanceColor) this.tenkasuMesh.instanceColor.needsUpdate = true;

    // Update falling drops
    for (let i = 0; i < this.maxDrops; i++) {
      const d = this.drops[i];
      if (!d.active) {
        this._dummy.scale.set(0, 0, 0);
        this._dummy.position.set(0, -10, 0);
        this._dummy.updateMatrix();
        this.dropMesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }
      d.vy -= 4.8 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;

      if (d.y <= d.targetY) {
        d.active = false;
        if (d.onLand) d.onLand(d.x, d.z);
        // If drop landed in pot oil, trigger ripple!
        const dx = d.x - this.potCenter.x;
        const dz = d.z - this.potCenter.z;
        if (Math.hypot(dx, dz) < this.potRadius * 0.94 && Math.abs(d.targetY - this.oilY) < 0.06 && oilSurface) {
          oilSurface.addRipple(dx, dz, d.kind === 'batter' ? 0.013 : 0.008, 1.5, 32.0);
          if (d.kind === 'batter') {
            this.spawnTenkasu(d.x, d.z, 1);
            this.spawnBubbleBurst(d.x, d.z, 5, 0.035, 0.7);
          }
        }
        this._dummy.scale.set(0, 0, 0);
        this._dummy.updateMatrix();
        this.dropMesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }

      this._dummy.position.set(d.x, d.y, d.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.set(d.scale, d.scale * d.stretchY, d.scale);
      this._dummy.updateMatrix();
      this.dropMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.dropMesh.instanceMatrix.needsUpdate = true;
  }
}
