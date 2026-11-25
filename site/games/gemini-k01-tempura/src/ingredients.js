import * as THREE from 'three';

/**
 * Photorealistic Tempura Ingredients — Zero Plastic Food-Sample / Low-Poly Look:
 * - Kuruma-Ebi Shrimp: asymmetric overlapping 6-segment dorsal somite ridges, glassy pearlescent raw translucency,
 *   delicate curved 5-blade veined amber-crimson tail fan -> turns coral-orange & curls gently when fried.
 * - Renkon (Lotus Root): high-segment (36-seg) smooth organic lobed slice with 8 varied teardrop chambers,
 *   starchy fibrous cross-section, smooth bevelled porous batter coat + delicate rim/hole-edge hana crumbs.
 * - Shiso (Oba Leaf): 22x18 subdivided 3D quilted botanical leaf with raised veins, chirimen puckering & ruffled curl.
 * - Kabocha (Pumpkin): smooth organic 28-seg crescent with concave seed pocket, bumpy mottled green rind & fibrous orange flesh.
 * - Nasu (Fan-cut Eggplant): gracefully arched 5-petal bulbous Japanese eggplant with glossy violet-black skin & spongy seeded interior.
 */

export const INGREDIENT_TYPES = ['ebi', 'kabocha', 'nasu', 'renkon', 'shiso'];

// Ultra-fine delicate crinkled crispy tempura "hana" micro-flake (~28 tris/flake -> lush dense lacy texture under 180k tris!)
let sharedHanaFlakeGeo = null;
function getHanaFlakeGeo() {
  if (sharedHanaFlakeGeo) return sharedHanaFlakeGeo;
  const shape = new THREE.Shape();
  const spikes = 5;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const isPeak = i % 2 === 0;
    const r = (isPeak ? 0.0108 : 0.0048) * (0.78 + 0.38 * Math.abs(Math.sin(i * 3.1)));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.82;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.0024,
    bevelEnabled: false,
  });
  g.center();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const crinkle = Math.sin(x * 320 + y * 240) * 0.0026;
    p.setXYZ(i, x, y, z + crinkle);
  }
  g.computeVertexNormals();
  sharedHanaFlakeGeo = g;
  return g;
}

/**
 * Builds a smooth, high-segment anatomical porous batter coat wrapping each ingredient
 * (ZERO faceted flat polygon distortions on renkon/kabocha!).
 */
function buildCohesiveCoatGeometry(type) {
  let g;
  if (type === 'ebi') {
    const segsU = 22;
    const segsV = 16;
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let u = 0; u <= segsU; u++) {
      const t = u / segsU;
      const x = -0.100 + t * 0.192;
      const archY = Math.sin(t * Math.PI) * 0.022 - t * t * 0.008;
      const curveZ = Math.sin(t * Math.PI) * 0.012;
      const endPinch = Math.sin(Math.min(1, t * 7.5) * Math.PI * 0.5) * Math.sin(Math.min(1, (1 - t) * 7.5) * Math.PI * 0.5);
      const radW = (0.029 * (1 - t * 0.56) + 0.0085) * (0.48 + 0.52 * endPinch);
      const radH = radW * 0.92;
      for (let v = 0; v <= segsV; v++) {
        const phi = (v / segsV) * Math.PI * 2;
        const lace = 1.0 + Math.sin(t * 34 + phi * 5) * 0.09 + Math.cos(t * 62 - phi * 7) * 0.055;
        const py = archY + Math.sin(phi) * radH * lace;
        const pz = curveZ + Math.cos(phi) * radW * lace;
        positions.push(x, py, pz);
        uvs.push(t * 2.4, v / segsV);
      }
    }
    for (let u = 0; u < segsU; u++) {
      for (let v = 0; v < segsV; v++) {
        const a = u * (segsV + 1) + v;
        const b = (u + 1) * (segsV + 1) + v;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  } else if (type === 'kabocha') {
    const shape = new THREE.Shape();
    shape.moveTo(-0.088, -0.026);
    shape.bezierCurveTo(-0.046, 0.052, 0.046, 0.052, 0.088, -0.026);
    shape.quadraticCurveTo(0.032, -0.004, 0.0, 0.004);
    shape.quadraticCurveTo(-0.032, -0.004, -0.088, -0.026);
    g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.023,
      bevelEnabled: true,
      bevelThickness: 0.0055,
      bevelSize: 0.0045,
      bevelSegments: 3,
      curveSegments: 28,
    });
    g.center();
    g.rotateX(Math.PI / 2);
  } else if (type === 'nasu') {
    g = new THREE.SphereGeometry(0.068, 20, 14);
    g.scale(1.16, 0.24, 0.88);
    g.translate(0.012, 0.002, 0);
  } else if (type === 'renkon') {
    // High-segment (36) smooth organic perforated lotus batter wrap — ZERO polygonal corners!
    const wheel = new THREE.Shape();
    const rimSteps = 40;
    for (let i = 0; i <= rimSteps; i++) {
      const a = (i / rimSteps) * Math.PI * 2;
      const r = 0.076 * (1.0 + Math.sin(a * 3 + 0.5) * 0.042 + Math.cos(a * 5) * 0.022);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.94;
      if (i === 0) wheel.moveTo(x, y);
      else wheel.lineTo(x, y);
    }
    wheel.closePath();

    const holeSpecs = [
      { a: 0.0, d: 0.040, r: 0.0105 },
      { a: 0.78, d: 0.039, r: 0.0095 },
      { a: 1.56, d: 0.041, r: 0.0110 },
      { a: 2.38, d: 0.038, r: 0.0090 },
      { a: 3.16, d: 0.040, r: 0.0102 },
      { a: 3.96, d: 0.039, r: 0.0098 },
      { a: 4.74, d: 0.041, r: 0.0112 },
      { a: 5.52, d: 0.037, r: 0.0085 },
    ];
    holeSpecs.forEach((h) => {
      const hole = new THREE.Path();
      hole.absarc(Math.cos(h.a) * h.d, Math.sin(h.a) * h.d * 0.94, h.r, 0, Math.PI * 2, true);
      wheel.holes.push(hole);
    });

    g = new THREE.ExtrudeGeometry(wheel, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 3,
      curveSegments: 20,
    });
    g.center();
    g.rotateX(Math.PI / 2);
    // Gentle micro-relief ONLY (preserves smooth organic round rim & crisp lotus holes!)
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const micro = Math.sin(x * 130 + z * 115) * 0.0018;
      p.setXYZ(i, x, y + micro, z);
    }
    g.computeVertexNormals();
    return g;
  } else {
    // Delicate thin underside lace veil matching cupped shiso curvature
    g = new THREE.PlaneGeometry(0.145, 0.11, 14, 10);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x / 0.074, z / 0.056);
      const pull = r > 1 ? 1 / r : 1;
      const nx = x * pull;
      const nz = z * pull;
      const cup = (nz * nz) * 2.1 - (nx * nx) * 0.95;
      p.setXYZ(i, nx, cup - 0.004, nz);
    }
    g.computeVertexNormals();
    return g;
  }

  // Gentle organic bump on kabocha/nasu coat (no harsh low-poly spikes!)
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = Math.sin(x * 105 + y * 120) * Math.cos(z * 100);
    p.setXYZ(i, x * (1 + n * 0.04), y + n * 0.0022, z * (1 + n * 0.04));
  }
  g.computeVertexNormals();
  return g;
}

