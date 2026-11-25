import * as THREE from 'three';
import {
  createWoodTextures,
  createHamTexture,
  createCeramicTexture,
  createColdRiceBedTextures,
  createBeatenEggSurfaceTexture,
  createKnitFabricTextures,
  createSkinTextures,
} from './textures.js';
import { WOK_POS, WOK_DEPTH } from './kitchen.js';

/**
 * Builds all photorealistic foreground ingredient vessels with 4-tier responsive layouts
 * (landscape_43, landscape_wide, portrait_tablet, portrait_narrow), static counter eggshell,
 * refractive-look amber oil, natural swirled beaten egg, densely packed fine cold rice grains,
 * seasoned iron ladle, and anatomically textured POV hands/knit sleeves!
 */
export function createIngredientsAndTools(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const lightWoodTex = createWoodTextures(false);
  const darkWoodTex = createWoodTextures(true);
  const hamTex = createHamTexture();
  const riceBowlTex = createCeramicTexture('#2c4459', '#8a6b4c');
  const hamDishTex = createCeramicTexture('#dfd8cc', '#8b745f');
  const coldRiceBedTex = createColdRiceBedTextures();
  const beatenEggSurfTex = createBeatenEggSurfaceTexture();
  const povKnitTex = createKnitFabricTextures('#9f9082', 'rgba(58, 46, 38, 0.14)');
  const skinTex = createSkinTextures();

  const items = {};
  const interactables = [];

  function registerItem(id, meshGroup, layouts, hitRadius = 0.13, hitHeight = 0.18) {
    meshGroup.position.copy(layouts.landscape_43);
    group.add(meshGroup);

    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(hitRadius, hitRadius, hitHeight, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = hitHeight * 0.45;
    hit.userData = { interactType: 'ingredient', id };
    meshGroup.add(hit);
    interactables.push(hit);

    items[id] = {
      id,
      group: meshGroup,
      layouts,
      home: layouts.landscape_43.clone(),
      targetPos: layouts.landscape_43.clone(),
      tiltAmount: 0,
      uses: 0,
      hit,
    };
    return items[id];
  }

  // Single-pass physical glass material with crisp western-sun rim speculars
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f8fa,
    roughness: 0.05,
    metalness: 0.06,
    transparent: true,
    opacity: 0.26,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 2.3,
    depthWrite: false,
  });

  // ===========================================================================
  // 1. TRANSLUCENT GOLDEN-AMBER OIL BOTTLE (NO OPAQUE MUSTARD CYLINDER!)
  // ===========================================================================
  const oilGroup = new THREE.Group();
  const oilBottlePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.046, 0.0),
    new THREE.Vector2(0.050, 0.015),
    new THREE.Vector2(0.048, 0.130),
    new THREE.Vector2(0.019, 0.175),
    new THREE.Vector2(0.019, 0.210),
    new THREE.Vector2(0.023, 0.215),
  ];
  const oilBottleMesh = new THREE.Mesh(new THREE.LatheGeometry(oilBottlePoints, 22), glassMat);
  oilBottleMesh.renderOrder = 4;
  oilGroup.add(oilBottleMesh);

  // Rich translucent honey-amber cooking oil (genuinely see-through glossy liquid with meniscus!)
  const oilLiquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xc27006,
    emissive: 0x3a1c00,
    emissiveIntensity: 0.28,
    roughness: 0.04,
    metalness: 0.0,
    transparent: true,
    opacity: 0.62,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2.3,
    depthWrite: false,
  });
  const oilLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.044, 0.114, 22), oilLiquidMat);
  oilLiquid.position.y = 0.062;
  oilLiquid.renderOrder = 3;
  oilGroup.add(oilLiquid);

  // Glistening top oil meniscus ring catching the golden window light
  const oilMeniscus = new THREE.Mesh(
    new THREE.CircleGeometry(0.042, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0xe69f1a,
      roughness: 0.03,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.84,
      envMapIntensity: 2.5,
    })
  );
  oilMeniscus.rotation.x = -Math.PI / 2;
  oilMeniscus.position.y = 0.057;
  oilLiquid.add(oilMeniscus);

  // Subtle deep-amber glass base thickness refraction accent
  const oilBaseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0x7a3f04,
      roughness: 0.06,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1.0,
    })
  );
  oilBaseRing.position.y = 0.008;
  oilGroup.add(oilBaseRing);

  const steelMat = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, metalness: 0.9, roughness: 0.22 });
  const corkMat = new THREE.MeshStandardMaterial({ color: 0x262628, roughness: 0.55 });
  const oilStopper = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.018, 0.024, 14), corkMat);
  oilStopper.position.y = 0.220;
  oilGroup.add(oilStopper);

  const oilSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.0040, 0.0062, 0.040, 8), steelMat);
  oilSpout.position.set(0.008, 0.244, 0);
  oilSpout.rotation.z = -0.35;
  oilGroup.add(oilSpout);

  // Positioned cleanly with ZERO knob or handleHit overlap across ALL 6 viewports!
  const oilItem = registerItem(
    'oil',
    oilGroup,
    {
      landscape_43: new THREE.Vector3(-0.64, 0.002, 0.27),
      landscape_wide: new THREE.Vector3(-0.74, 0.002, 0.22),
      portrait_tablet: new THREE.Vector3(-0.36, 0.002, 0.62),
      portrait_narrow: new THREE.Vector3(-0.27, 0.002, 0.68),
    },
    0.115,
    0.26
  );
  oilItem.liquidMesh = oilLiquid;

  // ===========================================================================
  // 2. GLASS BOWL OF SWIRLED BEATEN EGG (NO TOY TORUS!) + STATIC EGGSHELL ON COUNTER
  // ===========================================================================
  const eggGroup = new THREE.Group();
  const eggBowlProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.050, 0.0),
    new THREE.Vector2(0.080, 0.042),
    new THREE.Vector2(0.090, 0.076),
    new THREE.Vector2(0.085, 0.076),
    new THREE.Vector2(0.075, 0.042),
    new THREE.Vector2(0.044, 0.008),
    new THREE.Vector2(0.0, 0.008),
  ];
  const eggBowlMesh = new THREE.Mesh(new THREE.LatheGeometry(eggBowlProfile, 24), glassMat);
  eggBowlMesh.renderOrder = 4;
  eggGroup.add(eggBowlMesh);

  // Deep golden liquid body inside glass bowl
  const eggFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.048, 0.046, 22, 1, true),
    new THREE.MeshPhysicalMaterial({
      color: 0xe39414,
      roughness: 0.10,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.90,
    })
  );
  eggFill.position.y = 0.032;
  eggFill.renderOrder = 2;
  eggGroup.add(eggFill);

  // Photorealistic swirled beaten-egg liquid top surface (silky yolk + albumen + air micro-bubbles!)
  const eggTopDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.078, 24),
    new THREE.MeshPhysicalMaterial({
      map: beatenEggSurfTex,
      roughness: 0.07,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.5,
    })
  );
  eggTopDisc.rotation.x = -Math.PI / 2;
  eggTopDisc.position.y = 0.055;
  eggTopDisc.renderOrder = 3;
  eggGroup.add(eggTopDisc);

  const eggItem = registerItem(
    'egg',
    eggGroup,
    {
      landscape_43: new THREE.Vector3(-0.52, 0.002, 0.49),
      landscape_wide: new THREE.Vector3(-0.56, 0.002, 0.42),
      portrait_tablet: new THREE.Vector3(-0.02, 0.002, 0.62),
      portrait_narrow: new THREE.Vector3(0.00, 0.002, 0.68),
    },
    0.12,
    0.14
  );
  eggItem.liquidMesh = eggFill;

  // STATIC cracked brown eggshell half resting on the stainless counter (NEVER floats when lifting bowl!)
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xc28a64, roughness: 0.68, side: THREE.DoubleSide });
  const staticEggShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 14, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
    shellMat
  );
  staticEggShell.scale.set(1.0, 1.24, 1.0);
  staticEggShell.rotation.set(0.35, -0.2, -0.45);
  staticEggShell.castShadow = true;
  staticEggShell.receiveShadow = true;
  group.add(staticEggShell);

  // ===========================================================================
  // 3. CERAMIC CHAWAN BOWL OF FINE DENSE COLD WHITE RICE (冷やご飯)
  // ===========================================================================
  const riceGroup = new THREE.Group();
  const chawanMat = new THREE.MeshPhysicalMaterial({
    map: riceBowlTex,
    roughness: 0.24,
    clearcoat: 0.65,
    clearcoatRoughness: 0.16,
  });

  const chawanProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.042, 0.0),
    new THREE.Vector2(0.046, 0.014),
    new THREE.Vector2(0.094, 0.046),
    new THREE.Vector2(0.112, 0.092),
    new THREE.Vector2(0.106, 0.092),
    new THREE.Vector2(0.086, 0.046),
    new THREE.Vector2(0.040, 0.016),
    new THREE.Vector2(0.0, 0.016),
  ];
  const chawanMesh = new THREE.Mesh(new THREE.LatheGeometry(chawanProfile, 26), chawanMat);
  chawanMesh.castShadow = true;
  chawanMesh.receiveShadow = true;
  riceGroup.add(chawanMesh);

  const riceMoundGroup = new THREE.Group();
  riceMoundGroup.position.y = 0.078;
  riceGroup.add(riceMoundGroup);

  // Finely textured micro-grain cold rice dome base
  const coldRiceBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.099, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshPhysicalMaterial({
      map: coldRiceBedTex.map,
      bumpMap: coldRiceBedTex.bumpMap,
      bumpScale: 0.005,
      color: 0xeae5da,
      roughness: 0.30,
      clearcoat: 0.60,
      clearcoatRoughness: 0.18,
    })
  );
  coldRiceBase.scale.set(1.0, 0.54, 1.0);
  coldRiceBase.receiveShadow = true;
  riceMoundGroup.add(coldRiceBase);

  // 260 finely scaled realistic plump rice grains packed tightly over the dome (NO oversized capsules!)
  const grainGeo = new THREE.SphereGeometry(0.0056, 6, 5);
  grainGeo.scale(0.58, 0.54, 1.50);
  const coldGrainMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const bowlGrains = new THREE.InstancedMesh(grainGeo, coldGrainMat, 260);
  const dummy = new THREE.Object3D();
  const cTmp = new THREE.Color();
  for (let i = 0; i < 260; i++) {
    const rad = Math.sqrt((i + 0.5) / 260) * 0.094;
    const ang = i * 2.39996;
    const h = Math.cos((rad / 0.100) * Math.PI * 0.48) * 0.053;
    dummy.position.set(Math.cos(ang) * rad, h + 0.001, Math.sin(ang) * rad);
    dummy.rotation.set(Math.sin(i * 1.7) * 0.6, ang + i * 0.8, Math.cos(i * 2.1) * 0.5);
    dummy.scale.setScalar(0.86 + (i % 5) * 0.05);
    dummy.updateMatrix();
    bowlGrains.setMatrixAt(i, dummy.matrix);
    const v = 0.89 + (i % 4) * 0.028;
    cTmp.setRGB(v, v * 0.985, v * 0.95);
    bowlGrains.setColorAt(i, cTmp);
  }
  bowlGrains.instanceMatrix.needsUpdate = true;
  bowlGrains.instanceColor.needsUpdate = true;
  riceMoundGroup.add(bowlGrains);

  const riceItem = registerItem(
    'rice',
    riceGroup,
    {
      landscape_43: new THREE.Vector3(-0.22, 0.002, 0.54),
      landscape_wide: new THREE.Vector3(-0.24, 0.002, 0.46),
      portrait_tablet: new THREE.Vector3(-0.34, 0.002, 0.90),
      portrait_narrow: new THREE.Vector3(-0.27, 0.002, 0.96),
    },
    0.13,
    0.16
  );
  riceItem.moundGroup = riceMoundGroup;

  // ===========================================================================
  // 4. STONEWARE DISH WITH DICED ROSY-PINK HAM CUBES (角切りハム)
  // ===========================================================================
  const hamGroup = new THREE.Group();
  const hamDish = new THREE.Mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.080, 0),
      new THREE.Vector2(0.104, 0.025),
      new THREE.Vector2(0.098, 0.027),
      new THREE.Vector2(0.076, 0.008),
      new THREE.Vector2(0, 0.008),
    ], 22),
    new THREE.MeshPhysicalMaterial({ map: hamDishTex, roughness: 0.28, clearcoat: 0.45 })
  );
  hamDish.castShadow = true;
  hamDish.receiveShadow = true;
  hamGroup.add(hamDish);

  const hamCubeGeo = new THREE.BoxGeometry(0.021, 0.015, 0.021);
  const hamMat = new THREE.MeshPhysicalMaterial({
    map: hamTex,
    roughness: 0.34,
    clearcoat: 0.48,
    clearcoatRoughness: 0.26,
  });
  const dishHams = new THREE.InstancedMesh(hamCubeGeo, hamMat, 36);
  for (let i = 0; i < 36; i++) {
    const layer = i < 20 ? 0 : i < 31 ? 1 : 2;
    const rad = layer === 0 ? Math.sqrt((i + 1) / 20) * 0.068 : layer === 1 ? Math.sqrt((i - 19) / 11) * 0.046 : (i - 31) * 0.011;
    const ang = i * 2.2;
    dummy.position.set(Math.cos(ang) * rad, 0.016 + layer * 0.012, Math.sin(ang) * rad);
    dummy.rotation.set(Math.sin(i) * 0.3, ang, Math.cos(i) * 0.25);
    dummy.scale.set(0.9 + (i % 3) * 0.1, 0.85 + (i % 4) * 0.08, 0.9 + ((i + 1) % 3) * 0.1);
    dummy.updateMatrix();
    dishHams.setMatrixAt(i, dummy.matrix);
  }
  dishHams.instanceMatrix.needsUpdate = true;
  dishHams.castShadow = true;
  hamGroup.add(dishHams);

  registerItem(
    'ham',
    hamGroup,
    {
      landscape_43: new THREE.Vector3(0.12, 0.002, 0.54),
      landscape_wide: new THREE.Vector3(0.10, 0.002, 0.46),
      portrait_tablet: new THREE.Vector3(0.00, 0.002, 0.90),
      portrait_narrow: new THREE.Vector3(0.00, 0.002, 0.96),
    },
    0.125,
    0.13
  );

  // ===========================================================================
  // 5. HINOKI CUTTING BOARD WITH AUTHENTIC SLICED SCALLION RINGS (刻みねぎ)
  // ===========================================================================
  const negiGroup = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.21, 0.019, 0.155),
    new THREE.MeshStandardMaterial({
      map: lightWoodTex.map,
      bumpMap: lightWoodTex.bumpMap,
      bumpScale: 0.004,
      roughness: 0.60,
    })
  );
  board.position.y = 0.0095;
  board.castShadow = true;
  board.receiveShadow = true;
  negiGroup.add(board);

  const negiSliceGeo = new THREE.CylinderGeometry(0.0105, 0.0105, 0.005, 10, 1, true);
  const negiMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.26,
    clearcoat: 0.45,
    side: THREE.DoubleSide,
  });
  const boardNegis = new THREE.InstancedMesh(negiSliceGeo, negiMat, 76);
  for (let i = 0; i < 76; i++) {
    const rad = Math.sqrt((i + 0.5) / 76) * 0.062;
    const ang = i * 2.45;
    const moundY = Math.max(0, 1 - rad / 0.075) * 0.026;
    dummy.position.set(Math.cos(ang) * rad * 1.15, 0.021 + moundY, Math.sin(ang) * rad * 0.85);
    dummy.rotation.set(Math.sin(i * 1.9) * 0.75, ang, Math.cos(i * 1.3) * 0.65);
    dummy.scale.set(0.82 + (i % 4) * 0.11, 0.8 + (i % 3) * 0.25, 0.82 + (i % 4) * 0.11);
    dummy.updateMatrix();
    boardNegis.setMatrixAt(i, dummy.matrix);
    if (i % 5 === 0) {
      cTmp.setHSL(0.24, 0.25, 0.74);
    } else {
      cTmp.setHSL(0.28 + (i % 4) * 0.012, 0.52, 0.26 + (i % 4) * 0.07);
    }
    boardNegis.setColorAt(i, cTmp);
  }
  boardNegis.instanceMatrix.needsUpdate = true;
  boardNegis.instanceColor.needsUpdate = true;
  negiGroup.add(boardNegis);

  registerItem(
    'negi',
    negiGroup,
    {
      landscape_43: new THREE.Vector3(0.45, 0.002, 0.49),
      landscape_wide: new THREE.Vector3(0.45, 0.002, 0.44),
      portrait_tablet: new THREE.Vector3(0.34, 0.002, 0.90),
      portrait_narrow: new THREE.Vector3(0.25, 0.002, 0.96),
    },
    0.13,
    0.13
  );

  // ===========================================================================
  // 6. JAPANESE SOY SAUCE DISPENSER (醤油さし)
  // ===========================================================================
  const soyGroup = new THREE.Group();
  const soyPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.040, 0),
    new THREE.Vector2(0.042, 0.023),
    new THREE.Vector2(0.021, 0.124),
    new THREE.Vector2(0.022, 0.142),
  ];
  const soyGlass = new THREE.Mesh(new THREE.LatheGeometry(soyPoints, 18), glassMat);
  soyGlass.renderOrder = 4;
  soyGroup.add(soyGlass);

  const soyLiquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.037, 0.088, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x220903, roughness: 0.08, clearcoat: 1.0 })
  );
  soyLiquid.position.y = 0.046;
  soyLiquid.castShadow = true;
  soyGroup.add(soyLiquid);

  const redCapMat = new THREE.MeshPhysicalMaterial({ color: 0xb81d16, roughness: 0.18, clearcoat: 0.85 });
  const redCap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.023, 0.033, 16), redCapMat);
  redCap.position.y = 0.156;
  redCap.castShadow = true;
  soyGroup.add(redCap);

  const soySpout = new THREE.Mesh(new THREE.CylinderGeometry(0.0036, 0.0052, 0.021, 8), redCapMat);
  soySpout.position.set(-0.020, 0.162, 0);
  soySpout.rotation.z = 0.95;
  soyGroup.add(soySpout);

  registerItem(
    'soy',
    soyGroup,
    {
      landscape_43: new THREE.Vector3(0.68, 0.002, 0.36),
      landscape_wide: new THREE.Vector3(0.75, 0.002, 0.30),
      portrait_tablet: new THREE.Vector3(0.36, 0.002, 0.62),
      portrait_narrow: new THREE.Vector3(0.27, 0.002, 0.68),
    },
    0.088,
    0.19
  );

  // ===========================================================================
  // 7. CHINESE SEASONED IRON LADLE (中華お玉)
  // ===========================================================================
  const ladleGroup = new THREE.Group();
  const ladleRestPos = new THREE.Vector3(WOK_POS.x + 0.25, WOK_POS.y + WOK_DEPTH + 0.014, WOK_POS.z + 0.21);
  ladleGroup.position.copy(ladleRestPos);
  group.add(ladleGroup);

  const ladleMetalMat = new THREE.MeshPhysicalMaterial({
    color: 0xb8bec4,
    metalness: 0.88,
    roughness: 0.24,
    clearcoat: 0.35,
  });
  const ladleWoodMat = new THREE.MeshStandardMaterial({
    map: darkWoodTex.map,
    bumpMap: darkWoodTex.bumpMap,
    bumpScale: 0.003,
    roughness: 0.50,
  });

  const ladleBowlGeo = new THREE.SphereGeometry(0.068, 20, 12, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52);
  const ladleBowlMat = ladleMetalMat.clone();
  ladleBowlMat.side = THREE.DoubleSide;
  const ladleBowl = new THREE.Mesh(ladleBowlGeo, ladleBowlMat);
  ladleBowl.scale.set(1.0, 0.72, 1.05);
  ladleBowl.castShadow = true;
  ladleGroup.add(ladleBowl);

  const ladleScoopMound = new THREE.Mesh(
    new THREE.SphereGeometry(0.060, 14, 10),
    new THREE.MeshPhysicalMaterial({
      map: coldRiceBedTex.map,
      bumpMap: coldRiceBedTex.bumpMap,
      bumpScale: 0.004,
      color: 0xe8c76e,
      roughness: 0.28,
      clearcoat: 0.5,
    })
  );
  ladleScoopMound.scale.set(1.0, 0.62, 1.02);
  ladleScoopMound.position.y = 0.002;
  ladleScoopMound.visible = false;
  ladleGroup.add(ladleScoopMound);

  const ladleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0075, 0.25, 10), ladleMetalMat);
  ladleShaft.position.set(0.10, 0.088, 0.088);
  ladleShaft.rotation.set(0.55, 0.1, -0.78);
  ladleShaft.castShadow = true;
  ladleGroup.add(ladleShaft);

  const ladleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.145, 12), ladleWoodMat);
  ladleGrip.position.set(0.205, 0.182, 0.172);
  ladleGrip.rotation.set(0.55, 0.1, -0.78);
  ladleGrip.castShadow = true;
  ladleGroup.add(ladleGrip);

  const ladleHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 10, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  ladleHit.userData = { interactType: 'ladle' };
  ladleGroup.add(ladleHit);
  interactables.push(ladleHit);

  // ===========================================================================
  // 8. PHOTOREALISTIC TEXTURED FIRST-PERSON POV HANDS & KNIT CARDIGAN SLEEVES
  // ===========================================================================
  const rightHand = createPOVHand(1, skinTex, povKnitTex);
  rightHand.visible = false;
  scene.add(rightHand);

  const leftHand = createPOVHand(-1, skinTex, povKnitTex);
  leftHand.visible = false;
  scene.add(leftHand);

  function setResponsiveLayout(layoutMode) {
    for (const id of Object.keys(items)) {
      const it = items[id];
      const pos = it.layouts[layoutMode] || it.layouts.landscape_43;
      it.home.copy(pos);
    }
    // Keep static cracked eggshell resting naturally on the counter right beside the egg bowl's home!
    const eggHome = items.egg.home;
    staticEggShell.position.set(eggHome.x - 0.102, 0.022, eggHome.z + 0.048);
  }
  setResponsiveLayout('landscape_43');

  return {
    group,
    items,
    interactables,
    ladleGroup,
    ladleRestPos,
    ladleScoopMound,
    rightHand,
    leftHand,
    staticEggShell,
    setResponsiveLayout,
  };
}

