import * as THREE from 'three';

/**
 * Lightweight Macro Shallow Depth-of-Field + Circular Bokeh + Bare-Bulb Halation
 * post-processing pass using WebGL2 DepthTexture.
 * Designed for 30-60fps on iPhone/iPad (single fullscreen pass, 16-tap Vogel bokeh disk).
 */
export class MacroDOFPass {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.enabled = true;

    const dpr = renderer.getPixelRatio();
    const rw = Math.max(2, Math.floor(width * dpr));
    const rh = Math.max(2, Math.floor(height * dpr));

    const depthTexture = new THREE.DepthTexture(rw, rh);
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.format = THREE.DepthFormat;

    this.target = new THREE.WebGLRenderTarget(rw, rh, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      depthTexture,
    });

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.uniforms = {
      tDiffuse: { value: this.target.texture },
      tDepth: { value: this.target.depthTexture },
      uResolution: { value: new THREE.Vector2(rw, rh) },
      uCameraNear: { value: 0.12 },
      uCameraFar: { value: 25.0 },
      uFocusDist: { value: 2.15 },
      uFocusRange: { value: 0.48 },
      uMaxBlur: { value: 6.8 },
      uBulbScreenPos: { value: new THREE.Vector2(0.5, 0.85) },
      uBulbVisible: { value: 1.0 },
      uTime: { value: 0.0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform vec2 uResolution;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform float uFocusDist;
        uniform float uFocusRange;
        uniform float uMaxBlur;
        uniform vec2 uBulbScreenPos;
        uniform float uBulbVisible;
        uniform float uTime;

        varying vec2 vUv;

        float linearizeDepth(float depthSample) {
          float z = depthSample * 2.0 - 1.0;
          return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
        }

        // ACES Filmic Tone Mapping
        vec3 acesToneMap(vec3 x) {
          const float a = 2.51;
          const float b = 0.03;
          const float c = 2.43;
          const float d = 0.59;
          const float e = 0.14;
          return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
        }

        void main() {
          float rawD = texture2D(tDepth, vUv).r;
          float viewZ = linearizeDepth(rawD);

          // Asymmetric macro CoC: sharp near hero plane, creamy shallow blur behind & close foreground
          float diff = viewZ - uFocusDist;
          float coc = clamp((abs(diff) - uFocusRange * 0.45) / (uFocusRange * 1.45), 0.0, 1.0);
          // Slightly softer background bokeh than foreground
          coc = pow(coc, 1.15);

          vec2 texel = 1.0 / uResolution;
          vec3 centerCol = texture2D(tDiffuse, vUv).rgb;

          vec3 accum = centerCol;
          float wSum = 1.0;

          if (coc > 0.035) {
            float radius = coc * uMaxBlur;
            // 20-tap Golden Angle Vogel disk for silky creamy circular optical bokeh (zero flower gaps!)
            const float GOLDEN = 2.39996323;
            for (int i = 1; i <= 20; i++) {
              float fi = float(i);
              float r = sqrt(fi / 20.0) * radius;
              float theta = fi * GOLDEN;
              vec2 offset = vec2(cos(theta), sin(theta)) * r * texel;
              vec2 suv = clamp(vUv + offset, vec2(0.001), vec2(0.999));

              vec3 scol = texture2D(tDiffuse, suv).rgb;
              float sd = linearizeDepth(texture2D(tDepth, suv).r);
              float sCoc = clamp((abs(sd - uFocusDist) - uFocusRange * 0.45) / (uFocusRange * 1.45), 0.0, 1.0);

              // Prevent sharp foreground from bleeding weakly into background, while allowing creamy bokeh bloom
              float depthWeight = (sd < viewZ - 0.15) ? sCoc : 1.0;
              float lum = dot(scol, vec3(0.299, 0.587, 0.114));
              float bokehBoost = 1.0 + smoothstep(1.15, 3.2, lum) * coc * 1.45;
              float w = max(0.08, depthWeight) * bokehBoost;

              accum += scol * w;
              wSum += w;
            }
          }

          vec3 hdr = accum / wSum;

          // Subtle warm bare-bulb optical halation / backlit lens flare veil
          vec2 aspect = vec2(uResolution.x / max(1.0, uResolution.y), 1.0);
          float bulbDist = length((vUv - uBulbScreenPos) * aspect);
          float haloCore = exp(-bulbDist * 7.5) * 0.42 * uBulbVisible;
          float haloVeil = exp(-bulbDist * 2.2) * 0.11 * uBulbVisible;
          hdr += vec3(1.0, 0.68, 0.30) * haloCore;
          hdr += vec3(0.95, 0.55, 0.20) * haloVeil;

          // Exposure & Filmic ACES Tone Mapping
          hdr *= 1.12;
          vec3 col = acesToneMap(hdr);

          // Cinema night-kitchen color grade: deep cool-tinted shadows, rich warm golden highlights
          float luma = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col * vec3(0.94, 0.96, 1.04), col * vec3(1.04, 1.00, 0.95), smoothstep(0.12, 0.65, luma));

          // Gentle natural lens vignette
          vec2 vigUv = vUv - 0.5;
          float vig = 1.0 - dot(vigUv, vigUv) * 0.62;
          col *= clamp(vig, 0.58, 1.0);

          // Ultra-fine photographic film grain
          float grain = (fract(sin(dot(vUv * uResolution + uTime * 37.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.016;
          col = clamp(col + grain, 0.0, 1.0);

          // Linear -> sRGB encoding
          col = pow(col, vec3(1.0 / 2.2));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.postScene.add(quad);
  }

  resize(width, height) {
    const dpr = this.renderer.getPixelRatio();
    const rw = Math.max(2, Math.floor(width * dpr));
    const rh = Math.max(2, Math.floor(height * dpr));
    this.target.setSize(rw, rh);
    this.uniforms.uResolution.value.set(rw, rh);
  }

  render(scene, camera, focusDist, bulbWorldPos, elapsed) {
    this.uniforms.uCameraNear.value = camera.near;
    this.uniforms.uCameraFar.value = camera.far;
    this.uniforms.uFocusDist.value = focusDist;
    this.uniforms.uTime.value = elapsed;

    // Project bare bulb position to UV space for optical backlit halation
    const p = bulbWorldPos.clone().project(camera);
    this.uniforms.uBulbScreenPos.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    this.uniforms.uBulbVisible.value = p.z < 1.0 ? 1.0 : 0.0;

    if (!this.enabled) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }

    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.lastSceneTriangles = this.renderer.info.render.triangles;
    this.lastSceneCalls = this.renderer.info.render.calls;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
