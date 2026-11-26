import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createClayTexture, createGlowTexture, createLeafTexture, createNoiseTexture } from './textures.js';

const DAY_TOP = new THREE.Color('#06190f');
const DAY_HORIZON = new THREE.Color('#2a5236');
const NIGHT_TOP = new THREE.Color('#030c07');
const NIGHT_HORIZON = new THREE.Color('#0b2618');

const GLSL_NOISE = /* glsl */ `
  float hash(float n){ return fract(sin(n) * 43758.5453123); }
  float noise1(float x){ float i = floor(x); float f = fract(x); f = f*f*(3.0-2.0*f); return mix(hash(i), hash(i+1.0), f); }
  float fbm1(float x){ float v = 0.0; float a = 0.5; for(int i=0;i<5;i++){ v += a*noise1(x); x *= 2.03; a *= 0.5; } return v; }
`;

const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/**
 * The whole 3D world: a misty tea-estate landscape at golden hour, a hand-thrown
 * kulhad on a mossy rock, live steam, wind-blown leaves and a gold ribbon that
 * reveals itself as the visitor scrolls into "The Experience".
 */
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Values animated from the outside (GSAP / ScrollTrigger).
    this.state = {
      intro: 0, // 0 = high aerial shot, 1 = settled hero frame
      experience: 0, // 0 = hero landscape, 1 = dark studio with the cup centred
      ribbon: 0, // gold ribbon draw progress
      spin: 0, // extra cup rotation driven by scroll
      finale: 0, // pushes the cup down for the closing section
      burst: 0, // leaf burst energy
      visible: true,
    };
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.uniforms = { uTime: { value: 0 }, uDark: { value: 0 } };

    this.initRenderer();
    this.initScene();
    this.buildSky();
    this.buildHills();
    this.buildMist();
    this.buildRays();
    this.buildRock();
    this.buildCup();
    this.buildSteam();
    this.buildBushes();
    this.buildFlyingLeaves();
    this.buildRibbon();
    this.buildPollen();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    });
    this.onResize();
    this.tick = this.tick.bind(this);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    this.camTarget = new THREE.Vector3();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.hemi = new THREE.HemisphereLight('#d8ecd0', '#0d2414', 0.9);
    this.sun = new THREE.DirectionalLight('#ffd49a', 3.2);
    this.sun.position.set(-6, 8, 4);
    this.rim = new THREE.DirectionalLight('#9fe0b5', 0);
    this.rim.position.set(4, 3, -5);
    this.warm = new THREE.PointLight('#ffb36b', 0, 12, 1.6);
    this.warm.position.set(0, 2.2, 2.2);
    this.scene.add(this.hemi, this.sun, this.rim, this.warm);

    this.noiseTex = createNoiseTexture();
    this.leafTex = createLeafTexture();
  }

  buildSky() {
    const mat = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        ...this.uniforms,
        uDayTop: { value: DAY_TOP },
        uDayHorizon: { value: DAY_HORIZON },
        uNightTop: { value: NIGHT_TOP },
        uNightHorizon: { value: NIGHT_HORIZON },
        uSun: { value: new THREE.Vector2(0.4, 0.47) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDayTop, uDayHorizon, uNightTop, uNightHorizon; uniform vec2 uSun; uniform float uDark, uTime;
        varying vec2 vUv;
        void main(){
          float h = smoothstep(0.22, 0.6, vUv.y);
          vec3 day = mix(uDayHorizon, uDayTop, h);
          vec2 d = vUv - uSun; d.x *= 2.0;
          float sun = exp(-length(d) * 7.0);
          float halo = exp(-length(d) * 2.2);
          day += vec3(0.95, 0.8, 0.45) * (sun * 0.6 + halo * 0.07);
          vec3 night = mix(uNightHorizon, uNightTop, smoothstep(0.2, 0.9, vUv.y));
          night += vec3(0.85, 0.65, 0.3) * exp(-length(vUv - vec2(0.5, 0.35)) * 4.0) * 0.08;
          gl_FragColor = vec4(mix(day, night, uDark), 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), mat);
    sky.position.set(0, 18, -60);
    this.scene.add(sky);
  }

  buildHills() {
    const layers = [
      { z: -52, y: 5.5, amp: 5.0, freq: 0.06, color: '#2b5a43', seed: 11, rows: 0 },
      { z: -40, y: 3.2, amp: 4.5, freq: 0.08, color: '#20503a', seed: 23, rows: 0 },
      { z: -29, y: 1.4, amp: 4.0, freq: 0.1, color: '#1b4a2c', seed: 37, rows: 0.5 },
      { z: -19, y: -0.2, amp: 3.4, freq: 0.13, color: '#153f22', seed: 51, rows: 1 },
      { z: -11, y: -1.3, amp: 2.4, freq: 0.17, color: '#0f331a', seed: 67, rows: 1 },
    ];
    this.hills = layers.map((l, i) => {
      const width = 140;
      const height = 26;
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        uniforms: {
          ...this.uniforms,
          uColor: { value: new THREE.Color(l.color) },
          uFog: { value: new THREE.Color('#244c34') },
          uNight: { value: new THREE.Color('#08190f').offsetHSL(0, 0, i * 0.012) },
          uAmp: { value: l.amp },
          uFreq: { value: l.freq },
          uSeed: { value: l.seed },
          uRows: { value: l.rows },
          uDepth: { value: 1 - i / (layers.length - 1) },
          uWidth: { value: width },
          uHeight: { value: height },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          ${GLSL_NOISE}
          uniform vec3 uColor, uFog, uNight; uniform float uAmp, uFreq, uSeed, uRows, uDepth, uWidth, uHeight, uDark, uTime;
          varying vec2 vUv;
          void main(){
            float x = vUv.x * uWidth;
            float y = vUv.y * uHeight;
            float ridge = uHeight * 0.45 + (fbm1(x * uFreq + uSeed) - 0.5) * uAmp * 2.0;
            float edge = ridge - y;
            if (edge < 0.0) discard;
            float shade = smoothstep(0.0, 6.0, edge);
            vec3 col = uColor * mix(1.12, 0.62, shade);
            // terraced tea rows following the slope
            float rows = sin((y + sin(x * 0.35 + uSeed) * 0.9 + edge * 0.25) * 7.0);
            col *= 1.0 - uRows * 0.16 * smoothstep(0.2, 1.0, rows);
            col += uRows * 0.05 * vec3(0.6, 0.8, 0.3) * smoothstep(0.7, 1.0, rows);
            // bright rim catching the sun
            col += vec3(1.0, 0.85, 0.5) * smoothstep(0.35, 0.0, edge) * 0.18 * (1.0 - uDepth * 0.5);
            // aerial perspective
            col = mix(col, uFog, uDepth * 0.42 + (1.0 - shade) * 0.06);
            // low mist pooled in valleys
            col = mix(col, uFog, smoothstep(0.55, 0.0, vUv.y) * 0.2 * uDepth);
            vec3 night = uNight * mix(1.25, 0.7, shade);
            gl_FragColor = vec4(mix(col, night, uDark), 1.0);
            #include <colorspace_fragment>
          }
        `,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
      mesh.position.set(0, l.y, l.z);
      this.scene.add(mesh);
      return mesh;
    });
  }

  buildMist() {
    this.mist = [];
    const mat = (opacity) =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { ...this.uniforms, uNoise: { value: this.noiseTex }, uOpacity: { value: opacity }, uOffset: { value: Math.random() * 10 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uNoise; uniform float uTime, uOpacity, uOffset, uDark; varying vec2 vUv;
          void main(){
            float n = texture2D(uNoise, vec2(vUv.x * 1.5 + uTime * 0.008 + uOffset, vUv.y * 0.6)).r;
            n *= texture2D(uNoise, vec2(vUv.x * 3.0 - uTime * 0.012, vUv.y * 1.2 + uOffset)).r * 1.6;
            float a = smoothstep(0.25, 0.8, n) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
            a *= smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
            vec3 col = mix(vec3(0.62, 0.76, 0.62), vec3(0.3, 0.5, 0.4), uDark);
            gl_FragColor = vec4(col, a * uOpacity * (1.0 - uDark * 0.75));
          }
        `,
      });
    [
      [-46, 4.5, 0.5, 90, 10],
      [-34, 2.0, 0.45, 80, 9],
      [-24, 0.6, 0.35, 70, 7],
      [-15, -0.6, 0.25, 60, 5],
    ].forEach(([z, y, o, w, h]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(o));
      m.position.set(0, y, z);
      this.scene.add(m);
      this.mist.push(m);
    });
  }

  buildRays() {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...this.uniforms },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uDark; varying vec2 vUv;
        void main(){
          float beam = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
          float fall = smoothstep(0.0, 0.85, vUv.y);
          float flicker = 0.75 + 0.25 * sin(uTime * 0.6 + vUv.x * 12.0);
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.58), beam * fall * 0.09 * flicker * (1.0 - uDark));
        }
      `,
    });
    this.rays = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + Math.random() * 2.4, 34), mat);
      ray.position.set(-12 + i * 2.6, 6, -20 + i);
      ray.rotation.z = 0.55 + i * 0.05;
      this.rays.add(ray);
    }
    this.scene.add(this.rays);
  }

  buildRock() {
    const geo = new THREE.IcosahedronGeometry(1, 5);
    const pos = geo.attributes.position;
    const colors = [];
    const v = new THREE.Vector3();
    const moss = new THREE.Color('#244a1c');
    const stone = new THREE.Color('#38342c');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 4.1) * Math.cos(v.z * 3.7) * 0.07 + Math.sin(v.x * 9 + v.y * 7) * 0.025;
      v.multiplyScalar(1 + n);
      if (v.y > 0.35) v.y = 0.35 + (v.y - 0.35) * 0.25;
      pos.setXYZ(i, v.x, v.y, v.z);
      const t = THREE.MathUtils.smoothstep(v.y, 0.05, 0.4);
      c.copy(stone).lerp(moss, t * (0.75 + Math.random() * 0.25));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
    rock.scale.set(2.6, 0.9, 1.9);
    rock.position.set(0, -0.32, 0);
    this.rock = rock;
    this.scene.add(rock);
  }

  buildCup() {
    this.cupGroup = new THREE.Group();
    const profile = [
      [0, 0], [0.6, 0], [0.66, 0.03], [0.69, 0.1], [0.74, 0.4], [0.82, 0.8], [0.9, 1.2], [0.98, 1.56],
      [1.02, 1.62], [1.0, 1.67], [0.95, 1.67], [0.92, 1.6], [0.85, 1.25], [0.77, 0.85], [0.69, 0.45], [0.62, 0.16], [0, 0.14],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const clay = createClayTexture();
    clay.repeat.set(3, 1);
    const cupMat = new THREE.MeshStandardMaterial({ map: clay, bumpMap: clay, bumpScale: 1.4, roughness: 0.86, metalness: 0, color: '#ffffff' });
    const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), cupMat);
    this.cupGroup.add(cup);

    const teaMat = new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uNoise: { value: this.noiseTex }, uTea: { value: new THREE.Color('#b8743d') } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uNoise; uniform float uTime; uniform vec3 uTea; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
          vec2 swirl = vec2(cos(a + uTime * 0.25 + r * 3.0), sin(a + uTime * 0.25 + r * 3.0)) * r * 0.5 + 0.5;
          float foam = texture2D(uNoise, swirl * 1.3).r;
          vec3 col = uTea * (0.85 + foam * 0.35);
          col = mix(col, vec3(0.96, 0.82, 0.62), smoothstep(0.55, 0.9, foam) * 0.35);
          col *= mix(1.1, 0.55, smoothstep(0.55, 1.0, r));
          col += vec3(1.0, 0.9, 0.75) * smoothstep(0.18, 0.0, length(p - vec2(-0.15, 0.18))) * 0.35;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    this.teaMat = teaMat;
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.9, 64), teaMat);
    tea.rotation.x = -Math.PI / 2;
    tea.position.y = 1.47;
    this.cupGroup.add(tea);
    this.cupGroup.position.set(0, 0, 0);
    this.cupGroup.rotation.y = -0.4;
    this.scene.add(this.cupGroup);
  }

  buildSteam() {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { ...this.uniforms, uNoise: { value: this.noiseTex }, uSeed: { value: 0 }, uStrength: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform sampler2D uNoise; uniform float uTime, uSeed; varying vec2 vUv;
        void main(){
          vUv = uv; vec3 p = position;
          float twist = texture2D(uNoise, vec2(0.5 + uSeed, uv.y * 0.25 - uTime * 0.02)).r;
          float ang = twist * 9.0 * uv.y;
          p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
          vec2 wind = vec2(texture2D(uNoise, vec2(0.25, uTime * 0.012 + uSeed)).r - 0.5,
                           texture2D(uNoise, vec2(0.75, uTime * 0.012 + uSeed)).r - 0.5) * pow(uv.y, 2.0) * 1.6;
          p.xz += wind;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uNoise; uniform float uTime, uSeed, uStrength; varying vec2 vUv;
        void main(){
          vec2 suv = vec2(vUv.x * 0.5 + uSeed, vUv.y * 0.3 - uTime * 0.045);
          float s = smoothstep(0.42, 1.0, texture2D(uNoise, suv).r);
          s *= smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
          s *= smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
          gl_FragColor = vec4(vec3(1.0, 0.98, 0.94), s * 0.9 * uStrength);
        }
      `,
    });
    const geo = new THREE.PlaneGeometry(1.1, 3.4, 16, 64);
    geo.translate(0, 1.7, 0);
    this.steam = [0, 1].map((i) => {
      const m = new THREE.Mesh(geo, mat.clone());
      m.material.uniforms.uSeed.value = i * 0.37;
      m.material.uniforms.uTime = this.uniforms.uTime;
      m.position.set(i ? 0.18 : -0.12, 1.5, 0);
      this.scene.add(m);
      return m;
    });
  }

  makeLeafGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.28, 0.18, 0.26, 0.72, 0, 1);
    shape.bezierCurveTo(-0.26, 0.72, -0.28, 0.18, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 14);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 0.44 + 0.5, y);
      pos.setZ(i, x * x * 1.6 + Math.sin(y * Math.PI) * 0.08 - y * y * 0.12);
    }
    geo.translate(0, -0.5, 0);
    geo.computeVertexNormals();
    return geo;
  }

  makeLeafMaterial() {
    const mat = new THREE.MeshStandardMaterial({ map: this.leafTex, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.0 });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float seed = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
         transformed.z += sin(uTime * 2.2 + seed + position.y * 3.0) * 0.06 * (position.y + 0.5);`,
      );
    };
    return mat;
  }

  buildBushes() {
    const clusters = this.isMobile
      ? [[-3.4, -0.9, 1.4, 1.5], [3.6, -0.8, 1.1, 1.6], [-1.9, -1.2, 2.6, 1.1], [2.2, -1.3, 2.8, 1.1]]
      : [[-5.4, -0.4, 0.6, 2.0], [5.6, -0.2, 0.2, 2.2], [-3.0, -1.1, 2.4, 1.3], [3.1, -1.2, 2.6, 1.3], [-7.5, 1.0, -2.5, 2.4], [7.8, 1.2, -3, 2.4], [0, -1.8, 3.4, 1.4]];
    const perCluster = this.isMobile ? 90 : 140;
    const count = clusters.length * perCluster;
    const mesh = new THREE.InstancedMesh(this.makeLeafGeometry(), this.makeLeafMaterial(), count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let k = 0;
    clusters.forEach(([cx, cy, cz, r]) => {
      for (let i = 0; i < perCluster; i++) {
        const u = Math.random();
        const v = Math.random() * 0.85;
        const theta = u * Math.PI * 2;
        const phi = Math.acos(1 - v);
        const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        dummy.position.set(cx, cy, cz).addScaledVector(dir, r * (0.75 + Math.random() * 0.3));
        dummy.lookAt(dummy.position.clone().add(dir));
        dummy.rotateX(-Math.PI / 2 + (Math.random() - 0.5) * 0.8);
        dummy.rotateY((Math.random() - 0.5) * 1.5);
        dummy.scale.setScalar(0.45 + Math.random() * 0.35);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
        color.setHSL(0.27 + Math.random() * 0.06, 0.55, 0.2 + Math.random() * 0.18);
        mesh.setColorAt(k, color);
        k++;
      }
    });
    this.bushes = mesh;
    this.scene.add(mesh);
  }

  buildFlyingLeaves() {
    const count = this.isMobile ? 26 : 46;
    this.leaves = new THREE.InstancedMesh(this.makeLeafGeometry(), this.makeLeafMaterial(), count);
    this.leaves.frustumCulled = false;
    this.leafData = Array.from({ length: count }, (_, i) => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 18, Math.random() * 7 - 1, (Math.random() - 0.5) * 8 - 1),
      vel: new THREE.Vector3(),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2),
      scale: 0.35 + Math.random() * 0.35,
      orbitA: (i / count) * Math.PI * 2,
      orbitR: 1.7 + Math.random() * 1.6,
      orbitY: 0.1 + Math.random() * 2.6,
      orbitS: 0.15 + Math.random() * 0.25,
      phase: Math.random() * 100,
    }));
    const color = new THREE.Color();
    this.leafData.forEach((_, i) => {
      color.setHSL(0.22 + Math.random() * 0.07, 0.6, 0.42 + Math.random() * 0.2);
      this.leaves.setColorAt(i, color);
    });
    this.leafDummy = new THREE.Object3D();
    this.scene.add(this.leaves);
  }

  buildRibbon() {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const a = t * Math.PI * 4.4 - 1;
      const r = 1.55 + Math.sin(t * Math.PI * 3) * 0.25 + t * 0.2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -0.1 + t * 2.6 + Math.sin(t * 9) * 0.08, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 600, 0.03, 10, false);
    const mat = new THREE.MeshStandardMaterial({ color: '#e7b95a', metalness: 1, roughness: 0.22, emissive: '#5a3a08', emissiveIntensity: 0.6 });
    this.ribbon = new THREE.Mesh(geo, mat);
    this.ribbonMax = geo.index.count;
    geo.setDrawRange(0, 0);
    this.ribbon.visible = false;
    this.scene.add(this.ribbon);
  }

  buildPollen() {
    const count = this.isMobile ? 120 : 260;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * 10 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...this.uniforms, uMap: { value: createGlowTexture() }, uPixel: { value: this.renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime, uPixel; varying float vA;
        void main(){
          vec3 p = position;
          p.y += mod(uTime * (0.08 + aSeed * 0.12) + aSeed * 10.0, 10.0) - 5.0;
          p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (20.0 + aSeed * 40.0) * uPixel / -mv.z;
          vA = 0.35 + 0.65 * sin(uTime * 1.5 + aSeed * 50.0) * 0.5 + 0.3;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uDark; varying float vA;
        void main(){
          vec4 t = texture2D(uMap, gl_PointCoord);
          vec3 col = mix(vec3(1.0, 0.92, 0.7), vec3(0.95, 0.78, 0.4), uDark);
          gl_FragColor = vec4(col, t.a * vA * 0.7);
        }
      `,
    });
    this.pollen = new THREE.Points(geo, mat);
    this.scene.add(this.pollen);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull the camera back on narrow screens so the cup still fits.
    this.distanceFactor = Math.max(1, 1.25 / this.camera.aspect);
    this.camera.updateProjectionMatrix();
  }

  updateLeaves(dt, t) {
    const e = this.state.experience;
    const burst = this.state.burst;
    const d = this.leafDummy;
    this.leafData.forEach((l, i) => {
      // Wind drift for the landscape scene.
      const gust = 0.9 + Math.sin(t * 0.4 + l.phase) * 0.5 + burst * 4;
      l.pos.x += (0.55 * gust + Math.sin(t * 0.7 + l.phase) * 0.3) * dt;
      l.pos.y += (Math.sin(t * 1.1 + l.phase) * 0.35 - 0.12 + burst * 0.6) * dt;
      l.pos.z += Math.cos(t * 0.5 + l.phase) * 0.2 * dt;
      if (l.pos.x > 10) l.pos.x = -10;
      if (l.pos.y < -1.5) l.pos.y = 6;
      if (l.pos.y > 7) l.pos.y = -1;

      // Orbit around the cup for the experience scene.
      const a = l.orbitA + t * l.orbitS;
      const ox = Math.cos(a) * l.orbitR;
      const oz = Math.sin(a) * l.orbitR;
      const oy = l.orbitY + Math.sin(t + l.phase) * 0.2;

      d.position.set(lerp(l.pos.x, ox, e), lerp(l.pos.y, oy, e), lerp(l.pos.z, oz, e));
      l.rot.x += l.spin.x * dt * (1 + burst * 3);
      l.rot.y += l.spin.y * dt;
      l.rot.z += l.spin.z * dt;
      d.rotation.copy(l.rot);
      d.scale.setScalar(l.scale * lerp(1, 0.8, e));
      d.updateMatrix();
      this.leaves.setMatrixAt(i, d.matrix);
    });
    this.leaves.instanceMatrix.needsUpdate = true;
  }

  updateCamera(dt) {
    const s = this.state;
    const e = s.experience;
    const f = s.finale;
    const k = this.distanceFactor;

    // Hero frame -> experience close-up -> finale (cup low in frame).
    const heroPos = new THREE.Vector3(0, 2.1, 9.6 * k);
    const heroTarget = new THREE.Vector3(0, 2.25, 0);
    const expPos = new THREE.Vector3(0, 2.9, 10.4 * k);
    const expTarget = new THREE.Vector3(0, 1.95, 0);
    const pos = heroPos.lerp(expPos, e);
    const target = heroTarget.lerp(expTarget, e);
    target.y += f * 1.9;
    // On tall phone screens drop the cup below the experience heading.
    target.y += e * (1 - f) * (k - 1) * 0.9;

    // Cinematic intro: start high above the estate and glide down.
    const i = 1 - s.intro;
    pos.x += i * -4;
    pos.y += i * 7;
    pos.z += i * 14;
    target.y += i * 3.5;
    target.z -= i * 12;

    this.pointerSmooth.x = damp(this.pointerSmooth.x, this.pointer.x, 3, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, this.pointer.y, 3, dt);
    pos.x += this.pointerSmooth.x * 0.6;
    pos.y += this.pointerSmooth.y * 0.35;

    this.camera.position.copy(pos);
    this.camTarget.copy(target);
    this.camera.lookAt(this.camTarget);
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.state;
    const e = s.experience;
    this.uniforms.uTime.value = t;
    this.uniforms.uDark.value = e;

    if (!s.visible) return;

    // Lighting morphs from golden hour to a warm studio glow.
    this.sun.intensity = lerp(3.2, 1.2, e);
    this.hemi.intensity = lerp(0.9, 0.35, e);
    this.rim.intensity = lerp(0, 2.4, e);
    this.warm.intensity = lerp(0, 14, e);
    this.scene.environmentIntensity = lerp(0.55, 0.8, e);

    this.rays.visible = e < 0.99;
    this.rays.children.forEach((r, i) => (r.rotation.z = 0.55 + i * 0.05 + Math.sin(t * 0.2 + i) * 0.03));

    // Rock and bushes sink away for the studio shot.
    this.rock.position.y = -0.32 - e * 4;
    this.rock.visible = e < 0.99;
    this.bushes.position.y = -e * 3.5;
    this.bushes.visible = e < 0.99;
    this.mist.forEach((m, i) => (m.position.x = Math.sin(t * 0.05 + i) * 4));

    this.cupGroup.rotation.y = -0.4 + s.spin * Math.PI * 2 + (this.reduceMotion ? 0 : Math.sin(t * 0.3) * 0.05);
    this.cupGroup.position.y = e * 0.15 + Math.sin(t * 1.2) * 0.03 * e;
    this.steam.forEach((m) => {
      m.position.y = this.cupGroup.position.y + 1.5;
      m.rotation.y = Math.atan2(this.camera.position.x - m.position.x, this.camera.position.z - m.position.z);
    });

    this.ribbon.visible = s.ribbon > 0.001;
    this.ribbon.geometry.setDrawRange(0, Math.floor((s.ribbon * this.ribbonMax) / 3) * 3);
    this.ribbon.rotation.y = t * 0.15;
    this.ribbon.position.y = this.cupGroup.position.y;

    this.updateLeaves(dt, t);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  setTeaColor(hex) {
    this.teaMat.uniforms.uTea.value.set(hex);
  }

  start() {
    this.renderer.setAnimationLoop(this.tick);
  }
}
