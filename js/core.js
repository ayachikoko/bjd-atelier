import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/* ---------------- geometry helpers ---------------- */

// profile: [[radius, y], ...] ordered bottom -> top
export function latheGeo(profile, segments = 72, phiStart = 0, phiLength = TAU) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0002), y));
  return new THREE.LatheGeometry(pts, segments, phiStart, phiLength);
}

// limb hanging downward from origin: top at y=0, bottom at y=-len
export function limbGeo(len, rTop, rBot, radial = 26, capSeg = 7, sideSeg = 6) {
  const pts = [];
  for (let i = 0; i <= capSeg; i++) {
    const a = (i / capSeg) * (Math.PI / 2);
    pts.push([rBot * Math.sin(a), -len - rBot * Math.cos(a)]);
  }
  for (let i = 1; i <= sideSeg; i++) {
    const t = i / sideSeg;
    pts.push([rBot + (rTop - rBot) * t, -len + len * t]);
  }
  for (let i = 1; i <= capSeg; i++) {
    const a = (i / capSeg) * (Math.PI / 2);
    pts.push([rTop * Math.cos(a), rTop * Math.sin(a)]);
  }
  return latheGeo(pts, radial);
}

// flared skirt / tube with optional pleats (sharp) or ruffles (round)
export function flareGeo(o) {
  const {
    topR = 0.4, botR = 0.9, topY = 0, botY = -1.2,
    waves = 0, amp = 0, mode = 'pleat', segU = 108, segV = 14, rippleAmp = 0,
  } = o;
  const pos = [], idx = [], uv = [];
  const tri = (x) => (2 / Math.PI) * Math.asin(Math.sin(x));
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    const y = topY + (botY - topY) * v;
    const base = topR + (botR - topR) * v;
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const th = u * TAU;
      let m = 1;
      if (waves > 0 && amp > 0) {
        const s = mode === 'pleat' ? tri(waves * th) : Math.abs(Math.sin(waves * th * 0.5));
        m += amp * s * (0.25 + 0.75 * v);
      }
      if (rippleAmp > 0) m += rippleAmp * Math.sin(9 * th) * v;
      const r = base * m;
      pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
      uv.push(u, v);
    }
  }
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// a hair lock: extruded rounded strip along a curve
export function lockGeo(points, w0, w1, thick = 0.016, N = 22, centerY = 0.5) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const verts = [], idx = [];
  const ring = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t).normalize();
    const radial = new THREE.Vector3(p.x, (p.y - centerY) * 0.35, p.z);
    if (radial.lengthSq() < 1e-8) radial.set(0, 0, 1);
    radial.normalize();
    let side = new THREE.Vector3().crossVectors(tan, radial);
    if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
    side.normalize();
    let nrm = new THREE.Vector3().crossVectors(side, tan);
    if (nrm.lengthSq() < 1e-8) nrm = radial.clone();
    nrm.normalize();
    const w = (w0 + (w1 - w0) * t) * 0.5;
    const th = thick * (1 - 0.45 * t) * 0.5;
    ring.push({ p, side, nrm, w, th });
  }
  for (const r of ring) {
    const { p, side, nrm, w, th } = r;
    for (const [sw, sn] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      verts.push(p.x + side.x * w * sw + nrm.x * th * sn,
        p.y + side.y * w * sw + nrm.y * th * sn,
        p.z + side.z * w * sw + nrm.z * th * sn);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = i * 4, b = (i + 1) * 4;
    for (let f = 0; f < 4; f++) {
      const f2 = (f + 1) % 4;
      idx.push(a + f, b + f, b + f2, a + f, b + f2, a + f2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------- canvas textures ---------------- */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function texFromCanvas(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function irisTexture(iris = '#8fb3c9', deep = '#3f5d72', pupil = '#141018') {
  const c = canvas(256, 256);
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 118);
  g.addColorStop(0, deep);
  g.addColorStop(0.34, iris);
  g.addColorStop(0.82, iris);
  g.addColorStop(1, deep);
  x.beginPath(); x.arc(128, 128, 118, 0, TAU); x.fillStyle = g; x.fill();
  // radial fibres
  x.globalAlpha = 0.25;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU;
    x.beginPath();
    x.moveTo(128 + Math.cos(a) * 46, 128 + Math.sin(a) * 46);
    x.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
    x.strokeStyle = i % 2 ? '#ffffff' : deep;
    x.lineWidth = 1.4;
    x.stroke();
  }
  x.globalAlpha = 1;
  // limbal ring
  x.beginPath(); x.arc(128, 128, 116, 0, TAU);
  x.strokeStyle = 'rgba(20,14,22,0.55)'; x.lineWidth = 9; x.stroke();
  // pupil
  x.beginPath(); x.arc(128, 128, 44, 0, TAU); x.fillStyle = pupil; x.fill();
  x.beginPath(); x.arc(128, 128, 44, 0, TAU);
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 5; x.stroke();
  // highlights
  x.beginPath(); x.arc(96, 92, 26, 0, TAU); x.fillStyle = 'rgba(255,255,255,0.92)'; x.fill();
  x.beginPath(); x.arc(158, 164, 12, 0, TAU); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fill();
  return texFromCanvas(c);
}

// iris texture in polar layout -> maps correctly onto a sphere cap
export function irisCapTexture(iris = '#8fb3c9', deep = '#3f5d72', pupil = '#141018') {
  const W = 512, H = 128;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const A = new THREE.Color(iris), B = new THREE.Color(deep), P = new THREE.Color(pupil);
  const tmp = new THREE.Color();
  const white = new THREE.Color(1, 1, 1);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const a = (x / W) * TAU;
      if (v < 0.30) tmp.copy(P).lerp(B, (v / 0.30) * 0.5);
      else if (v < 0.87) {
        const f = 0.5 + 0.5 * Math.sin(a * 26 + v * 11);
        tmp.copy(A).lerp(B, 0.05 + 0.35 * f * v);
      } else {
        tmp.copy(B).lerp(P, Math.min(1, (v - 0.87) / 0.13) * 0.85);
      }
      const ha = ((a + 2.2 + Math.PI) % TAU) - Math.PI;
      const hv = v - 0.42;
      const hd = Math.sqrt(ha * ha * 0.55 + hv * hv);
      if (hd < 0.16) tmp.lerp(white, Math.pow(1 - hd / 0.16, 2) * 0.95);
      const i = (y * W + x) * 4;
      img.data[i] = Math.round(tmp.r * 255);
      img.data[i + 1] = Math.round(tmp.g * 255);
      img.data[i + 2] = Math.round(tmp.b * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return texFromCanvas(c, { repeat: [1, 1] });
}

export function blushTexture(color = '226,120,138', strength = 1) {
  const c = canvas(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, `rgba(${color},${0.55 * strength})`);
  g.addColorStop(0.55, `rgba(${color},${0.26 * strength})`);
  g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return texFromCanvas(c);
}

export function shadowTexture(color = '120,70,90', strength = 1) {
  const c = canvas(128, 128);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 3, 64, 64, 60);
  g.addColorStop(0, `rgba(${color},${0.5 * strength})`);
  g.addColorStop(0.6, `rgba(${color},${0.2 * strength})`);
  g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return texFromCanvas(c);
}

export function backdropTexture(preset) {
  const c = canvas(1024, 512);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  for (const [t, col] of preset.stops) g.addColorStop(t, col);
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  if (preset.dots) {
    x.fillStyle = preset.dots;
    for (let i = 0; i < 120; i++) {
      const px = Math.random() * 1024, py = Math.random() * 512;
      const r = 2 + Math.random() * 5;
      x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
  }
  if (preset.vignette) {
    const v = x.createRadialGradient(512, 300, 120, 512, 260, 700);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, preset.vignette);
    x.fillStyle = v; x.fillRect(0, 0, 1024, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        for (const k of Object.keys(m)) {
          const v = m[k];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      }
    }
  });
}
