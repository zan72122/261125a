import * as THREE from 'three';
import { WOK_POS, WOK_RADIUS, WOK_DEPTH, wokLocalSurfaceY } from './kitchen.js';
import {
  createHamTexture,
  createSmokeTexture,
  createEggBumpTexture,
  createColdRiceBedTextures,
} from './textures.js';

const MAX_RICE = 1500;
const MAX_CURDS = 220;
const MAX_HAM = 110;
const MAX_NEGI = 220;
const MAX_SMOKE = 160;
const MAX_DROPLETS = 52;
const MAX_EGG_POOLS = 3;

const STATE_INACTIVE = 0;
const STATE_WOK = 1;
const STATE_SPILLED = 2;
const STATE_PLATE = 3;

const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _col = new THREE.Color();

export class ChahanSimulation {
  constructor(scene, wokPivot, plateStation) {
    this.scene = scene;
    this.wokPivot = wokPivot;
    this.plateStation = plateStation;

    this.heatLevel = 0.45;
    this.wokTemp = 135;
    this.oilAmount = 0.0;
    this.soyAmount = 0.0;
    this.totalTosses = 0;
    this.stirDistance = 0;
    this.spilledCount = 0;
    this.platedScoops = 0;
    this.domeShaped = false;
    this.eggBeforeRice = false;
    this.eggAddedCount = 0;
    this.riceAddedCount = 0;
    this.lateNegiOnPlate = 0;
    this.simTime = 0;
    this.stirGraceTimer = 0;

    this.clumps = [];
    this.wokOffset = new THREE.Vector3();
    this.wokRot = new THREE.Euler();
    this.tossTimer = 0;
    this.tossStrength = 0;

    this._buildPourStreams();
    this._buildOilPool();
    this._buildEggPools();
    this._buildRiceMesh();
    this._buildEggCurdMesh();
    this._buildHamMesh();
    this._buildNegiMesh();
    this._buildPlateBaseMound();
    this._buildSmokeSystem();
    this._buildOilDroplets();
  }

  // ===========================================================================
  // 1. REALISTIC SHIMMERING TRANSLUCENT OIL POOL
  // ===========================================================================
  _buildOilPool() {
    const geo = new THREE.CircleGeometry(WOK_RADIUS * 0.66, 36);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      pos.setY(i, wokLocalSurfaceY(r) + 0.0028);
    }
    geo.computeVertexNormals();

