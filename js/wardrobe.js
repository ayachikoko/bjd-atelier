import * as THREE from 'three';
import { latheGeo, flareGeo, lockGeo, TAU, DEG, texFromCanvas } from './core.js';
import { hairMaterial, clothMaterial, leatherMaterial, metalMaterial } from './materials.js';
import { surfacePointOf, radiusAt } from './doll.js';

/* ---------------- palette ---------------- */

export const HAIR_COLORS = {
  ink: { label: '墨黑', hex: '#2a2530' },
  chestnut: { label: '栗棕', hex: '#6a4634' },
  flax: { label: '亚麻', hex: '#c3a173' },
  silver: { label: '银白', hex: '#ece4dd' },
  sakura: { label: '樱粉', hex: '#e3a2b2' },
  lilac: { label: '雾紫', hex: '#9c86bd' },
};

export const HAIRS = {
  long: { label: '长直发' },
  twin: { label: '双马尾' },
  bob: { label: '波波头' },
  bun: { label: '丸子头' },
  wavy: { label: '波浪卷' },
};

const HEAD_C = 0.50;

function m(geo, mat) {
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

// hair shell built from the very same head profile -> never drifts off the skull
function hairShells(mat, profile, zs, zOff) {
  const g = new THREE.Group();
  const off = 0.036;
  const dome = profile.filter(([r, y]) => y >= 0.735).map(([r, y]) => [r + off, y]);
  g.add(m(latheGeo(dome, 72), mat));
  const low = profile.filter(([r, y]) => y >= 0.08 && y <= 0.755).map(([r, y]) => [r + off * 0.85, y]);
  g.add(m(latheGeo(low, 72, 0.96, TAU - 1.92), mat));
  g.scale.z = zs;
  g.position.z = zOff;
  return g;
}

function lock(parent, pts, w0, w1, mat, thick = 0.02) {
  const g = m(lockGeo(pts, w0, w1, thick, 24, HEAD_C), mat);
  parent.add(g);
  return g;
}

function bangs(parent, mat, profile, opts = {}) {
  const { topY = 0.885, endY = 0.625, count = 16, spread = 1.05, w0 = 0.30, w1 = 0.17, out = 1.055 } = opts;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = (t - 0.5) * 2 * spread;
    const p0 = surfacePointOf(profile, topY, a * 0.78);
    const p1 = surfacePointOf(profile, (topY + endY) / 2, a * 0.94);
    const p2 = surfacePointOf(profile, endY, a * 1.02);
    lock(parent, [
      [p0.x * out, p0.y, p0.z * out + 0.025],
      [p1.x * out, p1.y, p1.z * out],
      [p2.x * out * 1.03, p2.y - 0.015, p2.z * out * 1.02],
    ], w0, w1, mat, 0.026);
  }
}

function sideLocks(parent, mat, profile, endY = -0.55, w = 0.2) {
  for (const s of [-1, 1]) {
    const a = s * 1.02;
    const p0 = surfacePointOf(profile, 0.86, a * 0.72);
    const p1 = surfacePointOf(profile, 0.62, a * 0.95);
    lock(parent, [
      [p0.x * 1.05, p0.y, p0.z * 1.05],
      [p1.x * 1.10, p1.y, p1.z * 1.10],
      [s * 0.47, 0.20, 0.06],
      [s * 0.45, endY, -0.02],
    ], w, 0.085, mat, 0.026);
  }
}

function backLocks(parent, mat, opts = {}) {
  const { count = 17, topY = 0.82, endY = -0.9, spread = 0.95, out = 1.25, wave = 0, zBack = 0.40 } = opts;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const a = (t - 0.5) * Math.PI * spread;
    const x0 = Math.sin(a) * 0.34;
    const z0 = -Math.cos(a) * zBack;
    const xm = Math.sin(a) * 0.42 * out;
    const zm = -Math.cos(a) * zBack * out;
    const w = wave * Math.sin(t * 9);
    lock(parent, [
      [x0 * 0.8, topY, z0 * 0.75 + 0.02],
      [x0 * 1.05 - w * 0.3, (topY + endY) * 0.5 + 0.1, z0 * 1.15 + w * 0.2],
      [xm, endY * 0.45, zm + w * 0.4],
      [xm * 1.12 + w, endY, zm * 1.12],
    ], 0.25, 0.13, mat, 0.028);
  }
}