function buildIngredientGeometry(type, textures) {
  const bodyGroup = new THREE.Group();
  const hanaAnchors = [];
  let primaryMat = null;
  let extraUpdate = null;
  let groundOffset = 0.024;

  if (type === 'ebi') {
    // 1. Anatomically Sculpted Translucent Kuruma-Ebi Shrimp (車エビ)
    groundOffset = 0.025;
    const segsU = 32;
    const segsV = 20;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let u = 0; u <= segsU; u++) {
      const t = u / segsU;
      const x = -0.098 + t * 0.194;
      const archY = Math.sin(t * Math.PI) * 0.023 - t * t * 0.008;
      const bendZ = Math.sin(t * Math.PI) * 0.013;

      // Asymmetric anatomical overlapping somite shell ridges (6 muscle segments!)
      const segFrac = (t * 6.0) % 1.0;
      const somiteStep = (0.94 + 0.12 * Math.sin(segFrac * Math.PI * 0.85)) * (1 - t * 0.25) + t * 0.25;
      const frontTaper = t < 0.08 ? (0.34 + (t / 0.08) * 0.66) : 1.0;
      const radW = (0.028 * (1 - t * 0.64) + 0.0068) * somiteStep * frontTaper;
      const radH = radW * 1.10;

      for (let v = 0; v <= segsV; v++) {
        const phi = (v / segsV) * Math.PI * 2;
        const dorsalFactor = Math.sin(phi) > 0 ? 1.12 : 0.78;
        const sidePinch = 0.84 + 0.16 * Math.abs(Math.sin(phi));
        const py = archY + Math.sin(phi) * radH * dorsalFactor;
        const pz = bendZ + Math.cos(phi) * radW * sidePinch;
        positions.push(x, py, pz);
        uvs.push(t, v / segsV);
      }
    }
    for (let u = 0; u < segsU; u++) {
      for (let v = 0; v < segsV; v++) {
        const a = u * (segsV + 1) + v;
        const b = (u + 1) * (segsV + 1) + v;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
    const shrimpGeo = new THREE.BufferGeometry();
    shrimpGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    shrimpGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    shrimpGeo.setIndex(indices);
    shrimpGeo.computeVertexNormals();

    // Glassy translucent raw shrimp flesh -> opaque succulent coral-orange when fried!
    primaryMat = new THREE.MeshPhysicalMaterial({
      color: 0xeae2dc,
      map: textures.shrimpColor,
      bumpMap: textures.shrimpBump,
      bumpScale: 0.008,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.78,
      ior: 1.38,
      thickness: 0.072,
      attenuationColor: new THREE.Color(0xffb89a),
      attenuationDistance: 0.075,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      sheen: 0.45,
      sheenColor: new THREE.Color(0xfff0e6),
    });

    const shrimpBody = new THREE.Mesh(shrimpGeo, primaryMat);
    shrimpBody.castShadow = true;
    shrimpBody.receiveShadow = true;
    bodyGroup.add(shrimpBody);

    // Paper-thin gracefully curved 5-blade translucent striated shrimp tail fan!
    const tailMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: textures.shrimpTail,
      roughness: 0.16,
      clearcoat: 0.94,
      clearcoatRoughness: 0.08,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xff9a74),
      side: THREE.DoubleSide,
    });
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0.094, -0.006, 0.001);

    const bladeSpecs = [
      { angle: -0.44, len: 0.056, w: 0.015, yTilt: -0.14 },
      { angle: -0.21, len: 0.052, w: 0.013, yTilt: -0.05 },
      { angle: 0.0, len: 0.044, w: 0.0085, yTilt: 0.04 },
      { angle: 0.21, len: 0.052, w: 0.013, yTilt: -0.05 },
      { angle: 0.44, len: 0.056, w: 0.015, yTilt: -0.14 },
    ];
    bladeSpecs.forEach((b) => {
      // Subdivided curved thin tail-fin blade (guaranteed non-degenerate width -> ZERO black normal artifacts!)
      const fg = new THREE.PlaneGeometry(b.len, b.w, 8, 4);
      fg.rotateX(-Math.PI / 2);
      fg.translate(b.len * 0.5, 0, 0);
      const fp = fg.attributes.position;
      for (let k = 0; k < fp.count; k++) {
        const fx = fp.getX(k);
        const fz = fp.getZ(k);
        const t = THREE.MathUtils.clamp(fx / b.len, 0.01, 0.99);
        const env = Math.sin(Math.pow(t, 0.65) * Math.PI);
        const widthFactor = 0.28 + env * 0.85;
        const arch = -fx * fx * 1.45;
        fp.setXYZ(k, fx, arch, fz * widthFactor);
      }
      fg.computeVertexNormals();
      const fin = new THREE.Mesh(fg, tailMat);
      fin.rotation.y = b.angle;
      fin.rotation.z = b.yTilt;
      fin.castShadow = true;
      tailGroup.add(fin);
    });
    bodyGroup.add(tailGroup);

    // 56 fine delicate wispy hana flake anchors hugging the shrimp contour!
    for (let i = 0; i < 56; i++) {
      const t = (i / 56) * 0.86;
      const x = -0.095 + t * 0.185;
      const archY = Math.sin(t * Math.PI) * 0.022 - t * t * 0.008;
      const bendZ = Math.sin(t * Math.PI) * 0.012;
      const ang = i * 2.39996;
      const r = 0.029 * (1 - t * 0.54) + 0.007;
      hanaAnchors.push({
        pos: new THREE.Vector3(x, archY + Math.sin(ang) * r * 0.90, bendZ + Math.cos(ang) * r),
        baseScale: 0.72 + (1 - t) * 0.34 + Math.sin(i * 3.9) * 0.22,
      });
    }

    const rawCol = new THREE.Color(0xeae2dc);
    const cookedCol = new THREE.Color(0xf26438);
    const tailRaw = new THREE.Color(0xdfb8a8);
    const tailCooked = new THREE.Color(0xff5232);

    extraUpdate = (doneness) => {
      const k = Math.min(1, doneness / 0.60);
      primaryMat.transmission = THREE.MathUtils.lerp(0.78, 0.02, k);
      primaryMat.color.copy(rawCol).lerp(cookedCol, k);
      primaryMat.roughness = THREE.MathUtils.lerp(0.08, 0.30, k);
      tailMat.color.copy(tailRaw).lerp(tailCooked, k);
      tailGroup.rotation.y = k * 0.28;
      tailGroup.rotation.z = -k * 0.24;
    };
  } else if (type === 'kabocha') {
    // 2. Smooth Sculpted Kabocha Pumpkin Wedge (28 curve segs + concave seed pocket + mottled ridged green rind!)
    groundOffset = 0.017;
    const shape = new THREE.Shape();
    shape.moveTo(-0.086, -0.028);
    shape.bezierCurveTo(-0.045, 0.049, 0.045, 0.049, 0.086, -0.028);
    shape.quadraticCurveTo(0.032, -0.006, 0.0, 0.002);
    shape.quadraticCurveTo(-0.032, -0.006, -0.086, -0.028);

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.020,
      bevelEnabled: true,
      bevelThickness: 0.0045,
      bevelSize: 0.0035,
      bevelSegments: 3,
      curveSegments: 28,
    });
    extrudeGeo.center();
    extrudeGeo.rotateX(Math.PI / 2);
    const kp = extrudeGeo.attributes.position;
    for (let i = 0; i < kp.count; i++) {
      const kx = kp.getX(i);
      const kz = kp.getZ(i);
      kp.setY(i, kp.getY(i) + Math.sin(kx * 22) * 0.003 - (kx * kx) * 0.35 + Math.cos(kz * 28) * 0.0018);
    }
    extrudeGeo.computeVertexNormals();

    primaryMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.kabochaFlesh,
      bumpMap: textures.batterBump,
      bumpScale: 0.006,
      roughness: 0.50,
    });
    const flesh = new THREE.Mesh(extrudeGeo, primaryMat);
    flesh.castShadow = true;
    flesh.receiveShadow = true;
    bodyGroup.add(flesh);

    const rindPts = [];
    for (let i = 0; i <= 20; i++) {
      const f = i / 20;
      const x = THREE.MathUtils.lerp(-0.086, 0.086, f);
      const z = -Math.sin(f * Math.PI) * 0.052 + 0.022;
      const y = -(x * x) * 0.35;
      rindPts.push(new THREE.Vector3(x, y, z));
    }
    const rindGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rindPts), 28, 0.013, 10, false);
    const rp = rindGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const bump = 0.90 + 0.18 * Math.sin(rp.getX(i) * 95 + rp.getZ(i) * 110);
      rp.setXYZ(i, rp.getX(i), rp.getY(i) * 0.86 * bump, rp.getZ(i) * bump);
    }
    rindGeo.computeVertexNormals();
    const rindMat = new THREE.MeshStandardMaterial({
      map: textures.kabochaRind,
      bumpMap: textures.shisoBump,
      bumpScale: 0.009,
      roughness: 0.42,
    });
    const rind = new THREE.Mesh(rindGeo, rindMat);
    rind.castShadow = true;
    bodyGroup.add(rind);

    for (let i = 0; i < 34; i++) {
      const f = (i % 17) / 16;
      const side = i < 17 ? 1 : -1;
      const x = THREE.MathUtils.lerp(-0.078, 0.078, f);
      const z = -Math.sin(f * Math.PI) * 0.032 + ((i % 3) - 1) * 0.014;
      hanaAnchors.push({
        pos: new THREE.Vector3(x, side * 0.014, z),
        baseScale: 0.70 + Math.sin(f * Math.PI) * 0.35,
      });
    }

    const rawTint = new THREE.Color(0xffffff);
    const cookedTint = new THREE.Color(0xffc966);
    extraUpdate = (doneness) => {
      primaryMat.color.copy(rawTint).lerp(cookedTint, Math.min(1, doneness / 0.8));
    };
  } else if (type === 'nasu') {
    // 3. Gracefully Arched Bulbous Fan-Cut Eggplant (茶筅なす)
    groundOffset = 0.018;
    primaryMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.nasuFlesh,
      bumpMap: textures.batterBump,
      bumpScale: 0.005,
      roughness: 0.60,
    });
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0x200a2e,
      roughness: 0.10,
      clearcoat: 0.98,
      clearcoatRoughness: 0.05,
      sheen: 0.38,
      sheenColor: new THREE.Color(0x5a2e78),
    });
    const calyxMat = new THREE.MeshStandardMaterial({
      color: 0x29441f,
      bumpMap: textures.shisoBump,
      bumpScale: 0.006,
      roughness: 0.54,
    });

    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.098, 0.010, 0),
      new THREE.Vector3(-0.082, 0.005, 0),
      new THREE.Vector3(-0.066, 0, 0),
    ]);
    bodyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 10, 0.0065, 8, false), calyxMat));

    const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.034, 9), calyxMat);
    calyx.rotation.z = Math.PI / 2;
    calyx.scale.set(1.0, 1.0, 1.15);
    calyx.position.set(-0.064, 0.002, 0);
    bodyGroup.add(calyx);

    const fanSlices = [];
    for (let s = 0; s < 5; s++) {
      const slicePivot = new THREE.Group();
      slicePivot.position.set(-0.056, 0, 0);
      const baseAngle = (s - 2) * 0.16;
      slicePivot.rotation.y = baseAngle;

      const pShape = new THREE.Shape();
      pShape.moveTo(0, -0.0065);
      pShape.bezierCurveTo(0.045, -0.016, 0.095, -0.015, 0.124, -0.005);
      pShape.quadraticCurveTo(0.135, 0, 0.124, 0.005);
      pShape.bezierCurveTo(0.095, 0.015, 0.045, 0.016, 0, 0.0065);
      pShape.closePath();

      const sliceGeo = new THREE.ExtrudeGeometry(pShape, {
        depth: 0.015,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.002,
        bevelSegments: 2,
        curveSegments: 16,
      });
      sliceGeo.rotateX(Math.PI / 2);
      sliceGeo.translate(0, 0.008, 0);
      // Natural gentle downward arch of Japanese eggplant petals!
      const sp = sliceGeo.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        const sx = sp.getX(i);
        sp.setY(i, sp.getY(i) + Math.sin((sx / 0.135) * Math.PI) * 0.007 - sx * 0.04);
      }
      sliceGeo.computeVertexNormals();
      const sliceFlesh = new THREE.Mesh(sliceGeo, primaryMat);
      sliceFlesh.castShadow = true;
      slicePivot.add(sliceFlesh);

      const skinGeo = new THREE.ExtrudeGeometry(pShape, { depth: 0.0038, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 16 });
      skinGeo.rotateX(Math.PI / 2);
      skinGeo.translate(0, 0.0115, 0);
      const skp = skinGeo.attributes.position;
      for (let i = 0; i < skp.count; i++) {
        const sx = skp.getX(i);
        skp.setY(i, skp.getY(i) + Math.sin((sx / 0.135) * Math.PI) * 0.007 - sx * 0.04);
      }
      skinGeo.computeVertexNormals();
      slicePivot.add(new THREE.Mesh(skinGeo, skinMat));

      bodyGroup.add(slicePivot);
      fanSlices.push({ pivot: slicePivot, baseAngle });
    }

    for (let i = 0; i < 34; i++) {
      const s = i % 5;
      const frac = 0.20 + Math.floor(i / 5) * 0.125;
      const ang = (s - 2) * 0.17;
      const len = frac * 0.132;
      hanaAnchors.push({
        pos: new THREE.Vector3(-0.052 + Math.cos(ang) * len, (i % 2 === 0 ? 1 : -1) * 0.011, -Math.sin(ang) * len),
        baseScale: 0.65 + frac * 0.35,
      });
    }

    const rawFlesh = new THREE.Color(0xffffff);
    const friedFlesh = new THREE.Color(0xdfb870);
    extraUpdate = (doneness) => {
      const k = Math.min(1, doneness / 0.85);
      primaryMat.color.copy(rawFlesh).lerp(friedFlesh, k);
      fanSlices.forEach((fs) => {
        fs.pivot.rotation.y = fs.baseAngle * (1.0 + k * 0.48);
      });
    };
  } else if (type === 'renkon') {
    // 4. Ultra-Smooth Organic Perforated Lotus Root Slice (40 rim segs, 20 hole segs -> ZERO polygonal facets!)
    groundOffset = 0.016;
    const wheel = new THREE.Shape();
    const rimSteps = 40;
    for (let i = 0; i <= rimSteps; i++) {
      const a = (i / rimSteps) * Math.PI * 2;
      const r = 0.072 * (1.0 + Math.sin(a * 3 + 0.5) * 0.042 + Math.cos(a * 5) * 0.022);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.94;
      if (i === 0) wheel.moveTo(x, y);
      else wheel.lineTo(x, y);
    }
    wheel.closePath();

    const centerHole = new THREE.Path();
    centerHole.absarc(0.002, -0.001, 0.0062, 0, Math.PI * 2, true);
    wheel.holes.push(centerHole);

    const holeSpecs = [
      { a: 0.0, d: 0.040, r: 0.0132 },
      { a: 0.78, d: 0.039, r: 0.0118 },
      { a: 1.56, d: 0.041, r: 0.0138 },
      { a: 2.38, d: 0.038, r: 0.0114 },
      { a: 3.16, d: 0.040, r: 0.0128 },
      { a: 3.96, d: 0.039, r: 0.0122 },
      { a: 4.74, d: 0.041, r: 0.0140 },
      { a: 5.52, d: 0.037, r: 0.0104 },
    ];
    holeSpecs.forEach((h) => {
      const hole = new THREE.Path();
      hole.absarc(Math.cos(h.a) * h.d, Math.sin(h.a) * h.d * 0.94, h.r, 0, Math.PI * 2, true);
      wheel.holes.push(hole);
    });

    const renkonGeo = new THREE.ExtrudeGeometry(wheel, {
      depth: 0.019,
      bevelEnabled: true,
      bevelThickness: 0.0038,
      bevelSize: 0.0028,
      bevelSegments: 3,
      curveSegments: 20,
    });
    renkonGeo.center();
    renkonGeo.rotateX(Math.PI / 2);

    primaryMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.renkonFlesh,
      bumpMap: textures.batterBump,
      bumpScale: 0.0045,
      roughness: 0.52,
    });
    const lotusMesh = new THREE.Mesh(renkonGeo, primaryMat);
    lotusMesh.castShadow = true;
    lotusMesh.receiveShadow = true;
    bodyGroup.add(lotusMesh);

    const rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.0095, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x8a6946, bumpMap: textures.woodBump, bumpScale: 0.006, roughness: 0.72 })
    );
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.scale.set(1.0, 0.94, 1.0);
    bodyGroup.add(rimMesh);

    // 38 delicate crisp hana crumbs around outer rim AND around inner lotus hole edges!
    for (let i = 0; i < 38; i++) {
      const a = (i / 38) * Math.PI * 2;
      const onRim = i % 3 !== 0;
      const r = onRim ? 0.068 + Math.sin(i * 2.1) * 0.007 : 0.025 + Math.cos(i * 3.1) * 0.006;
      hanaAnchors.push({
        pos: new THREE.Vector3(Math.cos(a) * r, (i % 2 === 0 ? 1 : -1) * 0.013, Math.sin(a) * r * 0.94),
        baseScale: 0.65 + (i % 4) * 0.12,
      });
    }

    const rawRenkon = new THREE.Color(0xffffff);
    const cookedRenkon = new THREE.Color(0xe6c178);
    extraUpdate = (doneness) => {
      primaryMat.color.copy(rawRenkon).lerp(cookedRenkon, Math.min(1, doneness / 0.9));
    };
  } else {
    // 5. Real 3D Quilted Botanical Shiso / Oba Leaf (22x18 subdivided mesh with raised veins & chirimen puckering!)
    groundOffset = 0.015;
    const leafGeo = new THREE.PlaneGeometry(0.172, 0.136, 22, 18);
    leafGeo.rotateX(-Math.PI / 2);
    const lp = leafGeo.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const gx = lp.getX(i); // -0.086 .. +0.086
      const gz = lp.getZ(i); // -0.068 .. +0.068
      const u = (gx + 0.086) / 0.172; // 0 = stem base, 1 = pointed leaf tip
      const v = gz / 0.068; // -1 .. +1 across width

      // Heart-oval serrated shiso margin envelope!
      const baseEnv = Math.sin(Math.pow(Math.max(0.001, Math.min(0.999, u)), 0.72) * Math.PI) * (0.95 + (1 - u) * 0.16);
      const serrate = 1.0 - 0.11 * Math.abs(Math.sin(u * Math.PI * 11.0)) * Math.pow(Math.abs(v), 1.4);
      const halfW = 0.066 * baseEnv * serrate;

      const nz = v * halfW;
      // 3D leaf cupping + gentle S-arch along midrib + raised lateral botanical veins + quilted chirimen cellular puckering!
      const cup = (nz * nz) * 2.4 - (gx * gx) * 1.15;
      const veinRidge = Math.exp(-Math.abs(nz) * 90) * 0.0028; // Central midrib!
      const lateralVein = Math.sin((u * 8.5 - Math.abs(v) * 2.4) * Math.PI * 2);
      const chirimenPucker = lateralVein * Math.cos(Math.abs(v) * Math.PI * 6) * 0.0022 * (1 - Math.abs(v) * 0.3);
      const marginWave = Math.sin(u * Math.PI * 6 + (v > 0 ? 0.5 : -0.5)) * 0.0035 * Math.pow(Math.abs(v), 2);

      lp.setXYZ(i, gx, cup + veinRidge + chirimenPucker + marginWave, nz);
    }
    leafGeo.computeVertexNormals();

    primaryMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b8a34,
      map: textures.shisoColor,
      bumpMap: textures.shisoBump,
      bumpScale: 0.013,
      roughness: 0.40,
      sheen: 0.45,
      sheenColor: new THREE.Color(0x94dc6e),
      side: THREE.DoubleSide,
    });
    const leafMesh = new THREE.Mesh(leafGeo, primaryMat);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    bodyGroup.add(leafMesh);

    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.116, 0.007, 0.004),
      new THREE.Vector3(-0.100, 0.002, 0.002),
      new THREE.Vector3(-0.084, -0.002, 0),
    ]);
    bodyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 8, 0.0035, 6, false), new THREE.MeshStandardMaterial({ color: 0x457d36, roughness: 0.58 })));

    for (let i = 0; i < 24; i++) {
      const t = 0.14 + (i / 24) * 0.72;
      const x = -0.08 + t * 0.16;
      const z = Math.sin(i * 2.5) * 0.042 * Math.sin(t * Math.PI);
      hanaAnchors.push({
        pos: new THREE.Vector3(x, (i % 3 === 0 ? 0.005 : -0.006), z),
        baseScale: 0.58 + Math.sin(t * Math.PI) * 0.28,
      });
    }

    const rawLeaf = new THREE.Color(0x3b8a34);
    const friedLeaf = new THREE.Color(0x286f28);
    extraUpdate = (doneness) => {
      const k = Math.min(1, doneness / 0.7);
      primaryMat.color.copy(rawLeaf).lerp(friedLeaf, k);
      primaryMat.roughness = THREE.MathUtils.lerp(0.40, 0.18, k);
    };
  }

  return { bodyGroup, primaryMat, hanaAnchors, extraUpdate, groundOffset };
}

