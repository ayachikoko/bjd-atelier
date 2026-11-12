import * as THREE from 'three';
import { backdropTexture, DEG } from './core.js';

export const BACKDROPS = {
  studio: {
    id: 'studio', label: '奶油影棚',
    stops: [[0, '#ffffff'], [0.45, '#f7f1e9'], [0.78, '#efe5da'], [1, '#e5d8ca']],
    floor: '#efe6db', floorRough: 0.82, fog: '#e9dfd3', rim: '#fff3e2', exp: 1.05,
  },
  bed: {
    id: 'bed', label: '粉色卧室',
    stops: [[0, '#fff4f6'], [0.5, '#fbe3e9'], [0.8, '#f4cdd8'], [1, '#e9b8c7']],
    dots: 'rgba(255,255,255,0.35)', floor: '#f6dfe4', floorRough: 0.9,
    fog: '#f2d2da', rim: '#ffe6f2', exp: 1.06,
  },
  gothic: {
    id: 'gothic', label: '暮色古堡',
    stops: [[0, '#2a2438'], [0.45, '#3b3350'], [0.75, '#241f30'], [1, '#151119']],
    vignette: 'rgba(8,6,12,0.85)', floor: '#241f2e', floorRough: 0.55,
    fog: '#191423', rim: '#c9a6ff', exp: 1.0,
  },
  sunset: {
    id: 'sunset', label: '落日窗边',
    stops: [[0, '#ffe9c9'], [0.35, '#ffd0a5'], [0.62, '#e8a081'], [0.85, '#9b6a72'], [1, '#5b4a5e']],
    floor: '#d8b8a2', floorRough: 0.75, fog: '#c69a86', rim: '#ffd7a8', exp: 1.02,
  },
  garden: {
    id: 'garden', label: '晨光花园',
    stops: [[0, '#f4fbff'], [0.4, '#e6f4ea'], [0.72, '#d3e8d7'], [1, '#b7d3bd']],
    floor: '#dcefe0', floorRough: 0.9, fog: '#cfe4d4', rim: '#eafff0', exp: 1.04,
  },
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(31, 1, 0.05, 120);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();

    this.hemi = new THREE.HemisphereLight(0xfff2e8, 0xc9b6a8, 0.34);
    this.scene.add(this.hemi);

    this.key = new THREE.DirectionalLight(0xfff2e2, 2.0);
    this.key.position.set(3.2, 6.4, 3.6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 2;
    const sc = this.key.shadow.camera;
    sc.near = 0.5; sc.far = 24; sc.left = -4.2; sc.right = 4.2; sc.top = 5.4; sc.bottom = -1.2;
    this.scene.add(this.key);

    this.fill = new THREE.DirectionalLight(0xd2e0ff, 0.34);
    this.fill.position.set(-4.2, 2.6, 2.4);
    this.scene.add(this.fill);

    this.rim = new THREE.DirectionalLight(0xffe3c6, 1.15);
    this.rim.position.set(-1.4, 3.6, -5.2);
    this.scene.add(this.rim);

    this.spill = new THREE.PointLight(0xffd9c4, 4, 14, 2);
    this.spill.position.set(1.6, 0.5, 2.2);
    this.scene.add(this.spill);

    this.floor = new THREE.Mesh(
      new THREE.CircleGeometry(24, 72),
      new THREE.MeshStandardMaterial({ color: 0xefe6db, roughness: 0.82, metalness: 0 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // soft contact shadow so the doll never looks like it floats
    const cc = document.createElement('canvas');
    cc.width = cc.height = 256;
    const cx = cc.getContext('2d');
    const cg = cx.createRadialGradient(128, 128, 4, 128, 128, 126);
    cg.addColorStop(0, 'rgba(46,30,22,0.5)');
    cg.addColorStop(0.42, 'rgba(46,30,22,0.24)');
    cg.addColorStop(1, 'rgba(46,30,22,0)');
    cx.fillStyle = cg;
    cx.fillRect(0, 0, 256, 256);
    const ct = new THREE.CanvasTexture(cc);
    this.contact = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false }),
    );
    this.contact.rotation.x = -Math.PI / 2;
    this.contact.position.y = 0.014;
    this.contact.renderOrder = 1;
    this.scene.add(this.contact);

    this.dollGroup = new THREE.Group();
    this.scene.add(this.dollGroup);

    this.orbit = { theta: 0.22, phi: 1.36, radius: 10, tp: 1.36, tr: 10 };
    this.target = new THREE.Vector3(0, 1.6, 0);
    this.targetY = 1.6;
    this.height = 3.4;
    this.zoom = 1;
    this.fitRadius = 10;

    this._bindControls();
    this._loop = this._loop.bind(this);
    this.resize();
    requestAnimationFrame(this._loop);
  }

  setBackdrop(id) {
    const b = BACKDROPS[id] || BACKDROPS.studio;
    if (this.bgTex) this.bgTex.dispose();
    const tex = backdropTexture(b);
    this.bgTex = tex;
    this.scene.background = tex;
    this.scene.backgroundBlurriness = 0.0;
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromEquirectangular(tex);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.55;

    this.floor.material.color.set(b.floor);
    this.floor.material.roughness = b.floorRough;
    this.rim.color.set(b.rim);
    this.renderer.toneMappingExposure = b.exp;
    if (this.scene.fog) this.scene.fog.color.set(b.fog);
    this.scene.fog = new THREE.Fog(new THREE.Color(b.fog), this.height * 2.4, this.height * 7.5);
    this.backdrop = b;
  }

  setDoll(obj, height, cm, refit = true) {
    this.dollGroup.clear();
    this.dollGroup.add(obj);
    const changed = height !== this.height;
    this.height = height;
    this.cm = cm;
    const t = height * 0.52;
    this.targetY = t;
    if (refit || changed) {
      this.zoom = 1;
      this._frame();
      this.orbit.phi = this.orbit.tp = 1.36;
    }
    const sc = this.key.shadow.camera;
    sc.top = height * 1.15; sc.bottom = -height * 0.1;
    sc.left = -height * 0.9; sc.right = height * 0.9;
    sc.updateProjectionMatrix();
    this.key.position.set(height * 0.95, height * 3.0, height * 0.95);
    this.contact.scale.set(height * 0.52, height * 0.38, 1);
    this.contact.position.z = height * 0.05;
    this.fill.position.set(-height * 1.2, height * 0.8, height * 0.7);
    this.rim.position.set(-height * 0.4, height * 1.1, -height * 1.5);
    this.spill.position.set(height * 0.5, height * 0.15, height * 0.7);
    this.spill.intensity = 2.2 * height;
    if (this.scene.fog) {
      this.scene.fog.near = height * 2.2;
      this.scene.fog.far = height * 7.5;
    }
  }

  _frame() {
    const mobile = window.innerWidth < 760;
    const panelFrac = mobile ? 0.36 : 0.19;
    const fill = mobile ? 0.62 : 0.72;
    const visibleH = this.height / fill;
    const r = visibleH / (2 * Math.tan((this.camera.fov * DEG) / 2));
    this.fitRadius = r;
    this.targetY = this.lockTarget != null ? this.lockTarget
      : this.height * 0.5 - (mobile ? 0.06 : 0.075) * visibleH;
    this.target.y = this.targetY;
    this.orbit.tr = r * this.zoom;
    this.orbit.radius = this.orbit.tr;
  }

  _bindControls() {
    const el = this.canvas;
    let drag = null, pinch = null;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      this.orbit.theta -= dx * 0.006;
      this.orbit.tp = Math.min(1.62, Math.max(0.62, this.orbit.tp - dy * 0.005));
    });
    const end = () => { drag = null; el.style.cursor = 'grab'; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.min(2.4, Math.max(0.45, this.zoom * (1 + Math.sign(e.deltaY) * 0.09)));
      this.orbit.tr = this.fitRadius * this.zoom;
    }, { passive: false });

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.zoom = Math.min(2.4, Math.max(0.45, this.zoom * (pinch / d)));
        this.orbit.tr = this.fitRadius * this.zoom;
        pinch = d;
      }
    }, { passive: true });
    el.addEventListener('touchend', () => { pinch = null; });
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._frame();
  }

  _loop() {
    requestAnimationFrame(this._loop);
    const o = this.orbit;
    o.theta += (o.theta - o.theta) * 0; // keep drag direct
    o.phi += (o.tp - o.phi) * 0.12;
    o.radius += (o.tr - o.radius) * 0.1;
    this.target.y += (this.targetY - this.target.y) * 0.12;
    const sp = Math.sin(o.phi), cp = Math.cos(o.phi);
    this.camera.position.set(
      this.target.x + o.radius * sp * Math.sin(o.theta),
      this.target.y + o.radius * cp,
      this.target.z + o.radius * sp * Math.cos(o.theta),
    );
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}