export function buildHair(doll, style, colorId) {
  const mat = hairMaterial((HAIR_COLORS[colorId] || HAIR_COLORS.ink).hex);
  const g = new THREE.Group();
  const prof = doll.head.profile;
  g.add(hairShells(mat, doll.head.profile, doll.zs, 0.012));
  g.add(fringeSheet(mat, prof, doll.zs, { midDrop: 0.225, sideDrop: 0.125, out: 0.048 }));

  if (style === 'long') {
    sideLocks(g, mat, prof, -0.75, 0.22);
    backLocks(g, mat, { count: 19, endY: -1.15, spread: 1.02, out: 1.18 });
  } else if (style === 'wavy') {
    sideLocks(g, mat, prof, -0.65, 0.23);
    backLocks(g, mat, { count: 21, endY: -1.05, spread: 1.05, out: 1.28, wave: 0.10 });
  } else if (style === 'twin') {
    sideLocks(g, mat, prof, -0.30, 0.2);
    for (const s of [-1, 1]) {
      const base = new THREE.Group();
      base.position.set(s * 0.30, 0.66, -0.12);
      base.rotation.z = -s * 0.35;
      base.rotation.x = 0.22;
      g.add(base);
      const tie = m(new THREE.TorusGeometry(0.075, 0.028, 8, 20), clothMaterial('#d98ba0'));
      tie.rotation.x = Math.PI / 2;
      tie.position.set(0, 0.02, 0);
      base.add(tie);
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 1.5;
        const len = 0.95 + Math.cos(a) * 0.22;
        lock(base, [
          [0, 0.0, 0],
          [a * 0.16, -len * 0.45, 0.02],
          [a * 0.30, -len * 0.85, 0.0],
          [a * 0.34, -len, -0.04],
        ], 0.13, 0.055, mat, 0.024);
      }
    }
  } else if (style === 'bob') {
    sideLocks(g, mat, prof, 0.22, 0.24);
    backLocks(g, mat, { count: 17, endY: 0.20, spread: 1.05, out: 1.12, topY: 0.80 });
  } else if (style === 'bun') {
    sideLocks(g, mat, prof, -0.20, 0.18);
    backLocks(g, mat, { count: 13, endY: 0.42, spread: 0.82, out: 1.05, topY: 0.80 });
    const bun = m(new THREE.SphereGeometry(0.175, 24, 18), mat);
    bun.position.set(0, 1.03, -0.17);
    bun.scale.set(1.12, 0.95, 1.0);
    g.add(bun);
    const bun2 = m(new THREE.SphereGeometry(0.12, 20, 14), mat);
    bun2.position.set(0, 0.98, -0.30);
    g.add(bun2);
  }

  doll.rig.head.add(g);
  return g;
}

/* ---------------- outfits ---------------- */

function chestShell(geoProfile, mat, parent, y0 = 0, zScale = 0.92) {
  const o = m(latheGeo(geoProfile, 56), mat);
  o.scale.z = zScale;
  o.position.y = y0;
  parent.add(o);
  return o;
}

// garment bodice derived from the body profile so the two never intersect
function bodiceShell(doll, mat, opts = {}) {
  const { margin = 0.034, top = 0.95, bottom = -0.065, waistPull = 0.96 } = opts;
  const p = doll.chestProfile.filter(([rr, y]) => y <= doll.chestH * top);
  const prof = [[p[0][0] * waistPull, bottom], ...p.map(([rr, y]) => [rr + margin, y])];
  const o = m(latheGeo(prof, 64), mat);
  o.scale.z = doll.zs;
  doll.rig.chest.add(o);
  return o;
}

function bow(parent, mat, pos, scale = 1, color = null) {
  const grp = new THREE.Group();
  grp.position.copy(pos);
  for (const s of [-1, 1]) {
    const w = m(new THREE.SphereGeometry(1, 16, 12), mat);
    w.scale.set(0.075 * scale, 0.052 * scale, 0.028 * scale);
    w.position.x = s * 0.062 * scale;
    w.rotation.z = s * 0.35;
    grp.add(w);
  }
  const knot = m(new THREE.SphereGeometry(1, 12, 10), mat);
  knot.scale.setScalar(0.028 * scale);
  grp.add(knot);
  parent.add(grp);
  return grp;
}