export class TempuraPiece {
  constructor(type, id, textures) {
    this.type = type;
    this.id = id;
    this.group = new THREE.Group();
    this.group.userData.piece = this;

    this.state = 'tray';
    this.batterAmount = 0.0;
    this.doneness = 0.0;
    this.moisture = 1.0;
    this.oilWetness = 0.0;
    this.saltAmount = 0.0;
    this.tentsuyuAmount = 0.0;
    this.daikonCount = 0;
    this.extraTenkasu = 0;

    this.vel = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.targetRot = new THREE.Euler();
    this.traySlot = 0;
    this.flipSpin = 0;
    this.bubbleTimer = 0;
    this.dripTimer = 0;

    const built = buildIngredientGeometry(type, textures);
    this.bodyGroup = built.bodyGroup;
    this.hanaAnchors = built.hanaAnchors;
    this.extraUpdate = built.extraUpdate;
    this.groundOffset = built.groundOffset;
    this.group.add(this.bodyGroup);

    // 1. Porous thin-to-thick lacy tempura veil
    this.coatMat = new THREE.MeshPhysicalMaterial({
      color: 0xf9f0d8,
      map: textures.batterColor,
      bumpMap: textures.batterBump,
      bumpScale: 0.024,
      roughnessMap: textures.batterLace,
      roughness: 0.44,
      metalness: 0.01,
      clearcoat: 0.38,
      clearcoatRoughness: 0.28,
      sheen: 0.65,
      sheenColor: new THREE.Color(0xffe6a2),
      emissive: new THREE.Color(0x683908),
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.0,
    });
    this.coatMesh = new THREE.Mesh(buildCohesiveCoatGeometry(type), this.coatMat);
    this.coatMesh.castShadow = true;
    this.coatMesh.receiveShadow = true;
    this.coatMesh.visible = false;
    this.group.add(this.coatMesh);

    // 2. Ultra-fine crinkled wispy crispy "hana" flakes
    this.hanaMat = new THREE.MeshPhysicalMaterial({
      color: 0xf9f0d8,
      map: textures.batterColor,
      bumpMap: textures.batterBump,
      bumpScale: 0.024,
      roughness: 0.44,
      metalness: 0.01,
      clearcoat: 0.36,
      sheen: 0.72,
      sheenColor: new THREE.Color(0xffeba8),
      emissive: new THREE.Color(0x6e3d0a),
      emissiveIntensity: 0.20,
    });
    this.hanaMesh = new THREE.InstancedMesh(getHanaFlakeGeo(), this.hanaMat, this.hanaAnchors.length);
    this.hanaMesh.castShadow = true;
    this.hanaMesh.receiveShadow = true;
    this.group.add(this.hanaMesh);

    // 3. Organic bubbly oil-film foam ring hugging waterline while frying
    const foamGeo = new THREE.PlaneGeometry(type === 'ebi' ? 0.25 : 0.20, 0.17);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      map: textures.fryFoamRing,
      color: 0xfff0cc,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.foamCollar = new THREE.Mesh(foamGeo, foamMat);
    this.foamCollar.position.y = 0.008;
    this.foamCollar.renderOrder = 3;
    this.group.add(this.foamCollar);

    // 4. Clinging sparkling Sea-Salt Crystals
    this.maxSaltGrains = 32;
    const saltGeo = new THREE.OctahedronGeometry(0.0038, 0);
    const saltMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.14,
      clearcoat: 1.0,
      emissive: 0x332b20,
      emissiveIntensity: 0.18,
    });
    this.saltMesh = new THREE.InstancedMesh(saltGeo, saltMat, this.maxSaltGrains);
    this.saltCount = 0;
    const d0 = new THREE.Object3D();
    d0.scale.set(0, 0, 0);
    d0.updateMatrix();
    for (let i = 0; i < this.maxSaltGrains; i++) this.saltMesh.setMatrixAt(i, d0.matrix);
    this.saltMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.saltMesh);

    this.daikonPuffs = [];
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    this._cWetBatter = new THREE.Color(0xf9f0d6);
    this._cPaleGold = new THREE.Color(0xf2d183);
    this._cGoldenCrisp = new THREE.Color(0xd9922c);
    this._cAmberToast = new THREE.Color(0x9a5017);
    this._cDeepRoast = new THREE.Color(0x4f250b);
    this._cTentsuyuGlaze = new THREE.Color(0x6b3211);

    this.updateVisuals();
  }

  addBatter(amount) {
    this.batterAmount = Math.min(1.5, this.batterAmount + amount);
    this.moisture = Math.min(1.3, this.moisture + amount * 0.45);
    this.updateVisuals();
  }

  addSaltCrystal(worldPos) {
    this.saltAmount += 0.08;
    if (this.saltCount >= this.maxSaltGrains) return;
    const local = this.group.worldToLocal(worldPos.clone());
    local.x = THREE.MathUtils.clamp(local.x, -0.085, 0.085);
    local.z = THREE.MathUtils.clamp(local.z, -0.052, 0.052);
    local.y = this.groundOffset + 0.008 + Math.min(0.018, this.batterAmount * 0.011) + Math.random() * 0.006;
    this._dummy.position.copy(local);
    this._dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    this._dummy.scale.setScalar(0.75 + Math.random() * 0.65);
    this._dummy.updateMatrix();
    this.saltMesh.setMatrixAt(this.saltCount, this._dummy.matrix);
    this.saltMesh.instanceMatrix.needsUpdate = true;
    this.saltCount++;
  }

  addTentsuyu(amount) {
    this.tentsuyuAmount = Math.min(1.4, this.tentsuyuAmount + amount);
    this.updateVisuals();
  }

  addDaikonScoop(worldPos, textures) {
    if (this.daikonPuffs.length >= 3) return;
    this.daikonCount++;
    const local = this.group.worldToLocal(worldPos.clone());
    local.x = THREE.MathUtils.clamp(local.x, -0.055, 0.055);
    local.z = THREE.MathUtils.clamp(local.z, -0.032, 0.032);
    local.y = this.groundOffset + 0.015 + this.batterAmount * 0.009;

    const g = new THREE.SphereGeometry(0.022, 16, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 0.90 + 0.22 * Math.sin(p.getX(i) * 320 + p.getY(i) * 260) * Math.cos(p.getZ(i) * 290);
      p.setXYZ(i, p.getX(i) * f, p.getY(i) * 0.72 * f, p.getZ(i) * f);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xf2f4ee,
      roughness: 0.62,
      sheen: 0.68,
      bumpMap: textures.batterBump,
      bumpScale: 0.022,
    });
    const puff = new THREE.Mesh(g, m);
    puff.position.copy(local);
    puff.castShadow = true;
    this.group.add(puff);
    this.daikonPuffs.push(puff);
  }

  updateVisuals() {
    if (this.extraUpdate) {
      this.extraUpdate(this.doneness);
    }

    const hasBatter = this.batterAmount > 0.05;
    const thickness = Math.min(1.5, this.batterAmount);
    const crispFactor = Math.min(1.0, this.doneness * 2.0);

    this.coatMesh.visible = hasBatter;
    if (hasBatter) {
      // Smooth continuous opacity: thin usugoromo lets shrimp/shiso glow cleanly through!
      const opacity = THREE.MathUtils.clamp(0.48 + thickness * 0.52, 0.45, 1.0);
      this.coatMat.opacity = opacity;
      this.coatMat.transparent = opacity < 0.96;
      const coatScale = (0.97 + thickness * 0.12) * (1.0 + crispFactor * 0.08);
      this.coatMesh.scale.set(coatScale, coatScale * (0.95 + thickness * 0.14), coatScale);
    }

    // Fine crispy hana lace blooms softly as batter fries (stays restrained when barely dipped!)
    const visibleHanaCount = hasBatter
      ? Math.floor(this.hanaAnchors.length * Math.min(1.0, 0.35 + thickness * 0.62))
      : 0;

    for (let i = 0; i < this.hanaAnchors.length; i++) {
      const a = this.hanaAnchors[i];
      if (i >= visibleHanaCount || !hasBatter) {
        this._dummy.scale.set(0, 0, 0);
        this._dummy.position.set(0, 0, 0);
      } else {
        const outward = 0.99 + thickness * 0.10 + crispFactor * 0.12 * (i % 3 === 0 ? 1.25 : 0.72);
        this._dummy.position.set(a.pos.x, a.pos.y * outward, a.pos.z * outward);
        this._dummy.rotation.set(
          Math.PI * 0.5 + Math.sin(i * 1.9) * 0.7,
          i * 1.65 + this.doneness * 0.18,
          Math.cos(i * 2.3) * 0.65
        );
        const puffScale = a.baseScale * (0.56 + thickness * 0.42) * (0.68 + crispFactor * 0.52 + this.extraTenkasu * 0.05);
        this._dummy.scale.set(puffScale, puffScale * 0.92, puffScale * (0.68 + crispFactor * 0.45));
      }
      this._dummy.updateMatrix();
      this.hanaMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.hanaMesh.instanceMatrix.needsUpdate = true;

    const d = this.doneness;
    if (d < 0.35) {
      this._color.copy(this._cWetBatter).lerp(this._cPaleGold, d / 0.35);
    } else if (d < 0.85) {
      this._color.copy(this._cPaleGold).lerp(this._cGoldenCrisp, (d - 0.35) / 0.5);
    } else if (d < 1.35) {
      this._color.copy(this._cGoldenCrisp).lerp(this._cAmberToast, (d - 0.85) / 0.5);
    } else {
      this._color.copy(this._cAmberToast).lerp(this._cDeepRoast, Math.min(1, (d - 1.35) / 0.55));
    }

    if (this.tentsuyuAmount > 0.01) {
      this._color.lerp(this._cTentsuyuGlaze, Math.min(0.58, this.tentsuyuAmount * 0.44));
    }

    this.coatMat.color.copy(this._color);
    this.hanaMat.color.copy(this._color).offsetHSL(0, 0.03, 0.04);

    const crispRough = THREE.MathUtils.lerp(0.24, 0.74, Math.min(1, d * 1.5));
    const oilGloss = Math.min(0.45, this.oilWetness * 0.36 + this.tentsuyuAmount * 0.42);
    const finalRough = Math.max(0.12, crispRough - oilGloss);
    const finalClear = Math.min(1.0, 0.24 + this.oilWetness * 0.52 + this.tentsuyuAmount * 0.75);

    this.coatMat.roughness = finalRough;
    this.coatMat.clearcoat = finalClear;
    this.hanaMat.roughness = finalRough;
    this.hanaMat.clearcoat = finalClear;

    if (this.foamCollar) {
      const targetFoam = this.state === 'frying' ? Math.min(0.75, 0.22 + this.moisture * 0.56) : 0.0;
      this.foamCollar.material.opacity = targetFoam;
      this.foamCollar.visible = targetFoam > 0.02;
    }
  }
}