    this.oilUniforms = { uTime: { value: 0 }, uOpacity: { value: 0 }, uHeat: { value: 0.4 } };
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: this.oilUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform float uHeat;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;
          float edge = smoothstep(1.0, 0.72, r + 0.04 * sin(atan(p.y, p.x) * 5.0 + uTime * 1.5));
          float rip = sin(r * 26.0 - uTime * 7.0) * 0.5 + sin(p.x * 18.0 + p.y * 14.0 + uTime * 5.5) * 0.5;
          vec3 N = normalize(vec3(rip * 0.08 * (0.3 + uHeat), 1.0, rip * 0.06 * (0.3 + uHeat)));
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(vec3(-0.75, 0.52, -0.45));
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 48.0);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

          vec3 oilTint = vec3(0.42, 0.28, 0.06);
          vec3 col = oilTint + vec3(1.5, 0.96, 0.42) * spec * 1.45 + vec3(0.75, 0.50, 0.22) * fres * 0.55;
          float alpha = edge * uOpacity * (0.34 + spec * 0.62 + fres * 0.28);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
        }
      `,
    });

    this.oilPoolMesh = new THREE.Mesh(geo, mat);
    this.oilPoolMesh.scale.setScalar(0.01);
    this.oilPoolMesh.renderOrder = 1;
    this.wokPivot.add(this.oilPoolMesh);
  }

  // ===========================================================================
  // 2. ORGANIC DEFORMING & SOLIDIFYING BEATEN EGG POOLS (ZERO CENTER PINCH!)
  // ===========================================================================
  _buildEggPools() {
    this.eggPools = [];
    const eggBumpTex = createEggBumpTexture();

    for (let p = 0; p < MAX_EGG_POOLS; p++) {
      const gridN = 22;
      const geo = new THREE.PlaneGeometry(2.0, 2.0, gridN, gridN);
      geo.rotateX(-Math.PI / 2);

      const pos = geo.attributes.position;
      const basePolar = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const sx = pos.getX(i);
        const sz = pos.getZ(i);
        const dx = sx * Math.sqrt(Math.max(0, 1.0 - 0.5 * sz * sz));
        const dz = sz * Math.sqrt(Math.max(0, 1.0 - 0.5 * sx * sx));
        basePolar[i * 2] = Math.hypot(dx, dz);
        basePolar[i * 2 + 1] = Math.atan2(dz, dx);
      }

      const colors = new Float32Array(pos.count * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        bumpMap: eggBumpTex,
        bumpScale: 0.009,
        roughness: 0.14,
        metalness: 0.0,
        clearcoat: 0.72,
        clearcoatRoughness: 0.18,
        sheen: 0.35,
        sheenColor: new THREE.Color(0xffe596),
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.renderOrder = 2;
      this.wokPivot.add(mesh);

      this.eggPools.push({
        active: false,
        mesh,
        geo,
        mat,
        basePolar,
        centerX: 0,
        centerZ: 0,
        radius: 0.04,
        targetRadius: 0.21,
        cookProgress: 0,
        burnProgress: 0,
        integrity: 1.0,
        seed: p * 17.3 + 1.1,
      });
    }
  }

  // ===========================================================================
  // 3. FINELY PROPORTIONED TRANSLUCENT INDIVIDUAL RICE GRAINS (1,500 GRAINS!)
  // ===========================================================================
  _buildRiceMesh() {
    // Realistic plump short-grain koshihikari size
    const geo = new THREE.SphereGeometry(0.0082, 6, 4);
    geo.scale(0.60, 0.56, 1.54);

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.20,
      metalness: 0.0,
      clearcoat: 0.88,
      clearcoatRoughness: 0.12,
      sheen: 0.45,
      sheenRoughness: 0.38,
      sheenColor: new THREE.Color(0xfff1cf),
      envMapIntensity: 1.35,
    });

    // Subtle warm backlit translucency glow along sun-facing rice edges
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        float rimGlow = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.1);
        vec3 sss = vec3(1.0, 0.78, 0.42) * rimGlow * 0.24;
        gl_FragColor.rgb += sss;
        #include <dithering_fragment>
        `
      );
    };

    this.riceMesh = new THREE.InstancedMesh(geo, mat, MAX_RICE);
    this.riceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.riceMesh.castShadow = true;
    this.riceMesh.receiveShadow = true;
    this.riceMesh.frustumCulled = false;
    this.scene.add(this.riceMesh);

    this.rice = [];
    for (let i = 0; i < MAX_RICE; i++) {
      this.rice.push({
        state: STATE_INACTIVE,
        x: 0, y: -5, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        scale: 0.88 + Math.random() * 0.26,
        clumpId: -1,
        clumpOffX: 0, clumpOffY: 0, clumpOffZ: 0,
        clumpBond: 0,
        temp: 18,
        oilCoat: 0,
        eggCoat: 0,
        soyCoat: 0,
        brownness: 0, // 0 raw -> 0.45 golden okoge -> 0.85+ deep charcoal burnt!
        plateOffX: 0, plateOffY: 0, plateOffZ: 0,
      });
      _mat4.makeScale(0, 0, 0);
      this.riceMesh.setMatrixAt(i, _mat4);
      this.riceMesh.setColorAt(i, _col.setRGB(0.92, 0.90, 0.85));
    }
    this.riceMesh.instanceMatrix.needsUpdate = true;
    this.riceMesh.instanceColor.needsUpdate = true;
  }

  // ===========================================================================
  // 4. FLUFFY BILLOWY SCRAMBLED EGG CURDS (PLUMP & WARM GOLDEN — ZERO FLAT PLASTIC CHIPS!)
  // ===========================================================================
  _buildEggCurdMesh() {
    const geo = new THREE.IcosahedronGeometry(0.0148, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const lobe = 0.80 + 0.28 * Math.sin(vx * 115 + vy * 85) * Math.cos(vz * 105 - vx * 60);
      p.setXYZ(i, vx * lobe * 1.12, vy * lobe * 0.90, vz * lobe * 1.04);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      bumpMap: createEggBumpTexture(),
      bumpScale: 0.005,
      roughness: 0.66,
      metalness: 0.0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.35,
      sheen: 0.42,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0xffdc80),
    });

    this.curdMesh = new THREE.InstancedMesh(geo, mat, MAX_CURDS);
    this.curdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.curdMesh.castShadow = true;
    this.curdMesh.receiveShadow = true;
    this.curdMesh.frustumCulled = false;
    this.scene.add(this.curdMesh);

    this.curds = [];
    for (let i = 0; i < MAX_CURDS; i++) {
      this.curds.push({
        state: STATE_INACTIVE,
        x: 0, y: -5, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        scale: 0.72 + Math.random() * 0.52,
        warmShade: Math.random(),
        brownness: 0,
        soyCoat: 0,
        plateOffX: 0, plateOffY: 0, plateOffZ: 0,
      });
      _mat4.makeScale(0, 0, 0);
      this.curdMesh.setMatrixAt(i, _mat4);
      this.curdMesh.setColorAt(i, _col.setRGB(0.99, 0.72, 0.18));
    }
    this.curdMesh.instanceMatrix.needsUpdate = true;
    this.curdMesh.instanceColor.needsUpdate = true;
  }

  // ===========================================================================
  // 5. DICED MARBLED PINK HAM CUBES
  // ===========================================================================
  _buildHamMesh() {
    const geo = new THREE.BoxGeometry(0.020, 0.014, 0.020);
    const mat = new THREE.MeshPhysicalMaterial({
      map: createHamTexture(),
      roughness: 0.32,
      clearcoat: 0.55,
      clearcoatRoughness: 0.20,
    });
    this.hamMesh = new THREE.InstancedMesh(geo, mat, MAX_HAM);
    this.hamMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hamMesh.castShadow = true;
    this.hamMesh.receiveShadow = true;
    this.hamMesh.frustumCulled = false;
    this.scene.add(this.hamMesh);

    this.hams = [];
    for (let i = 0; i < MAX_HAM; i++) {
      this.hams.push({
        state: STATE_INACTIVE,
        x: 0, y: -5, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        scale: 0.85 + Math.random() * 0.3,
        brownness: 0,
        soyCoat: 0,
        plateOffX: 0, plateOffY: 0, plateOffZ: 0,
      });
      _mat4.makeScale(0, 0, 0);
      this.hamMesh.setMatrixAt(i, _mat4);
      this.hamMesh.setColorAt(i, _col.setRGB(1, 1, 1));
    }
    this.hamMesh.instanceMatrix.needsUpdate = true;
    this.hamMesh.instanceColor.needsUpdate = true;
  }

  // ===========================================================================
  // 6. AUTHENTIC SLICED SCALLION RINGS (刻みねぎ)
  // ===========================================================================
  _buildNegiMesh() {
    const geo = new THREE.CylinderGeometry(0.010, 0.010, 0.0048, 10, 1, true);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.24,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    });
    this.negiMesh = new THREE.InstancedMesh(geo, mat, MAX_NEGI);
    this.negiMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.negiMesh.castShadow = true;
    this.negiMesh.frustumCulled = false;
    this.scene.add(this.negiMesh);

    this.negis = [];
    for (let i = 0; i < MAX_NEGI; i++) {
      this.negis.push({
        state: STATE_INACTIVE,
        x: 0, y: -5, z: 0,
        vx: 0, vy: 0, vz: 0,
        rx: 0, ry: 0, rz: 0,
        vrx: 0, vry: 0, vrz: 0,
        scale: 0.82 + Math.random() * 0.36,
        cooked: 0,
        brownness: 0,
        hueVariant: Math.random(),
        plateOffX: 0, plateOffY: 0, plateOffZ: 0,
      });
      _mat4.makeScale(0, 0, 0);
      this.negiMesh.setMatrixAt(i, _mat4);
      this.negiMesh.setColorAt(i, _col.setRGB(0.28, 0.58, 0.18));
    }
    this.negiMesh.instanceMatrix.needsUpdate = true;
    this.negiMesh.instanceColor.needsUpdate = true;
  }

  // ===========================================================================
  // 6b. DENSE TEXTURED CHAHAN CORE MOUND UNDER PLATED GRAINS (ZERO SPARSE GAPS!)
  // ===========================================================================
  _buildPlateBaseMound() {
    const riceBed = createColdRiceBedTextures();
    // Deep recessed matte inner core strictly INSIDE the plated rice/ham/egg/negi particle shell
    // so zero smooth plastic dome ever pokes out or swallows the real grains!
    const geo = new THREE.SphereGeometry(0.080, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const mat = new THREE.MeshStandardMaterial({
      map: riceBed.map,
      bumpMap: riceBed.bumpMap,
      bumpScale: 0.008,
      color: 0xd8c492,
      roughness: 0.86,
      metalness: 0.0,
    });
    this.plateBaseMound = new THREE.Mesh(geo, mat);
    this.plateBaseMound.position.set(-0.02, 0.022, 0);
    this.plateBaseMound.visible = false;
    this.plateBaseMound.receiveShadow = true;
    this.plateStation.add(this.plateBaseMound);
  }

  // ===========================================================================
  // 7. BACKLIT WESTERN-SUN OIL SMOKE & CHARCOAL BURN SMOKE (逆光の油煙＋焦げ黒煙)
  // ===========================================================================
  _buildSmokeSystem() {
    const smokeTex = createSmokeTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: smokeTex } },
      vertexShader: `
        attribute float aAlpha;
        attribute float aWarmth;
        attribute float aRot;
        attribute float aDarkness;
        varying vec2 vUv;
        varying float vAlpha;
        varying float vWarmth;
        varying float vDarkness;
        void main() {
          vUv = uv;
          vAlpha = aAlpha;
          vWarmth = aWarmth;
          vDarkness = aDarkness;
          vec4 mvCenter = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float s = length(vec3(instanceMatrix[0].x, instanceMatrix[0].y, instanceMatrix[0].z));
          float c = cos(aRot);
          float sn = sin(aRot);
          vec2 rotPos = vec2(position.x * c - position.y * sn, position.x * sn + position.y * c) * s;
          mvCenter.xy += rotPos;
          gl_Position = projectionMatrix * mvCenter;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying float vAlpha;
        varying float vWarmth;
        varying float vDarkness;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          float a = tex.a * vAlpha;
          if (a < 0.003) discard;
          float sunSide = smoothstep(0.92, 0.08, vUv.x) * 0.72 + smoothstep(0.0, 0.88, vUv.y) * 0.28;
          vec3 shadowMist = vec3(0.58, 0.54, 0.56);
          vec3 goldenBacklit = mix(vec3(1.55, 1.05, 0.56), vec3(1.85, 0.96, 0.42), vWarmth);
          vec3 cleanSmoke = mix(shadowMist, goldenBacklit, pow(sunSide, 0.85));
          // Dark acrid charcoal smoke when chahan burns!
          vec3 burntSmoke = mix(vec3(0.11, 0.10, 0.11), vec3(0.45, 0.32, 0.22), sunSide * 0.65);
          vec3 col = mix(cleanSmoke, burntSmoke, vDarkness);
          float maxOp = mix(0.50, 0.76, vDarkness);
          gl_FragColor = vec4(col, clamp(a * (1.12 + vDarkness * 0.95), 0.0, maxOp));
        }
      `,
    });

    this.smokeMesh = new THREE.InstancedMesh(geo, mat, MAX_SMOKE);
    this.smokeMesh.frustumCulled = false;
    this.smokeMesh.renderOrder = 8;

    this.smokeAlphas = new Float32Array(MAX_SMOKE);
    this.smokeWarmths = new Float32Array(MAX_SMOKE);
    this.smokeRots = new Float32Array(MAX_SMOKE);
    this.smokeDarkness = new Float32Array(MAX_SMOKE);
    geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(this.smokeAlphas, 1));
    geo.setAttribute('aWarmth', new THREE.InstancedBufferAttribute(this.smokeWarmths, 1));
    geo.setAttribute('aRot', new THREE.InstancedBufferAttribute(this.smokeRots, 1));
    geo.setAttribute('aDarkness', new THREE.InstancedBufferAttribute(this.smokeDarkness, 1));

    this.scene.add(this.smokeMesh);

    this.smokes = [];
    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokes.push({
        active: false,
        x: 0, y: -5, z: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0, life: 1,
        size0: 0.1, size1: 0.4,
        maxAlpha: 0.2,
        warmth: 0.5,
        darkness: 0,
        rot: 0, vrot: 0,
      });
      _mat4.makeScale(0, 0, 0);
      this.smokeMesh.setMatrixAt(i, _mat4);
    }
    this.smokeMesh.instanceMatrix.needsUpdate = true;
    this.smokeCursor = 0;
    this.smokeAccum = 0;
  }

  _buildOilDroplets() {
    const geo = new THREE.SphereGeometry(0.004, 5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd57a, transparent: true, opacity: 0.92 });
    this.dropMesh = new THREE.InstancedMesh(geo, mat, MAX_DROPLETS);
    this.dropMesh.frustumCulled = false;
    this.scene.add(this.dropMesh);

    this.droplets = [];
    for (let i = 0; i < MAX_DROPLETS; i++) {
      this.droplets.push({ active: false, x: 0, y: -5, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.4 });
      _mat4.makeScale(0, 0, 0);
      this.dropMesh.setMatrixAt(i, _mat4);
    }
    this.dropCursor = 0;
  }

  _buildPourStreams() {
    const streamGeo = new THREE.CylinderGeometry(0.0052, 0.0082, 1.0, 8);
    streamGeo.translate(0, -0.5, 0);
    this.pourStreamMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0b22c,
      roughness: 0.06,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88,
    });
    this.pourStreamMesh = new THREE.Mesh(streamGeo, this.pourStreamMat);
    this.pourStreamMesh.visible = false;
    this.scene.add(this.pourStreamMesh);
  }

  setPourStream(active, startPos, targetPos, colorHex = 0xf0b22c, thickness = 1.0) {
    if (!active) {
      this.pourStreamMesh.visible = false;
      return;
    }
    this.pourStreamMesh.visible = true;
    this.pourStreamMat.color.setHex(colorHex);
    const dir = new THREE.Vector3().subVectors(targetPos, startPos);
    const dist = Math.max(0.05, dir.length());
    this.pourStreamMesh.position.copy(startPos);
    this.pourStreamMesh.scale.set(thickness, dist, thickness);
    this.pourStreamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  }

  // ===========================================================================
  // SPAWNING & ADDING INGREDIENTS
  // ===========================================================================
  spawnSmoke(x, y, z, count = 1, { warmth = 0.6, alpha = 0.22, speed = 0.36, size0 = 0.11, size1 = 0.46, darkness = 0 } = {}) {
    for (let n = 0; n < count; n++) {
      const s = this.smokes[this.smokeCursor];
      this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE;
      s.active = true;
      s.x = x + (Math.random() - 0.5) * 0.18;
      s.y = y + Math.random() * 0.04;
      s.z = z + (Math.random() - 0.5) * 0.18;
      s.vx = 0.08 + (Math.random() - 0.42) * 0.14;
      s.vy = speed * (0.75 + Math.random() * 0.55);
      s.vz = 0.02 + (Math.random() - 0.5) * 0.12;
      s.age = 0;
      s.life = 1.15 + Math.random() * 1.15;
      s.size0 = size0 * (0.85 + Math.random() * 0.3);
      s.size1 = size1 * (0.85 + Math.random() * 0.35);
      s.maxAlpha = alpha * (0.8 + Math.random() * 0.4);
      s.warmth = warmth;
      s.darkness = darkness;
      s.rot = Math.random() * Math.PI * 2;
      s.vrot = (Math.random() - 0.5) * 1.0;
    }
  }

  spawnDroplet(x, y, z, count = 2) {
    for (let n = 0; n < count; n++) {
      const d = this.droplets[this.dropCursor];
      this.dropCursor = (this.dropCursor + 1) % MAX_DROPLETS;
      d.active = true;
      d.x = x + (Math.random() - 0.5) * 0.14;
      d.y = y + 0.01;
      d.z = z + (Math.random() - 0.5) * 0.14;
      const a = Math.random() * Math.PI * 2;
      const sp = 0.12 + Math.random() * 0.28;
      d.vx = Math.cos(a) * sp;
      d.vy = 0.45 + Math.random() * 0.65;
      d.vz = Math.sin(a) * sp;
      d.age = 0;
      d.life = 0.28 + Math.random() * 0.25;
    }
  }

  addOil(amount = 0.22, dropWorldPos = null) {
    this.oilAmount = Math.min(1.0, this.oilAmount + amount);
    if (this.wokTemp > 110) {
      const p = dropWorldPos || WOK_POS;
      this.spawnSmoke(p.x, WOK_POS.y + 0.06, p.z, 4, { warmth: 0.78, alpha: 0.20, size1: 0.44 });
      this.spawnDroplet(p.x, WOK_POS.y + 0.05, p.z, 5);
    }
  }

  addBeatenEgg(dropWorldPos) {
    if (this.riceAddedCount === 0) this.eggBeforeRice = true;
    this.eggAddedCount++;

    const localX = THREE.MathUtils.clamp((dropWorldPos.x - WOK_POS.x) * 0.6, -0.14, 0.14);
    const localZ = THREE.MathUtils.clamp((dropWorldPos.z - WOK_POS.z) * 0.6, -0.14, 0.14);

    let pool = this.eggPools.find((ep) => !ep.active);
    if (!pool) {
      pool = this.eggPools.reduce((best, cur) => (cur.integrity < best.integrity ? cur : best), this.eggPools[0]);
    }
    pool.active = true;
    pool.mesh.visible = true;
    pool.centerX = localX;
    pool.centerZ = localZ;
    pool.radius = 0.045;
    pool.targetRadius = 0.18 + Math.random() * 0.05;
    pool.cookProgress = 0.02;
    pool.burnProgress = 0;
    pool.integrity = 1.0;

    for (const r of this.rice) {
      if (r.state !== STATE_WOK) continue;
      const dist = Math.hypot(r.x - dropWorldPos.x, r.z - dropWorldPos.z);
      if (dist < 0.24) {
        r.eggCoat = Math.min(1.0, r.eggCoat + (1 - dist / 0.24) * 0.48);
      }
    }

    if (this.wokTemp > 100) {
      this.spawnSmoke(dropWorldPos.x, WOK_POS.y + 0.07, dropWorldPos.z, 10, {
        warmth: 0.78,
        alpha: 0.24,
        speed: 0.46,
        size1: 0.54,
      });
      this.spawnDroplet(dropWorldPos.x, WOK_POS.y + 0.06, dropWorldPos.z, 10);
    }
  }

  addColdRice(dropWorldPos, count = 340) {
    this.riceAddedCount++;
    const cx = THREE.MathUtils.clamp(dropWorldPos.x, WOK_POS.x - 0.18, WOK_POS.x + 0.18);
    const cz = THREE.MathUtils.clamp(dropWorldPos.z, WOK_POS.z - 0.18, WOK_POS.z + 0.18);

    const numClumps = 3;
    const baseClumpIdx = this.clumps.length;
    for (let c = 0; c < numClumps; c++) {
      const a = (c / numClumps) * Math.PI * 2 + Math.random();
      const d = 0.03 + Math.random() * 0.045;
      this.clumps.push({
        x: cx + Math.cos(a) * d,
        y: WOK_POS.y + 0.16 + c * 0.02,
        z: cz + Math.sin(a) * d,
        vx: (Math.random() - 0.5) * 0.10,
        vy: -0.35,
        vz: (Math.random() - 0.5) * 0.10,
      });
    }

    let spawned = 0;
    for (let i = 0; i < MAX_RICE && spawned < count; i++) {
      const r = this.rice[i];
      if (r.state !== STATE_INACTIVE) continue;
      const cid = baseClumpIdx + (spawned % numClumps);
      const cl = this.clumps[cid];
      const rad = Math.cbrt(Math.random()) * 0.058;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const ox = rad * Math.sin(phi) * Math.cos(theta);
      const oy = rad * Math.cos(phi) * 0.72;
      const oz = rad * Math.sin(phi) * Math.sin(theta);

      r.state = STATE_WOK;
      r.clumpId = cid;
      r.clumpOffX = ox;
      r.clumpOffY = oy;
      r.clumpOffZ = oz;
      r.clumpBond = 0.92;
      r.x = cl.x + ox;
      r.y = cl.y + oy;
      r.z = cl.z + oz;
      r.vx = cl.vx + (Math.random() - 0.5) * 0.06;
      r.vy = -0.3;
      r.vz = cl.vz + (Math.random() - 0.5) * 0.06;
      r.rx = Math.random() * Math.PI;
      r.ry = Math.random() * Math.PI;
      r.rz = Math.random() * Math.PI;
      r.temp = 16;
      r.oilCoat = this.oilAmount * 0.25;
      r.eggCoat = 0;
      r.soyCoat = 0;
      r.brownness = 0;
      spawned++;
    }

    this.wokTemp = Math.max(26, this.wokTemp - 14);
    if (this.wokTemp > 90) {
      this.spawnSmoke(cx, WOK_POS.y + 0.09, cz, 12, { warmth: 0.62, alpha: 0.28, speed: 0.50, size1: 0.58 });
    }
    return spawned;
  }

  addHam(dropWorldPos, count = 24, ontoPlate = false) {
    let spawned = 0;
    for (let i = 0; i < MAX_HAM && spawned < count; i++) {
      const h = this.hams[i];
      if (h.state !== STATE_INACTIVE) continue;
      if (ontoPlate) {
        const offX = (Math.random() - 0.5) * 0.12;
        const offZ = (Math.random() - 0.5) * 0.12;
        h.state = STATE_PLATE;
        h.plateOffX = offX - 0.02;
        h.plateOffZ = offZ;
        h.plateOffY = 0.042 + this.getPlateMoundHeight(offX, offZ);
        h.x = this.plateStation.position.x + h.plateOffX;
        h.y = this.plateStation.position.y + h.plateOffY;
        h.z = this.plateStation.position.z + h.plateOffZ;
      } else {
        h.state = STATE_WOK;
        h.x = dropWorldPos.x + (Math.random() - 0.5) * 0.15;
        h.y = WOK_POS.y + 0.22 + Math.random() * 0.08;
        h.z = dropWorldPos.z + (Math.random() - 0.5) * 0.15;
        h.vx = (Math.random() - 0.5) * 0.22;
        h.vy = -0.35 - Math.random() * 0.22;
        h.vz = (Math.random() - 0.5) * 0.22;
      }
      h.rx = Math.random() * Math.PI;
      h.ry = Math.random() * Math.PI;
      h.rz = Math.random() * Math.PI;
      h.brownness = 0;
      h.soyCoat = 0;
      spawned++;
    }
    if (!ontoPlate && this.wokTemp > 110) {
      this.spawnSmoke(dropWorldPos.x, WOK_POS.y + 0.08, dropWorldPos.z, 6, { warmth: 0.72, alpha: 0.22 });
      this.spawnDroplet(dropWorldPos.x, WOK_POS.y + 0.07, dropWorldPos.z, 6);
    }
    return spawned;
  }

  addNegi(dropWorldPos, count = 42, ontoPlate = false) {
    if (ontoPlate) this.lateNegiOnPlate += count;
    let spawned = 0;
    for (let i = 0; i < MAX_NEGI && spawned < count; i++) {
      const ng = this.negis[i];
      if (ng.state !== STATE_INACTIVE) continue;
      if (ontoPlate) {
        const rad = Math.sqrt(Math.random()) * 0.10;
        const ang = Math.random() * Math.PI * 2;
        const offX = Math.cos(ang) * rad;
        const offZ = Math.sin(ang) * rad;
        ng.state = STATE_PLATE;
        ng.plateOffX = offX - 0.02;
        ng.plateOffZ = offZ;
        ng.plateOffY = 0.045 + this.getPlateMoundHeight(offX, offZ);
        ng.x = this.plateStation.position.x + ng.plateOffX;
        ng.y = this.plateStation.position.y + ng.plateOffY;
        ng.z = this.plateStation.position.z + ng.plateOffZ;
      } else {
        ng.state = STATE_WOK;
        ng.x = dropWorldPos.x + (Math.random() - 0.5) * 0.16;
        ng.y = WOK_POS.y + 0.22 + Math.random() * 0.08;
        ng.z = dropWorldPos.z + (Math.random() - 0.5) * 0.16;
        ng.vx = (Math.random() - 0.5) * 0.24;
        ng.vy = -0.32 - Math.random() * 0.18;
        ng.vz = (Math.random() - 0.5) * 0.24;
      }
      ng.rx = (Math.random() - 0.5) * 1.1;
      ng.ry = Math.random() * Math.PI;
      ng.rz = (Math.random() - 0.5) * 1.1;
      ng.cooked = 0;
      ng.brownness = 0;
      spawned++;
    }
    if (!ontoPlate && this.wokTemp > 110) {
      this.spawnSmoke(dropWorldPos.x, WOK_POS.y + 0.08, dropWorldPos.z, 6, { warmth: 0.68, alpha: 0.24 });
    }
    return spawned;
  }

  addSoySauce(dropWorldPos, ontoPlate = false) {
    this.soyAmount = Math.min(1.0, this.soyAmount + 0.24);
    const targetState = ontoPlate ? STATE_PLATE : STATE_WOK;
    for (const r of this.rice) {
      if (r.state !== targetState) continue;
      const dist = Math.hypot(r.x - dropWorldPos.x, r.z - dropWorldPos.z);
      if (dist < 0.30) r.soyCoat = Math.min(1.0, r.soyCoat + (1 - dist / 0.30) * 0.42);
    }
    for (const c of this.curds) {
      if (c.state !== targetState) continue;
      if (Math.hypot(c.x - dropWorldPos.x, c.z - dropWorldPos.z) < 0.28) c.soyCoat = Math.min(1.0, c.soyCoat + 0.30);
    }
    for (const h of this.hams) {
      if (h.state !== targetState) continue;
      if (Math.hypot(h.x - dropWorldPos.x, h.z - dropWorldPos.z) < 0.28) h.soyCoat = Math.min(1.0, h.soyCoat + 0.30);
    }
    if (ontoPlate && this.plateBaseMound.visible) {
      this._refreshPlateMoundVisual();
    }
    if (!ontoPlate && this.wokTemp > 105) {
      this.spawnSmoke(dropWorldPos.x, WOK_POS.y + 0.09, dropWorldPos.z, 16, {
        warmth: 0.92,
        alpha: 0.30,
        speed: 0.56,
        size0: 0.13,
        size1: 0.62,
      });
      this.spawnDroplet(dropWorldPos.x, WOK_POS.y + 0.07, dropWorldPos.z, 10);
    }
  }

  /**
   * Stirring/chopping inside the wok. When `gentleScoop` is true (dragging toward the plate!),
   * suppresses outward velocity kicks so ingredients are cleanly scooped rather than flung out!
   */
  applyLadleStir(ladleWorldPos, ladleVel, dt, gentleScoop = false) {
    const speed = ladleVel.length();
    if (speed < 0.02) return 0;

    const dxW = ladleWorldPos.x - WOK_POS.x;
    const dzW = ladleWorldPos.z - WOK_POS.z;
    if (Math.hypot(dxW, dzW) > WOK_RADIUS * 1.1) return 0;

    this.stirDistance += speed * dt;
    this.stirGraceTimer = 1.9;
    const stirPower = Math.min(1.85, speed * 1.15);
    const kickScale = gentleScoop ? 0.18 : 0.72;
    const liftScaleAll = gentleScoop ? 0.16 : 0.75;

    let wetEggAvailable = 0;
    for (const ep of this.eggPools) {
      if (!ep.active) continue;
      const ewx = WOK_POS.x + ep.centerX;
      const ewz = WOK_POS.z + ep.centerZ;
      const d = Math.hypot(ladleWorldPos.x - ewx, ladleWorldPos.z - ewz);
      if (d < ep.radius + 0.13) {
        const tear = Math.min(ep.integrity, dt * (0.45 + stirPower * 0.55));
        ep.integrity -= tear;
        wetEggAvailable += tear * (1.2 - ep.cookProgress * 0.65);

        const curdChance = tear * (18 + ep.cookProgress * 34);
        const toSpawn = Math.floor(curdChance) + (Math.random() < (curdChance % 1) ? 1 : 0);
        this._spawnEggCurds(ladleWorldPos.x, WOK_POS.y + 0.06, ladleWorldPos.z, toSpawn, ep.cookProgress, ep.burnProgress);

        if (ep.integrity <= 0.05) {
          ep.active = false;
          ep.mesh.visible = false;
        }
      }
    }

    let hitCount = 0;
    for (const r of this.rice) {
      if (r.state !== STATE_WOK) continue;
      const dx = r.x - ladleWorldPos.x;
      const dz = r.z - ladleWorldPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 0.032) {
        const dist = Math.sqrt(d2) + 0.001;
        const falloff = 1.0 - dist / 0.18;
        r.vx += (ladleVel.x * 0.55 + (dx / dist) * 0.18) * falloff * dt * 11 * kickScale;
        r.vz += (ladleVel.z * 0.55 + (dz / dist) * 0.18) * falloff * dt * 11 * kickScale;
        r.vy = Math.max(r.vy, (0.22 + Math.random() * 0.30) * stirPower * falloff * liftScaleAll);
        r.vrx += (Math.random() - 0.5) * 16 * stirPower * dt;
        r.vry += (Math.random() - 0.5) * 16 * stirPower * dt;

        const breakRate = (0.72 + this.oilAmount * 0.95) * stirPower * dt * (0.6 + falloff);
        r.clumpBond = Math.max(0, r.clumpBond - breakRate);

        r.oilCoat = Math.min(1, r.oilCoat + this.oilAmount * dt * 0.95);
        if (wetEggAvailable > 0) {
          r.eggCoat = Math.min(1, r.eggCoat + wetEggAvailable * 0.95);
        } else if (this.eggAddedCount > 0) {
          r.eggCoat = Math.min(1, r.eggCoat + dt * 0.25 * stirPower * Math.min(1, this.eggAddedCount * 0.65));
        }
        if (this.soyAmount > 0.02) {
          r.soyCoat = Math.min(this.soyAmount, r.soyCoat + dt * 0.38 * stirPower);
        }
        hitCount++;
      }
    }

    const stirList = (arr, liftMult) => {
      for (const item of arr) {
        if (item.state !== STATE_WOK) continue;
        const dx = item.x - ladleWorldPos.x;
        const dz = item.z - ladleWorldPos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 0.034) {
          const dist = Math.sqrt(d2) + 0.001;
          const falloff = 1.0 - dist / 0.185;
          item.vx += (ladleVel.x * 0.55 + (dx / dist) * 0.18) * falloff * dt * 11 * kickScale;
          item.vz += (ladleVel.z * 0.55 + (dz / dist) * 0.18) * falloff * dt * 11 * kickScale;
          item.vy = Math.max(item.vy, (0.24 + Math.random() * 0.32) * stirPower * falloff * liftMult * liftScaleAll);
          item.vrx += (Math.random() - 0.5) * 14 * dt;
          item.vry += (Math.random() - 0.5) * 14 * dt;
        }
      }
    };
    stirList(this.curds, 1.0);
    stirList(this.hams, 0.90);
    stirList(this.negis, 1.10);

    if (!gentleScoop && this.wokTemp > 120 && Math.random() < dt * 10 * stirPower) {
      this.spawnSmoke(ladleWorldPos.x, WOK_POS.y + 0.08, ladleWorldPos.z, 2, { warmth: 0.75, alpha: 0.20, speed: 0.44 });
      this.spawnDroplet(ladleWorldPos.x, WOK_POS.y + 0.07, ladleWorldPos.z, 2);
    }

    return hitCount > 0 ? stirPower : stirPower * 0.35;
  }

  _spawnEggCurds(x, y, z, count, cookProgress, burnProgress = 0) {
    let spawned = 0;
    for (let i = 0; i < MAX_CURDS && spawned < count; i++) {
      const c = this.curds[i];
      if (c.state !== STATE_INACTIVE) continue;
      c.state = STATE_WOK;
      c.x = x + (Math.random() - 0.5) * 0.11;
      c.y = y + Math.random() * 0.03;
      c.z = z + (Math.random() - 0.5) * 0.11;
      c.vx = (Math.random() - 0.5) * 0.24;
      c.vy = 0.18 + Math.random() * 0.22;
      c.vz = (Math.random() - 0.5) * 0.24;
      c.rx = Math.random() * Math.PI;
      c.ry = Math.random() * Math.PI;
      c.rz = Math.random() * Math.PI;
      c.brownness = Math.min(1, cookProgress * 0.22 + burnProgress * 0.85);
      c.soyCoat = 0;
      spawned++;
    }
  }

  triggerWokToss(power = 1.0) {
    this.totalTosses++;
    this.stirGraceTimer = 2.2;
    this.tossTimer = 0.46;
    this.tossStrength = THREE.MathUtils.clamp(power, 0.55, 1.45);

    for (const ep of this.eggPools) {
      if (!ep.active) continue;
      const chunk = Math.min(ep.integrity, 0.45 * this.tossStrength);
      ep.integrity -= chunk;
      this._spawnEggCurds(
        WOK_POS.x + ep.centerX,
        WOK_POS.y + 0.07,
        WOK_POS.z + ep.centerZ,
        Math.ceil(chunk * 26),
        ep.cookProgress,
        ep.burnProgress
      );
      if (ep.integrity <= 0.06) {
        ep.active = false;
        ep.mesh.visible = false;
      }
    }

    const launchParticle = (p, isRice = false) => {
      if (p.state !== STATE_WOK) return;
      const dx = p.x - WOK_POS.x;
      const dz = p.z - WOK_POS.z;
      const jitter = 0.78 + Math.random() * 0.44;
      p.vy = (1.16 + Math.random() * 0.56) * this.tossStrength * jitter;
      p.vx = (-dx * 1.15 + (Math.random() - 0.5) * 0.42) * this.tossStrength;
      p.vz = (-dz * 1.05 - 0.24 + (Math.random() - 0.5) * 0.48) * this.tossStrength;
      p.vrx = (Math.random() - 0.5) * 26;
      p.vry = (Math.random() - 0.5) * 26;
      p.vrz = (Math.random() - 0.5) * 26;
      if (isRice) {
        p.clumpBond = Math.max(0, p.clumpBond - (0.38 + this.oilAmount * 0.25) * this.tossStrength);
        if (this.eggAddedCount > 0) p.eggCoat = Math.min(1, p.eggCoat + 0.22);
      }
    };

    for (const r of this.rice) launchParticle(r, true);
    for (const c of this.curds) launchParticle(c, false);
    for (const h of this.hams) launchParticle(h, false);
    for (const n of this.negis) launchParticle(n, false);

    if (this.wokTemp > 95) {
      this.spawnSmoke(WOK_POS.x, WOK_POS.y + 0.14, WOK_POS.z, 14, {
        warmth: 0.85,
        alpha: 0.26,
        speed: 0.60,
        size0: 0.13,
        size1: 0.62,
      });
      this.spawnDroplet(WOK_POS.x, WOK_POS.y + 0.12, WOK_POS.z, 14);
    }
  }

  hasFoodInWok() {
    let count = 0;
    for (const r of this.rice) if (r.state === STATE_WOK) count++;
    for (const c of this.curds) if (c.state === STATE_WOK) count++;
    for (const h of this.hams) if (h.state === STATE_WOK) count++;
    for (const n of this.negis) if (n.state === STATE_WOK) count++;
    for (const ep of this.eggPools) if (ep.active) count += 25;
    return count > 3;
  }

  getAverageFoodColor(plateOnly = false) {
    let rSum = 0, gSum = 0, bSum = 0, n = 0;
    for (const r of this.rice) {
      if (plateOnly ? r.state === STATE_PLATE : (r.state === STATE_WOK || r.state === STATE_PLATE)) {
        this._computeRiceColor(r, _col);
        rSum += _col.r; gSum += _col.g; bSum += _col.b; n++;
      }
    }
    if (n === 0) {
      for (const c of this.curds) {
        if (plateOnly ? c.state === STATE_PLATE : (c.state === STATE_WOK || c.state === STATE_PLATE)) {
          rSum += THREE.MathUtils.lerp(0.96, 0.22, c.brownness);
          gSum += THREE.MathUtils.lerp(0.79, 0.14, c.brownness);
          bSum += THREE.MathUtils.lerp(0.22, 0.08, c.brownness);
          n++;
        }
      }
    }
    if (n === 0) return new THREE.Color(0xebc152);
    return new THREE.Color(rSum / n, gSum / n, bSum / n);
  }

  getPlateMoundHeight(offX, offZ) {
    const r = Math.hypot(offX, offZ);
    const maxR = this.domeShaped ? 0.118 : 0.132;
    if (r >= maxR) return 0.0;
    const baseHeight = Math.min(0.088, 0.026 + this.platedScoops * 0.019) * (this.domeShaped ? 1.18 : 0.94);
    // True rounded chahan bowl-dome cosine profile so every plated grain sits strictly OUTSIDE the core!
    return baseHeight * Math.pow(Math.cos((r / maxR) * Math.PI * 0.5), 0.72);
  }

  _refreshPlateMoundVisual() {
    if (this.platedScoops <= 0) {
      this.plateBaseMound.visible = false;
      return;
    }
    let platedRiceCount = 0;
    for (const r of this.rice) if (r.state === STATE_PLATE) platedRiceCount++;
    // Only show the deep recessed inner shadow core when there's substantial rice mass;
    // keep it strictly smaller than the real rice grain surface so ZERO smooth ball ever shows!
    this.plateBaseMound.visible = platedRiceCount >= 180;
    if (!this.plateBaseMound.visible) return;

    const rScale = Math.min(0.88, 0.48 + this.platedScoops * 0.14) * (this.domeShaped ? 0.88 : 0.94);
    const hScale = Math.min(0.56, 0.22 + this.platedScoops * 0.11) * (this.domeShaped ? 1.12 : 0.90);
    this.plateBaseMound.scale.set(rScale, hScale, rScale);
    this.plateBaseMound.material.color.copy(this.getAverageFoodColor(true)).multiplyScalar(0.84);
  }

  /**
   * Re-syncs plated particle world positions whenever responsive resize moves plateStation!
   */
  syncPlatedPositions() {
    const pc = this.plateStation.position;
    const s = this.plateStation.scale.x || 1.0;
    const syncArr = (arr) => {
      for (const p of arr) {
        if (p.state !== STATE_PLATE) continue;
        p.x = pc.x + p.plateOffX * s;
        p.y = pc.y + p.plateOffY * s;
        p.z = pc.z + p.plateOffZ * s;
      }
    };
    syncArr(this.rice);
    syncArr(this.curds);
    syncArr(this.hams);
    syncArr(this.negis);
  }

  scoopToPlate(dropPlateWorldPos) {
    for (const ep of this.eggPools) {
      if (ep.active) {
        ep.integrity -= 0.45;
        this._spawnEggCurds(WOK_POS.x, WOK_POS.y + 0.06, WOK_POS.z, 22, ep.cookProgress, ep.burnProgress);
        if (ep.integrity <= 0.08) {
          ep.active = false;
          ep.mesh.visible = false;
        }
      }
    }

    const plateCenter = this.plateStation.position;
    const dropOffX = THREE.MathUtils.clamp((dropPlateWorldPos.x - (plateCenter.x - 0.02)) * 0.48, -0.045, 0.045);
    const dropOffZ = THREE.MathUtils.clamp((dropPlateWorldPos.z - plateCenter.z) * 0.48, -0.045, 0.045);

    this.platedScoops++;
    const s = this.plateStation.scale.x || 1.0;
    const moundScale = Math.min(1.0, 0.62 + this.platedScoops * 0.16);
    const transferFrom = (arr, maxTake, yBias = 0, radiusTight = 1.0) => {
      let moved = 0;
      for (const p of arr) {
        if (p.state !== STATE_WOK || moved >= maxTake) continue;
        p.state = STATE_PLATE;
        // Uniform disk distribution across the entire chahan mound so every scoop looks richly packed with individual grains!
        const rad = Math.sqrt(Math.random()) * 0.116 * moundScale * radiusTight;
        const ang = Math.random() * Math.PI * 2;
        const ox = dropOffX * 0.45 + Math.cos(ang) * rad;
        const oz = dropOffZ * 0.45 + Math.sin(ang) * rad;
        const distC = Math.hypot(ox, oz);
        const clampedScale = distC > 0.124 ? 0.124 / distC : 1;
        p.plateOffX = ox * clampedScale - 0.02;
        p.plateOffZ = oz * clampedScale;
        const domeH = this.getPlateMoundHeight(p.plateOffX + 0.02, p.plateOffZ);
        // Sit right ON TOP of the rounded dome surface so individual rice, egg, ham & negi are 100% visible!
        p.plateOffY = 0.027 + domeH * (0.96 + Math.random() * 0.12) + yBias;
        p.x = plateCenter.x + p.plateOffX * s;
        p.y = plateCenter.y + p.plateOffY * s;
        p.z = plateCenter.z + p.plateOffZ * s;
        p.vx = 0; p.vy = 0; p.vz = 0;
        moved++;
      }
      return moved;
    };

    const movedRice = transferFrom(this.rice, 480, 0.002, 1.0);
    const movedCurds = transferFrom(this.curds, 84, 0.007, 0.92);
    const movedHam = transferFrom(this.hams, 42, 0.008, 0.90);
    const movedNegi = transferFrom(this.negis, 78, 0.010, 0.88);

    const totalMoved = movedRice + movedCurds + movedHam + movedNegi;
    if (totalMoved > 0) {
      this._refreshPlateMoundVisual();
      this.spawnSmoke(plateCenter.x - 0.02, plateCenter.y + 0.10, plateCenter.z, 7, {
        warmth: 0.55,
        alpha: 0.20,
        speed: 0.22,
        size0: 0.08,
        size1: 0.32,
      });
    } else {
      this.platedScoops--;
    }
    return totalMoved;
  }

  shapePlateDome() {
    if (this.platedScoops <= 0) return;
    this.domeShaped = true;
    const plateCenter = this.plateStation.position;
    const s = this.plateStation.scale.x || 1.0;
    const shapeArr = (arr, extraY) => {
      for (const p of arr) {
        if (p.state !== STATE_PLATE) continue;
        const relX = (p.plateOffX + 0.02) * 0.88;
        const relZ = p.plateOffZ * 0.88;
        p.plateOffX = relX - 0.02;
        p.plateOffZ = relZ;
        const h = this.getPlateMoundHeight(relX, relZ);
        p.plateOffY = 0.027 + h * (0.98 + Math.random() * 0.08) + extraY;
        p.x = plateCenter.x + p.plateOffX * s;
        p.y = plateCenter.y + p.plateOffY * s;
        p.z = plateCenter.z + p.plateOffZ * s;
      }
    };
    shapeArr(this.rice, 0.002);
    shapeArr(this.curds, 0.007);
    shapeArr(this.hams, 0.008);
    shapeArr(this.negis, 0.010);
    this._refreshPlateMoundVisual();
  }

  /**
   * Computes rich physical metrics & emergent reaction profile of the actual plated dish!
   */
  getDishSummary() {
    let platedRice = 0, paraparaSum = 0, eggCoatSum = 0, brownSum = 0, soySum = 0, tempSum = 0;
    for (const r of this.rice) {
      if (r.state === STATE_PLATE) {
        platedRice++;
        paraparaSum += 1 - r.clumpBond;
        eggCoatSum += r.eggCoat;
        brownSum += r.brownness;
        soySum += r.soyCoat;
        tempSum += r.temp;
      }
    }
    let platedCurds = 0, curdBrown = 0, platedHam = 0, hamBrown = 0, platedNegi = 0;
    for (const c of this.curds) if (c.state === STATE_PLATE) { platedCurds++; curdBrown += c.brownness; }
    for (const h of this.hams) if (h.state === STATE_PLATE) { platedHam++; hamBrown += h.brownness; }
    for (const n of this.negis) if (n.state === STATE_PLATE) platedNegi++;

    const totalPlated = platedRice + platedCurds + platedHam + platedNegi;
    const avgTemp = platedRice > 0 ? tempSum / platedRice : this.wokTemp;
    const parapara = platedRice > 0 ? paraparaSum / platedRice : 0.8;
    const egginess = platedRice > 0 ? eggCoatSum / platedRice : (platedCurds > 0 ? 1 : 0);
    const crispiness =
      platedRice > 0
        ? brownSum / platedRice
        : platedCurds > 0
        ? curdBrown / platedCurds
        : platedHam > 0
        ? hamBrown / platedHam
        : 0;
    const soyness = platedRice > 0 ? soySum / platedRice : this.soyAmount;

    const burnt = crispiness >= 0.60;
    const rawCold = platedRice > 0 && avgTemp < 62 && crispiness < 0.12;
    const salty = soyness >= 0.52;
    const eggOnly = platedRice < 25 && platedCurds >= 8;
    const toppingHeavy = (platedHam >= 28 || platedNegi >= 55) && platedRice < 120;
    const goldenMasterpiece = !burnt && !rawCold && parapara >= 0.66 && egginess >= 0.35 && platedRice >= 100;
    const crispyOkoge = !burnt && crispiness >= 0.28;
    const messy = this.spilledCount >= 16;

    // Select distinct Mom reaction profile!
    let reactionProfile = 'happy';
    if (burnt) reactionProfile = 'burnt';
    else if (rawCold) reactionProfile = 'cold';
    else if (salty) reactionProfile = 'salty';
    else if (eggOnly) reactionProfile = 'egg_omelette';
    else if (goldenMasterpiece) reactionProfile = 'golden';
    else if (crispyOkoge) reactionProfile = 'crispy';
    else if (toppingHeavy) reactionProfile = 'abundant';
    else if (messy) reactionProfile = 'playful';

    return {
      totalPlated,
      platedRice,
      platedCurds,
      platedHam,
      platedNegi,
      avgTemp: Math.round(avgTemp),
      parapara,
      egginess,
      crispiness,
      soyness,
      burnt,
      rawCold,
      salty,
      mountain: this.platedScoops >= 3,
      messy,
      freshNegiTop: this.lateNegiOnPlate > 0,
      reactionProfile,
    };
  }

  reset() {
    this.oilAmount = 0;
    this.soyAmount = 0;
    this.totalTosses = 0;
    this.stirDistance = 0;
    this.spilledCount = 0;
    this.platedScoops = 0;
    this.domeShaped = false;
    this.eggBeforeRice = false;
    this.eggAddedCount = 0;
    this.riceAddedCount = 0;
    this.lateNegiOnPlate = 0;
    this.stirGraceTimer = 0;
    this.clumps.length = 0;
    this.plateBaseMound.visible = false;

    for (const ep of this.eggPools) {
      ep.active = false;
      ep.mesh.visible = false;
    }
    const clearArr = (arr, mesh) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i].state = STATE_INACTIVE;
        _mat4.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, _mat4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    clearArr(this.rice, this.riceMesh);
    clearArr(this.curds, this.curdMesh);
    clearArr(this.hams, this.hamMesh);
    clearArr(this.negis, this.negiMesh);
  }

  /**
   * Expressive continuous color gradient:
   * Raw pale cold rice -> steamed ivory -> golden egg-coated -> rich shoyu amber -> toasted okoge -> CHARRED BLACK!
   */
  _computeRiceColor(r, outColor) {
    let cr = 0.92, cg = 0.91, cb = 0.87;
    const heatTint = Math.min(1, Math.max(0, (r.temp - 40) / 130));
    cr = THREE.MathUtils.lerp(cr, 0.95, heatTint * 0.45);
    cg = THREE.MathUtils.lerp(cg, 0.90, heatTint * 0.45);
    cb = THREE.MathUtils.lerp(cb, 0.78, heatTint * 0.45);

    if (r.eggCoat > 0.01) {
      const e = Math.min(1, r.eggCoat * 1.15);
      cr = THREE.MathUtils.lerp(cr, 0.97, e);
      cg = THREE.MathUtils.lerp(cg, 0.76, e);
      cb = THREE.MathUtils.lerp(cb, 0.25, e);
    }
    if (r.soyCoat > 0.01) {
      const s = Math.min(1, r.soyCoat * 1.0);
      cr = THREE.MathUtils.lerp(cr, 0.62, s);
      cg = THREE.MathUtils.lerp(cg, 0.36, s);
      cb = THREE.MathUtils.lerp(cb, 0.14, s);
    }
    // Two-stage browning: 0..0.55 = delicious toasted amber okoge; 0.55..1.0 = unmistakable charred black!
    if (r.brownness > 0.01) {
      const toast = THREE.MathUtils.clamp(r.brownness / 0.55, 0, 1);
      cr = THREE.MathUtils.lerp(cr, 0.52, toast * 0.85);
      cg = THREE.MathUtils.lerp(cg, 0.28, toast * 0.88);
      cb = THREE.MathUtils.lerp(cb, 0.10, toast * 0.90);

      if (r.brownness > 0.55) {
        const charT = THREE.MathUtils.clamp((r.brownness - 0.55) / 0.45, 0, 1);
        cr = THREE.MathUtils.lerp(cr, 0.09, charT);
        cg = THREE.MathUtils.lerp(cg, 0.07, charT);
        cb = THREE.MathUtils.lerp(cb, 0.06, charT);
      }
    }
    outColor.setRGB(cr, cg, cb);
  }

  update(dt) {
    const safeDt = Math.min(dt, 0.035);
    this.simTime += safeDt;
    this.stirGraceTimer = Math.max(0, this.stirGraceTimer - safeDt);

    const targetTemp = 26 + this.heatLevel * 244;
    const rate = targetTemp > this.wokTemp ? 0.68 : 0.28;
    this.wokTemp += (targetTemp - this.wokTemp) * safeDt * rate;
    const heatNorm = THREE.MathUtils.clamp((this.wokTemp - 85) / 175, 0, 1);

    if (this.tossTimer > 0) {
      this.tossTimer = Math.max(0, this.tossTimer - safeDt);
      const p = 1.0 - this.tossTimer / 0.46;
      const arc = Math.sin(p * Math.PI);
      const whip = Math.sin(p * Math.PI * 2);
      this.wokOffset.set(0, arc * 0.095 * this.tossStrength, -arc * 0.085 * this.tossStrength);
      this.wokRot.set(-whip * 0.24 * this.tossStrength, 0, arc * 0.08 * this.tossStrength);
    } else {
      this.wokOffset.lerp(new THREE.Vector3(0, 0, 0), safeDt * 12);
      this.wokRot.x *= Math.max(0, 1 - safeDt * 12);
      this.wokRot.z *= Math.max(0, 1 - safeDt * 12);
    }
    this.wokPivot.position.copy(WOK_POS).add(this.wokOffset);
    this.wokPivot.rotation.copy(this.wokRot);

    // Oil pool visual
    const targetOilScale = this.oilAmount > 0.005 ? 0.24 + this.oilAmount * 0.78 : 0.001;
    const curOilScale = THREE.MathUtils.lerp(this.oilPoolMesh.scale.x, targetOilScale, safeDt * 3.5);
    this.oilPoolMesh.scale.setScalar(curOilScale);
    this.oilUniforms.uTime.value = this.simTime;
    this.oilUniforms.uOpacity.value = THREE.MathUtils.clamp(this.oilAmount * 1.15, 0, 1.0);
    this.oilUniforms.uHeat.value = heatNorm;

    // Deforming & Solidifying Beaten Egg Pools (can also brown/burn if left untouched at roaring high fire!)
    let activeEggMoisture = 0;
    let maxBurnLevel = 0;
    for (const ep of this.eggPools) {
      if (!ep.active) continue;
      ep.radius = THREE.MathUtils.lerp(ep.radius, ep.targetRadius * (0.35 + 0.65 * ep.integrity), safeDt * 2.4);
      const cookRate = heatNorm * (0.20 + this.oilAmount * 0.10);
      ep.cookProgress = Math.min(1.0, ep.cookProgress + safeDt * cookRate);
      if (ep.cookProgress > 0.75 && this.wokTemp > 185) {
        const dryBoost = 1.65 - this.oilAmount * 0.9;
        ep.burnProgress = Math.min(1.0, ep.burnProgress + safeDt * 0.16 * heatNorm * dryBoost);
      }
      maxBurnLevel = Math.max(maxBurnLevel, ep.burnProgress);
      activeEggMoisture += (1.0 - ep.cookProgress * 0.65) * ep.integrity;

      ep.mat.roughness = THREE.MathUtils.lerp(0.08, 0.58, ep.cookProgress);
      ep.mat.clearcoat = THREE.MathUtils.lerp(0.85, 0.15, ep.cookProgress);
      ep.mat.bumpScale = 0.003 + ep.cookProgress * 0.011;

      const pos = ep.geo.attributes.position;
      const col = ep.geo.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        const rn = ep.basePolar[i * 2];
        const ang = ep.basePolar[i * 2 + 1];

        const organic =
          1.0 +
          0.11 * Math.sin(ang * 3.0 + ep.seed) +
          0.07 * Math.cos(ang * 5.0 - ep.seed * 1.4) +
          0.04 * Math.sin(ang * 8.0 + ep.cookProgress * 4.0);
        const rLocal = rn * ep.radius * organic;
        const lx = ep.centerX + Math.cos(ang) * rLocal;
        const lz = ep.centerZ + Math.sin(ang) * rLocal;
        const rFromWok = Math.hypot(lx, lz);

        const centerSmooth = THREE.MathUtils.smoothstep(rn, 0.12, 0.42);
        const edgeMask = THREE.MathUtils.smoothstep(rn, 0.56, 1.0);
        const boilBubble =
          Math.sin(ang * 9.0 + this.simTime * 11.0 + ep.seed) *
          Math.cos(rn * 11.0 - this.simTime * 8.0) *
          0.0065 *
          heatNorm *
          centerSmooth *
          (0.28 + ep.cookProgress);
        const domeConvex = Math.pow(Math.max(0, 1.0 - rn * rn), 0.55);
        const puffLift =
          (0.006 + 0.019 * ep.cookProgress) *
          domeConvex *
          (0.84 + 0.16 * Math.sin(ang * 5.0 + ep.seed) * centerSmooth);
        const rimCurl = edgeMask * ep.cookProgress * 0.011;

        const ly = wokLocalSurfaceY(rFromWok) + 0.006 + puffLift + rimCurl + Math.max(0, boilBubble);
        pos.setXYZ(i, lx, ly, lz);

        const yolkSwirl = 0.5 + 0.5 * Math.sin(rn * 9.0 + ang * 3.0 + ep.seed);
        const rimCook = THREE.MathUtils.clamp(ep.cookProgress * 1.15 + edgeMask * ep.cookProgress * 0.75, 0, 1);
        let er = THREE.MathUtils.lerp(0.86 + yolkSwirl * 0.08, 0.96, rimCook);
        let eg = THREE.MathUtils.lerp(0.48 + yolkSwirl * 0.14, 0.77, rimCook);
        let eb = THREE.MathUtils.lerp(0.03 + yolkSwirl * 0.05, 0.20, rimCook);
        if (edgeMask > 0.65 && heatNorm > 0.15) {
          const foam = (edgeMask - 0.65) * 2.2 * Math.min(1, ep.cookProgress * 2.4);
          er = THREE.MathUtils.lerp(er, 0.98, foam * 0.52);
          eg = THREE.MathUtils.lerp(eg, 0.89, foam * 0.52);
          eb = THREE.MathUtils.lerp(eb, 0.55, foam * 0.52);
        }
        if (ep.burnProgress > 0.02) {
          const b = Math.min(1, ep.burnProgress * (0.7 + edgeMask * 0.6));
          er = THREE.MathUtils.lerp(er, 0.14, b);
          eg = THREE.MathUtils.lerp(eg, 0.09, b);
          eb = THREE.MathUtils.lerp(eb, 0.06, b);
        }
        col.setXYZ(i, er, eg, eb);
      }
      pos.needsUpdate = true;
      col.needsUpdate = true;
      ep.geo.computeVertexNormals();
    }

    // Update Clumps
    for (const cl of this.clumps) {
      cl.vy -= 4.8 * safeDt;
      cl.x += cl.vx * safeDt;
      cl.y += cl.vy * safeDt;
      cl.z += cl.vz * safeDt;
      const dx = cl.x - WOK_POS.x;
      const dz = cl.z - WOK_POS.z;
      const r = Math.hypot(dx, dz);
      const floorY = WOK_POS.y + wokLocalSurfaceY(r) + 0.026;
      if (cl.y < floorY) {
        cl.y = floorY;
        cl.vy = 0;
        cl.vx *= 0.85;
        cl.vz *= 0.85;
        if (r > 0.02) {
          cl.vx -= (dx / r) * 0.45 * safeDt;
          cl.vz -= (dz / r) * 0.45 * safeDt;
        }
      }
    }

    const allowRimSpill = this.tossTimer > 0.02;

    const stepParticle = (p, radiusOff, isRice = false) => {
      if (p.state === STATE_INACTIVE) return false;
      if (p.state === STATE_PLATE) return true;
      if (p.state === STATE_SPILLED) {
        if (p.y > 0.010) {
          p.vy -= 5.8 * safeDt;
          p.x += p.vx * safeDt;
          p.y += p.vy * safeDt;
          p.z += p.vz * safeDt;
          if (p.y <= 0.010) {
            p.y = 0.010;
            p.vx *= 0.25; p.vy = 0; p.vz *= 0.25;
          }
        }
        return true;
      }

      p.vy -= 5.2 * safeDt;
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      p.z += p.vz * safeDt;
      p.rx += p.vrx * safeDt;
      p.ry += p.vry * safeDt;
      p.rz += p.vrz * safeDt;

      if (isRice && p.clumpBond > 0.02 && p.clumpId >= 0) {
        const cl = this.clumps[p.clumpId];
        if (cl) {
          const pull = p.clumpBond * 12.0 * safeDt;
          p.x += (cl.x + p.clumpOffX - p.x) * pull;
          p.y += (cl.y + p.clumpOffY - p.y) * pull;
          p.z += (cl.z + p.clumpOffZ - p.z) * pull;
        }
      }

      const wx = WOK_POS.x + this.wokOffset.x;
      const wy = WOK_POS.y + this.wokOffset.y;
      const wz = WOK_POS.z + this.wokOffset.z;
      const dx = p.x - wx;
      const dz = p.z - wz;
      const dist = Math.hypot(dx, dz);

      // Only spill over wok rim during lively high-energy wok tossing (NOT when gently scooping to plate!)
      if (allowRimSpill && dist > WOK_RADIUS * 1.04 && p.y > wy + WOK_DEPTH - 0.015) {
        p.state = STATE_SPILLED;
        this.spilledCount++;
        p.vx *= 0.52; p.vz *= 0.52;
        return true;
      }

      if (dist > WOK_RADIUS * 0.93) {
        const nx = dx / (dist + 0.0001);
        const nz = dz / (dist + 0.0001);
        p.x = wx + nx * WOK_RADIUS * 0.93;
        p.z = wz + nz * WOK_RADIUS * 0.93;
        p.vx = -p.vx * 0.30 - nx * 0.14;
        p.vz = -p.vz * 0.30 - nz * 0.14;
      }

      const surfY = wy + wokLocalSurfaceY(Math.min(dist, WOK_RADIUS * 0.95)) + radiusOff;
      if (p.y < surfY) {
        p.y = surfY;
        if (p.vy < -0.25) {
          const bounce = isRice ? (0.14 + (1 - p.clumpBond) * 0.16) : 0.2;
          p.vy = -p.vy * bounce;
        } else {
          p.vy = 0;
        }
        if (dist > 0.03) {
          const slope = Math.min(1.6, dist * 3.8);
          p.vx -= (dx / dist) * slope * safeDt;
          p.vz -= (dz / dist) * slope * safeDt;
        }
        if (heatNorm > 0.45 && Math.random() < safeDt * 2.2) {
          p.vy += 0.07 + Math.random() * 0.12 * heatNorm;
        }
        const damp = Math.pow(0.08, safeDt);
        p.vx *= damp; p.vz *= damp;
        p.vrx *= damp; p.vry *= damp; p.vrz *= damp;
      }

      // Balanced realistic cooking & charring physics:
      // - Oiled + actively stirred/tossed on high fire -> golden parapara -> fragrant crispy okoge (NEVER burns black in 4s!)
      // - Dry (no oil) or untouched for 8–12+ seconds on high fire -> visibly chars dark brown/black (`burnt: true`) + dark smoke!
      if (p.y < surfY + 0.088) {
        const contactFactor = p.y < surfY + 0.015 ? 1.12 : 0.85;
        const oilProtection = THREE.MathUtils.clamp(this.oilAmount * 1.45, 0, 1);
        const activelyStirred = this.stirGraceTimer > 0;
        const dryMult = 1.0 + (1.0 - oilProtection) * 1.45;
        const idleMult = activelyStirred ? 0.16 : 1.0;
        const maxActiveBrown = activelyStirred && oilProtection > 0.20 ? 0.42 : 1.0;

        if (isRice) {
          p.temp += (this.wokTemp - p.temp) * safeDt * 1.30 * contactFactor;
          if (p.temp > 158) {
            const tempExcess = THREE.MathUtils.clamp((p.temp - 152) / 100, 0.15, 1.30);
            const inc = safeDt * 0.042 * tempExcess * dryMult * idleMult * contactFactor;
            if (p.brownness < maxActiveBrown) {
              p.brownness = Math.min(maxActiveBrown, p.brownness + inc);
            }
          }
          if (this.oilAmount > 0.1 && p.temp > 120) {
            p.clumpBond = Math.max(0, p.clumpBond - safeDt * 0.035);
          }
        } else if (p.brownness !== undefined) {
          if (this.wokTemp > 148) {
            const inc = safeDt * 0.044 * heatNorm * dryMult * idleMult * contactFactor;
            if (p.brownness < maxActiveBrown) {
              p.brownness = Math.min(maxActiveBrown, p.brownness + inc);
            }
          }
          if (p.cooked !== undefined && this.wokTemp > 115) {
            p.cooked = Math.min(1.0, p.cooked + safeDt * 0.16 * heatNorm);
          }
        }
      }
      return true;
    };

    let wokFoodCount = 0;
    let wokBurnSum = 0;
    let wokRiceCount = 0;

    for (let i = 0; i < MAX_RICE; i++) {
      const r = this.rice[i];
      if (!stepParticle(r, 0.0055, true)) continue;
      if (r.state === STATE_WOK) {
        wokFoodCount++;
        wokRiceCount++;
        wokBurnSum += r.brownness;
      }

      _pos.set(r.x, r.y, r.z);
      _euler.set(r.rx, r.ry, r.rz);
      _quat.setFromEuler(_euler);
      _scale.setScalar(r.scale);
      _mat4.compose(_pos, _quat, _scale);
      this.riceMesh.setMatrixAt(i, _mat4);
      this._computeRiceColor(r, _col);
      this.riceMesh.setColorAt(i, _col);
    }
    this.riceMesh.instanceMatrix.needsUpdate = true;
    this.riceMesh.instanceColor.needsUpdate = true;

    if (wokRiceCount > 0) {
      maxBurnLevel = Math.max(maxBurnLevel, wokBurnSum / wokRiceCount);
    }

    for (let i = 0; i < MAX_CURDS; i++) {
      const c = this.curds[i];
      if (!stepParticle(c, 0.011, false)) continue;
      if (c.state === STATE_WOK) wokFoodCount++;

      _pos.set(c.x, c.y, c.z);
      _euler.set(c.rx, c.ry, c.rz);
      _quat.setFromEuler(_euler);
      _scale.setScalar(c.scale);
      _mat4.compose(_pos, _quat, _scale);
      this.curdMesh.setMatrixAt(i, _mat4);

      // Rich warm golden-yolk / creamy omelette scrambled egg color (ZERO greenish-yellow plastic tint!)
      const ws = c.warmShade || 0.5;
      const baseR = THREE.MathUtils.lerp(0.99, 0.98, ws);
      const baseG = THREE.MathUtils.lerp(0.79, 0.65, ws);
      const baseB = THREE.MathUtils.lerp(0.32, 0.14, ws);
      const toast = THREE.MathUtils.clamp(c.brownness / 0.55, 0, 1);
      let cr = THREE.MathUtils.lerp(baseR, 0.60, toast * 0.72 + c.soyCoat * 0.35);
      let cg = THREE.MathUtils.lerp(baseG, 0.35, toast * 0.78 + c.soyCoat * 0.45);
      let cb = THREE.MathUtils.lerp(baseB, 0.10, toast * 0.85 + c.soyCoat * 0.45);
      if (c.brownness > 0.55) {
        const ch = (c.brownness - 0.55) / 0.45;
        cr = THREE.MathUtils.lerp(cr, 0.10, ch);
        cg = THREE.MathUtils.lerp(cg, 0.08, ch);
        cb = THREE.MathUtils.lerp(cb, 0.06, ch);
      }
      _col.setRGB(cr, cg, cb);
      this.curdMesh.setColorAt(i, _col);
    }
    this.curdMesh.instanceMatrix.needsUpdate = true;
    this.curdMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < MAX_HAM; i++) {
      const h = this.hams[i];
      if (!stepParticle(h, 0.009, false)) continue;
      if (h.state === STATE_WOK) wokFoodCount++;

      _pos.set(h.x, h.y, h.z);
      _euler.set(h.rx, h.ry, h.rz);
      _quat.setFromEuler(_euler);
      _scale.setScalar(h.scale);
      _mat4.compose(_pos, _quat, _scale);
      this.hamMesh.setMatrixAt(i, _mat4);

      const sear = Math.min(1, h.brownness * 0.9 + h.soyCoat * 0.35);
      let hr = THREE.MathUtils.lerp(1.0, 0.55, sear);
      let hg = THREE.MathUtils.lerp(1.0, 0.38, sear);
      let hb = THREE.MathUtils.lerp(1.0, 0.28, sear);
      if (h.brownness > 0.55) {
        const ch = (h.brownness - 0.55) / 0.45;
        hr = THREE.MathUtils.lerp(hr, 0.12, ch);
        hg = THREE.MathUtils.lerp(hg, 0.09, ch);
        hb = THREE.MathUtils.lerp(hb, 0.08, ch);
      }
      _col.setRGB(hr, hg, hb);
      this.hamMesh.setColorAt(i, _col);
    }
    this.hamMesh.instanceMatrix.needsUpdate = true;
    this.hamMesh.instanceColor.needsUpdate = true;

    for (let i = 0; i < MAX_NEGI; i++) {
      const ng = this.negis[i];
      if (!stepParticle(ng, 0.005, false)) continue;
      if (ng.state === STATE_WOK) wokFoodCount++;

      _pos.set(ng.x, ng.y, ng.z);
      _euler.set(ng.rx, ng.ry, ng.rz);
      _quat.setFromEuler(_euler);
      _scale.setScalar(ng.scale);
      _mat4.compose(_pos, _quat, _scale);
      this.negiMesh.setMatrixAt(i, _mat4);

      if (ng.brownness > 0.55) {
        const ch = (ng.brownness - 0.55) / 0.45;
        _col.setRGB(THREE.MathUtils.lerp(0.18, 0.08, ch), THREE.MathUtils.lerp(0.24, 0.07, ch), THREE.MathUtils.lerp(0.10, 0.06, ch));
      } else if (ng.hueVariant > 0.8) {
        _col.setHSL(0.24, 0.25, THREE.MathUtils.lerp(0.74, 0.52, ng.cooked));
      } else {
        const rawLight = 0.30 + ng.hueVariant * 0.16;
        const cookedLight = 0.20 + ng.hueVariant * 0.05;
        _col.setHSL(0.28 - ng.cooked * 0.02, 0.54 + ng.cooked * 0.10, THREE.MathUtils.lerp(rawLight, cookedLight, ng.cooked));
      }
      this.negiMesh.setColorAt(i, _col);
    }
    this.negiMesh.instanceMatrix.needsUpdate = true;
    this.negiMesh.instanceColor.needsUpdate = true;

    // Backlit Oil Smoke + Dark Charcoal Smoke when burning!
    const foodNorm = Math.min(1, wokFoodCount / 260);
    const burnDarkness = THREE.MathUtils.smoothstep(maxBurnLevel, 0.42, 0.88);
    const smokeRate =
      heatNorm * (this.oilAmount * 12.0 + foodNorm * 14.0 + activeEggMoisture * 16.0 + burnDarkness * 22.0 + (this.heatLevel > 0.7 ? 7.0 : 1.8));
    this.smokeAccum += safeDt * smokeRate;
    while (this.smokeAccum >= 1) {
      this.smokeAccum -= 1;
      this.spawnSmoke(
        WOK_POS.x + this.wokOffset.x,
        WOK_POS.y + 0.09 + this.wokOffset.y,
        WOK_POS.z + this.wokOffset.z,
        1,
        {
          warmth: 0.55 + this.oilAmount * 0.35 + heatNorm * 0.2,
          alpha: 0.14 + heatNorm * 0.12 + burnDarkness * 0.18,
          speed: 0.28 + heatNorm * 0.32,
          size0: 0.10,
          size1: 0.42 + heatNorm * 0.26 + burnDarkness * 0.22,
          darkness: burnDarkness,
        }
      );
    }
    if (this.platedScoops > 0 && Math.random() < safeDt * 3.5) {
      this.spawnSmoke(
        this.plateStation.position.x - 0.02,
        this.plateStation.position.y + 0.10,
        this.plateStation.position.z,
        1,
        { warmth: 0.45, alpha: 0.13, speed: 0.18, size0: 0.07, size1: 0.26 }
      );
    }

    let activeSmokeLevel = 0;
    for (let i = 0; i < MAX_SMOKE; i++) {
      const s = this.smokes[i];
      if (!s.active) {
        this.smokeAlphas[i] = 0;
        continue;
      }
      s.age += safeDt;
      if (s.age >= s.life) {
        s.active = false;
        this.smokeAlphas[i] = 0;
        _mat4.makeScale(0, 0, 0);
        this.smokeMesh.setMatrixAt(i, _mat4);
        continue;
      }
      const t = s.age / s.life;
      s.x += (s.vx + Math.sin(this.simTime * 2.2 + i) * 0.05) * safeDt;
      s.y += s.vy * (1.0 - t * 0.25) * safeDt;
      s.z += (s.vz + Math.cos(this.simTime * 1.9 + i) * 0.04) * safeDt;
      s.rot += s.vrot * safeDt;

      const sz = THREE.MathUtils.lerp(s.size0, s.size1, Math.pow(t, 0.72));
      const fade = Math.sin(t * Math.PI) * (1.0 - t * 0.3);
      this.smokeAlphas[i] = fade * s.maxAlpha;
      this.smokeWarmths[i] = s.warmth;
      this.smokeDarkness[i] = s.darkness;
      this.smokeRots[i] = s.rot;
      activeSmokeLevel += this.smokeAlphas[i];

      _pos.set(s.x, s.y, s.z);
      _quat.identity();
      _scale.setScalar(sz);
      _mat4.compose(_pos, _quat, _scale);
      this.smokeMesh.setMatrixAt(i, _mat4);
    }
    this.smokeMesh.instanceMatrix.needsUpdate = true;
    this.smokeMesh.geometry.attributes.aAlpha.needsUpdate = true;
    this.smokeMesh.geometry.attributes.aWarmth.needsUpdate = true;
    this.smokeMesh.geometry.attributes.aDarkness.needsUpdate = true;
    this.smokeMesh.geometry.attributes.aRot.needsUpdate = true;

    if (heatNorm > 0.35 && (this.oilAmount > 0.1 || activeEggMoisture > 0.1) && Math.random() < safeDt * 9 * heatNorm) {
      this.spawnDroplet(WOK_POS.x, WOK_POS.y + 0.06, WOK_POS.z, 1);
    }
    for (let i = 0; i < MAX_DROPLETS; i++) {
      const d = this.droplets[i];
      if (!d.active) continue;
      d.age += safeDt;
      if (d.age >= d.life) {
        d.active = false;
        _mat4.makeScale(0, 0, 0);
        this.dropMesh.setMatrixAt(i, _mat4);
        continue;
      }
      d.vy -= 4.8 * safeDt;
      d.x += d.vx * safeDt;
      d.y += d.vy * safeDt;
      d.z += d.vz * safeDt;
      _pos.set(d.x, d.y, d.z);
      _quat.identity();
      _scale.setScalar(1.0 - (d.age / d.life) * 0.6);
      _mat4.compose(_pos, _quat, _scale);
      this.dropMesh.setMatrixAt(i, _mat4);
    }
    this.dropMesh.instanceMatrix.needsUpdate = true;

    return {
      wokFoodNorm: foodNorm,
      moisture: Math.min(1, activeEggMoisture * 0.8 + foodNorm * 0.45),
      smokeIntensity: Math.min(1, activeSmokeLevel * 0.08),
      burnLevel: maxBurnLevel,
    };
  }
}