export function buildOutfit(doll, id) {
  const r = doll.rig;
  const chestH = doll.chestH;
  const waistR = doll.size.waistR;
  const hipR = doll.size.hipR;

  if (id === 'none') return;

  if (id === 'lolita') {
    const pink = clothMaterial('#e096ae', { sheen: 0.35, sheenColor: '#ffe4ee' });
    const lace = clothMaterial('#fff6f8', { roughness: 0.85, sheen: 0.7 });
    const trim = clothMaterial('#c9738f', { sheen: 0.6 });

    // bodice
    bodiceShell(doll, pink, { margin: 0.036 });

    // skirt tiers
    const s1 = m(flareGeo({
      topR: waistR * 1.06, botR: waistR * 2.9, topY: 0.34, botY: -0.46,
      waves: 0, amp: 0, segU: 88, segV: 10, rippleAmp: 0.02,
    }), pink);
    s1.scale.z = 0.92;
    r.hips.add(s1);
    const s2 = m(flareGeo({
      topR: waistR * 2.86, botR: waistR * 3.3, topY: -0.46, botY: -0.62,
      waves: 16, amp: 0.10, mode: 'scallop', segU: 108, segV: 8,
    }), lace);
    s2.scale.z = 0.92;
    r.hips.add(s2);
    const hem = m(new THREE.TorusGeometry(waistR * 3.34, 0.022, 6, 60), trim);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = -0.62;
    hem.scale.z = 0.92;
    r.hips.add(hem);

    // sash
    const sash = m(new THREE.TorusGeometry(waistR * 1.08, 0.036, 8, 40), trim);
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 0.33;
    sash.scale.z = 0.92;
    r.hips.add(sash);
    bow(r.hips, trim, new THREE.Vector3(0, 0.30, waistR * 1.02), 1.15);

    // puff sleeves + short sleeves
    for (const s of ['L', 'R']) {
      const sign = s === 'L' ? 1 : -1;
      const puff = m(new THREE.SphereGeometry(1, 20, 16), pink);
      puff.scale.set(0.175, 0.155, 0.16);
      puff.position.set(sign * 0.02, -0.03, 0);
      r.arms[s].shoulder.add(puff);
      const cuff = m(new THREE.TorusGeometry(0.10, 0.022, 6, 24), lace);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.12;
      r.arms[s].shoulder.add(cuff);
    }
    // collar
    const collar = m(new THREE.TorusGeometry(0.135, 0.032, 8, 36), lace);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = chestH * 0.96;
    collar.scale.z = 0.92;
    r.chest.add(collar);
  }

  if (id === 'jk') {
    const white = clothMaterial('#e9ecf5', { sheen: 0.45, sheenColor: '#cfd8f5' });
    const navy = clothMaterial('#2f3450', { sheen: 0.55, sheenColor: '#9aa6d6' });
    const red = clothMaterial('#b8454f', { sheen: 0.5 });

    bodiceShell(doll, white, { margin: 0.03 });

    // sailor collar
    const col = m(new THREE.TorusGeometry(0.155, 0.05, 6, 40, Math.PI * 1.35), navy);
    col.rotation.x = Math.PI / 2;
    col.rotation.z = Math.PI * 0.82;
    col.position.y = chestH * 0.94;
    col.scale.z = 0.93;
    r.chest.add(col);
    const flap = m(new THREE.CircleGeometry(0.14, 20, 0, Math.PI), navy);
    flap.position.set(0, chestH * 0.86, 0.30);
    flap.rotation.x = -0.25;
    r.chest.add(flap);

    // tie
    const knot = m(new THREE.SphereGeometry(1, 14, 10), red);
    knot.scale.set(0.032, 0.028, 0.02);
    knot.position.set(0, chestH * 0.80, 0.34);
    r.chest.add(knot);
    const tail = m(new THREE.ConeGeometry(0.055, 0.17, 4), red);
    tail.position.set(0, chestH * 0.72, 0.34);
    r.chest.add(tail);

    // pleated skirt
    const sk = m(flareGeo({
      topR: waistR * 1.05, botR: waistR * 2.65, topY: 0.34, botY: -0.34,
      waves: 22, amp: 0.075, mode: 'pleat', segU: 132, segV: 9,
    }), navy);
    sk.scale.z = 0.92;
    r.hips.add(sk);

    // sleeves
    for (const s of ['L', 'R']) {
      const sl = m(latheGeo([[0.115, 0], [0.12, 0.10], [0.115, 0.20], [0.10, 0.24]], 26), white);
      sl.position.y = -0.02;
      r.arms[s].shoulder.add(sl);
    }
  }

  if (id === 'gothic') {
    const black = clothMaterial('#211c26', { sheen: 0.7, sheenColor: '#8d7bb0' });
    const lace = clothMaterial('#efe7ee', { roughness: 0.9, sheen: 0.6 });
    const wine = clothMaterial('#5a2333', { sheen: 0.65 });

    bodiceShell(doll, black, { margin: 0.024 });

    // corset lacing
    for (let i = 0; i < 5; i++) {
      const line = m(new THREE.BoxGeometry(0.012, 0.06, 0.012), wine);
      line.position.set(0, chestH * (0.30 + i * 0.10), 0.335);
      r.chest.add(line);
    }
    // high collar
    const hc = m(latheGeo([[0.17, 0], [0.185, 0.10], [0.20, 0.22]], 30), black);
    hc.position.y = chestH * 0.94;
    r.chest.add(hc);

    // long skirt
    const sk = m(flareGeo({
      topR: waistR * 1.04, botR: waistR * 2.5, topY: 0.34, botY: -1.55,
      waves: 12, amp: 0.05, mode: 'soft', segU: 96, segV: 22, rippleAmp: 0.02,
    }), black);
    sk.scale.z = 0.92;
    r.hips.add(sk);
    const hem = m(new THREE.TorusGeometry(waistR * 2.5, 0.026, 6, 64), lace);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = -1.55;
    hem.scale.z = 0.92;
    r.hips.add(hem);

    // sleeves (long, fitted)
    for (const s of ['L', 'R']) {
      const up = m(latheGeo([[0.125, 0], [0.118, 0.25], [0.11, 0.5]], 24), black);
      up.position.y = 0.02;
      r.arms[s].shoulder.add(up);
    }
  }

  if (id === 'pajama') {
    const cream = clothMaterial('#f6ece0', { sheen: 0.5 });
    const dots = clothMaterial('#e6b8c4', { sheen: 0.4 });
    bodiceShell(doll, cream, { margin: 0.04 });
    for (const s of ['L', 'R']) {
      const sl = m(latheGeo([[0.135, 0], [0.142, 0.22], [0.13, 0.42]], 24), cream);
      sl.position.y = 0.02;
      r.arms[s].shoulder.add(sl);
    }
    const shorts = m(flareGeo({
      topR: waistR * 1.06, botR: waistR * 1.55, topY: 0.34, botY: -0.30,
      waves: 0, amp: 0, segU: 64, segV: 6,
    }), dots);
    shorts.scale.z = 0.92;
    r.hips.add(shorts);
    for (const s of ['L', 'R']) {
      const leg = m(latheGeo([[0.185, 0], [0.175, 0.18]], 26), dots);
      leg.position.y = -0.02;
      r.legs[s].hip.add(leg);
    }
  }
}