/**
 * Photorealistic sculpted first-person hand + wrist + ribbed knit sleeve cuff
 * (warm textured human skin + anatomical palm/knuckles/fingernails + woven knit fabric folds — ZERO plastic rod look!).
 */
function createPOVHand(side = 1, skinTex, knitTex) {
  const hand = new THREE.Group();

  const skinMat = new THREE.MeshPhysicalMaterial({
    map: skinTex.map,
    bumpMap: skinTex.bumpMap,
    bumpScale: 0.0032,
    color: 0xd49d7e,
    roughness: 0.62,
    metalness: 0.0,
    sheen: 0.36,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(0xffb48e),
    clearcoat: 0.02,
  });

  const nailMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6c8b9,
    roughness: 0.28,
    clearcoat: 0.50,
  });

  const sleeveMat = new THREE.MeshStandardMaterial({
    map: knitTex.map,
    bumpMap: knitTex.bumpMap,
    bumpScale: 0.007,
    roughness: 0.96,
  });

  // Full-length anatomical forearm + woven cardigan sleeve extending 1.45m ALL THE WAY OFF-SCREEN
  // so the rear end of the sleeve is NEVER cut off or floating in mid-air on any device/drag/toss!
  const armPivot = new THREE.Group();
  armPivot.position.set(0, 0.002, 0.022);
  armPivot.rotation.set(0.24, side * 0.32, 0);
  hand.add(armPivot);

  const wristPts = [
    new THREE.Vector2(0.021, 0.0),
    new THREE.Vector2(0.023, 0.045),
    new THREE.Vector2(0.027, 0.105),
    new THREE.Vector2(0.030, 0.155),
  ];
  const wristGeo = new THREE.LatheGeometry(wristPts, 16);
  wristGeo.rotateX(Math.PI / 2);
  const wrist = new THREE.Mesh(wristGeo, skinMat);
  wrist.position.set(0, 0, -0.004);
  wrist.castShadow = true;
  wrist.receiveShadow = true;
  armPivot.add(wrist);

  const sleevePts = [
    new THREE.Vector2(0.030, 0.0),
    new THREE.Vector2(0.038, 0.014),
    new THREE.Vector2(0.036, 0.038),
    new THREE.Vector2(0.043, 0.12),
    new THREE.Vector2(0.045, 0.28),
    new THREE.Vector2(0.050, 0.52),
    new THREE.Vector2(0.055, 0.88),
    new THREE.Vector2(0.062, 1.45),
  ];
  const sleeveGeo = new THREE.LatheGeometry(sleevePts, 22);
  // Organic woven cloth drape folds along the full sleeve
  const sp = sleeveGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const sx = sp.getX(i), sy = sp.getY(i), sz = sp.getZ(i);
    const ang = Math.atan2(sz, sx);
    const fold = 1.0 + 0.052 * Math.sin(ang * 3.0 + sy * 18.0) * Math.min(1, sy * 6.0);
    sp.setXYZ(i, sx * fold, sy, sz * fold);
  }
  sleeveGeo.computeVertexNormals();
  sleeveGeo.rotateX(Math.PI / 2);
  const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
  sleeveMesh.position.set(0, 0, 0.132);
  sleeveMesh.castShadow = true;
  sleeveMesh.receiveShadow = true;
  armPivot.add(sleeveMesh);

  // Subtle dark shadowed inner cuff lip where wrist enters sleeve
  const cuffShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.033, 0.032, 0.016, 16),
    new THREE.MeshStandardMaterial({ color: 0x3b312a, roughness: 0.95 })
  );
  cuffShadow.rotation.x = Math.PI / 2;
  cuffShadow.position.set(0, 0, 0.134);
  armPivot.add(cuffShadow);

  // Sculpted anatomical metacarpal palm (arched back of hand + subtle knuckle ridge)
  const palmGeo = new THREE.SphereGeometry(0.038, 16, 12);
  palmGeo.scale(0.92, 0.48, 1.14);
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.castShadow = true;
  hand.add(palm);

  // 4 realistic tapered 3-segment curled gripping fingers with subtle fingernails
  const fingerLengths = [0.024, 0.027, 0.025, 0.020];
  for (let i = 0; i < 4; i++) {
    const fGroup = new THREE.Group();
    const len = fingerLengths[i];
    fGroup.position.set((i - 1.5) * 0.0155, 0.002, -0.033);

    // Knuckle joint
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 8, 6), skinMat);
    fGroup.add(knuckle);

    const seg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, len, 4, 8), skinMat);
    seg1.rotation.x = Math.PI * 0.62;
    seg1.position.set(0, -0.009, -len * 0.52);
    fGroup.add(seg1);

    const seg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, len * 0.82, 4, 8), skinMat);
    seg2.rotation.x = Math.PI * 0.90;
    seg2.position.set(0, -0.023, -len * 0.62);
    fGroup.add(seg2);

    const nail = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.002, 0.008), nailMat);
    nail.position.set(0, -0.026, -len * 0.68);
    nail.rotation.x = 0.5;
    fGroup.add(nail);

    hand.add(fGroup);
  }

  // Opposable thumb with natural metacarpal pad
  const thumbPad = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), skinMat);
  thumbPad.position.set(-side * 0.026, -0.005, -0.004);
  hand.add(thumbPad);

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.0080, 0.028, 6, 8), skinMat);
  thumb.position.set(-side * 0.036, -0.006, -0.016);
  thumb.rotation.set(Math.PI * 0.42, 0, side * 0.58);
  hand.add(thumb);

  return hand;
}