/* ---------------- shoes ---------------- */

export function buildShoes(doll, id) {
  if (id === 'bare') return;
  const r = doll.rig;
  const ah = doll.ankleH;
  const footR = doll.size.calfR * 0.9;

  for (const s of ['L', 'R']) {
    const ankle = r.legs[s].ankle;
    const g = new THREE.Group();
    ankle.add(g);

    if (id === 'maryjane') {
      const lea = leatherMaterial('#6b2f3d');
      const sole = m(new THREE.BoxGeometry(footR * 2.0, 0.05, footR * 3.5), lea);
      sole.position.set(0, -ah + 0.025, footR * 0.75);
      g.add(sole);
      const toe = m(new THREE.SphereGeometry(1, 20, 14), lea);
      toe.scale.set(footR * 1.02, footR * 0.62, footR * 1.3);
      toe.position.set(0, -ah * 0.62, footR * 1.05);
      g.add(toe);
      const heelCup = m(new THREE.SphereGeometry(1, 18, 14), lea);
      heelCup.scale.set(footR * 0.88, footR * 0.72, footR * 0.85);
      heelCup.position.set(0, -ah * 0.55, -0.02);
      g.add(heelCup);
      const strap = m(new THREE.TorusGeometry(footR * 0.85, 0.018, 6, 22, Math.PI * 1.1), lea);
      strap.rotation.x = Math.PI / 2;
      strap.rotation.z = Math.PI * 0.45;
      strap.position.set(0, -ah * 0.30, footR * 0.55);
      g.add(strap);
      const buckle = m(new THREE.BoxGeometry(0.03, 0.022, 0.012), metalMaterial('#e3c98f'));
      buckle.position.set(footR * 0.55, -ah * 0.30, footR * 0.55);
      g.add(buckle);
    }

    if (id === 'boots') {
      const lea = leatherMaterial('#33252c');
      const sole = m(new THREE.BoxGeometry(footR * 2.05, 0.055, footR * 3.4), lea);
      sole.position.set(0, -ah + 0.028, footR * 0.72);
      g.add(sole);
      const heel = m(new THREE.BoxGeometry(footR * 1.2, ah * 0.55, footR * 0.8), lea);
      heel.position.set(0, -ah * 0.72, -0.05);
      g.add(heel);
      const footShell = m(latheGeo([[footR * 1.0, 0], [footR * 0.98, ah * 0.5], [footR * 0.95, ah * 1.0]], 26), lea);
      footShell.position.y = -ah;
      g.add(footShell);
      const toe = m(new THREE.SphereGeometry(1, 20, 14), lea);
      toe.scale.set(footR * 1.02, footR * 0.55, footR * 1.2);
      toe.position.set(0, -ah * 0.75, footR * 1.0);
      g.add(toe);
      const shaft = m(latheGeo([[footR * 0.98, 0], [footR * 0.95, doll.calfLen * 0.45], [footR * 0.92, doll.calfLen * 0.86]], 26), lea);
      shaft.position.y = 0.0;
      g.add(shaft);
    }

    if (id === 'sandals') {
      const lea = leatherMaterial('#c9a86b');
      const sole = m(new THREE.BoxGeometry(footR * 1.95, 0.04, footR * 3.3), lea);
      sole.position.set(0, -ah + 0.02, footR * 0.72);
      g.add(sole);
      for (let i = 0; i < 3; i++) {
        const strap = m(new THREE.TorusGeometry(footR * 0.8, 0.014, 6, 20, Math.PI), lea);
        strap.rotation.y = Math.PI / 2;
        strap.rotation.z = 0;
        strap.position.set(0, -ah * 0.62, footR * (0.35 + i * 0.32));
        strap.scale.set(1, 0.8, 1);
        g.add(strap);
      }
      const anklet = m(new THREE.TorusGeometry(footR * 0.72, 0.014, 6, 20), lea);
      anklet.rotation.x = Math.PI / 2;
      anklet.position.y = -ah * 0.15;
      g.add(anklet);
    }

    if (id === 'sneaker') {
      const lea = leatherMaterial('#f2eee7');
      const sole = m(new THREE.BoxGeometry(footR * 2.1, 0.055, footR * 3.5), lea);
      sole.position.set(0, -ah + 0.028, footR * 0.75);
      g.add(sole);
      const body = m(new THREE.SphereGeometry(1, 20, 14), lea);
      body.scale.set(footR * 1.05, footR * 0.75, footR * 1.35);
      body.position.set(0, -ah * 0.55, footR * 0.85);
      g.add(body);
      const high = m(new THREE.SphereGeometry(1, 18, 14), lea);
      high.scale.set(footR * 0.95, footR * 0.8, footR * 0.8);
      high.position.set(0, -ah * 0.45, -0.04);
      g.add(high);
      const lace = m(new THREE.TorusGeometry(footR * 0.55, 0.012, 5, 16, Math.PI), clothMaterial('#c96b7a'));
      lace.rotation.x = Math.PI / 2.2;
      lace.position.set(0, -ah * 0.30, footR * 0.45);
      g.add(lace);
    }
  }
}
// a gap-free fringe sheet cut from the head profile
function fringeSheet(mat, profile, zs, opts = {}) {
  const {
    topY = 0.865, span = 1.02, midDrop = 0.235, sideDrop = 0.145,
    out = 0.05, segU = 48, segV = 12,
  } = opts;
  const pos = [], idx = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const a = (u - 0.5) * 2 * span;
      const drop = sideDrop + (midDrop - sideDrop) * Math.cos(a * 0.92);
      const y = topY - drop * v - 0.011 * v * Math.sin(a * 14.5);
      const r = radiusAt(profile, y) * (1 + out) * (1 + 0.026 * Math.sin(a * 13)) + 0.005;
      pos.push(Math.sin(a) * r, y, Math.cos(a) * r * zs + 0.012);
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
  g.setIndex(idx);
  g.computeVertexNormals();
  const o = m(g, mat);
  return o;
}

