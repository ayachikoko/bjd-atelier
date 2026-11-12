import { Stage, BACKDROPS } from './stage.js';
import { SIZES, HEADS, buildDoll, buildFace, applyPose } from './doll.js';
import { HAIRS, HAIR_COLORS, buildHair, buildOutfit, buildShoes } from './wardrobe.js';
import { SKIN_TONES, MAKEUP, createMaterials } from './materials.js';
import { disposeTree } from './core.js';

export const POSES = {
  stand: { label: '标准站姿', rot: { shoulderL: { z: 6, x: -3 }, shoulderR: { z: -6, x: -3 }, elbowL: { x: -8 }, elbowR: { x: -8 } } },
  hands: {
    label: '乖巧并手',
    rot: {
      shoulderL: { z: -10, x: -8 }, shoulderR: { z: 10, x: -8 },
      elbowL: { x: -38 }, elbowR: { x: -38 }, wristL: { x: -8 }, wristR: { x: -8 },
      head: { z: 4, y: -7 }, neck: { x: 3 },
    },
  },
  look: {
    label: '回眸一笑',
    rot: { head: { y: 30, z: -5 }, neck: { y: 9 }, chest: { y: 14 }, spine: { y: 7 }, shoulderL: { z: 8 }, shoulderR: { z: -9 } },
  },
  wave: {
    label: '抬手招呼',
    rot: {
      shoulderR: { z: -104, x: -16 }, elbowR: { x: -54, z: -8 }, wristR: { z: -12 },
      head: { y: 6, z: -7 }, shoulderL: { z: 8 }, elbowL: { x: -10 },
    },
  },
  stretch: {
    label: '舒展',
    rot: {
      shoulderL: { z: 116, x: -8 }, shoulderR: { z: -116, x: -8 },
      elbowL: { x: -12 }, elbowR: { x: -12 }, head: { x: -9 }, chest: { x: -4 },
    },
  },
};

const CATS = [
  { id: 'size', label: '尺寸' },
  { id: 'head', label: '娃头' },
  { id: 'makeup', label: '妆容' },
  { id: 'hair', label: '发型' },
  { id: 'outfit', label: '服装' },
  { id: 'shoes', label: '鞋履' },
  { id: 'pose', label: '姿势' },
  { id: 'bg', label: '背景' },
];

const OUTFITS = { none: '素体', lolita: '洛丽塔裙', jk: 'JK 制服', gothic: '哥特长裙', pajama: '居家睡衣' };
const SHOES = { bare: '裸足', maryjane: '玛丽珍', boots: '长靴', sandals: '凉鞋', sneaker: '运动鞋' };

const state = {
  size: 'sd', head: 'oval', makeup: 'sweet', skin: 'porcelain',
  hair: 'long', hairColor: 'ink', outfit: 'lolita', shoes: 'maryjane',
  pose: 'stand', bg: 'studio',
};

const q = new URLSearchParams(location.search);
for (const k of Object.keys(state)) {
  const v = q.get(k);
  if (v != null && (k in state)) state[k] = v;
}

const canvas = document.getElementById('stage');
const stage = new Stage(canvas);
stage.setBackdrop(state.bg);

let dollObj = null;
let currentCat = 'size';

function rebuild(refit = false) {
  if (dollObj) {
    stage.dollGroup.remove(dollObj);
    disposeTree(dollObj);
  }
  const mats = createMaterials(state.skin, state.makeup);
  const d = buildDoll(state, mats);
  buildFace(d, mats);
  buildHair(d, state.hair, state.hairColor);
  buildOutfit(d, state.outfit);
  buildShoes(d, state.shoes);
  applyPose(d, POSES[state.pose].rot);

  const worldH = 3.4 * (d.size.cm / 60);
  const k = worldH / d.H;
  d.root.scale.setScalar(k);
  d.root.position.y = 0;

  dollObj = d.root;
  currentDoll = d;
  stage.dollGroup.add(d.root);
  stage.setDoll(d.root, worldH, d.size.cm, refit);
  updateMeta();
}

function updateMeta() {
  const s = SIZES[state.size];
  document.getElementById('meta').textContent =
    `${s.label} · 全高 ${s.cm}cm · ${s.H.toFixed(1)} 头身`;
  document.getElementById('combo').textContent =
    `${HEADS[state.head].label} / ${MAKEUP[state.makeup].label} / ${HAIRS[state.hair].label}`;
}

/* ---------------- UI ---------------- */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function chip(label, active, onClick, sub) {
  const b = el('button', 'chip' + (active ? ' on' : ''));
  b.appendChild(el('span', 'chip-label', label));
  if (sub) b.appendChild(el('span', 'chip-sub', sub));
  b.addEventListener('click', onClick);
  return b;
}

function swatch(label, hex, active, onClick) {
  const b = el('button', 'swatch' + (active ? ' on' : ''));
  const dot = el('span', 'swatch-dot');
  dot.style.background = hex;
  b.appendChild(dot);
  b.appendChild(el('span', 'swatch-label', label));
  b.addEventListener('click', onClick);
  return b;
}

function row(label, nodes) {
  const r = el('div', 'row');
  if (label) r.appendChild(el('span', 'row-label', label));
  const wrap = el('div', 'row-items');
  nodes.forEach((n) => wrap.appendChild(n));
  r.appendChild(wrap);
  return r;
}

function set(key, value, refit = false) {
  if (state[key] === value) return;
  state[key] = value;
  if (key === 'bg') {
    stage.setBackdrop(value);
    renderRows();
    return;
  }
  if (key === 'pose') {
    applyPose(currentDoll, POSES[value].rot);
    renderRows();
    return;
  }
  rebuild(refit || key === 'size');
  renderRows();
}

let currentDoll = null;

function renderRows() {
  const host = document.getElementById('rows');
  host.innerHTML = '';
  const c = currentCat;

  if (c === 'size') {
    host.appendChild(row('', Object.values(SIZES).map((s) =>
      chip(s.label, state.size === s.id, () => set('size', s.id, true), s.sub))));
  } else if (c === 'head') {
    host.appendChild(row('脸型', Object.values(HEADS).map((h) =>
      chip(h.label, state.head === h.id, () => set('head', h.id)))));
  } else if (c === 'makeup') {
    host.appendChild(row('妆面', Object.values(MAKEUP).map((m) =>
      chip(m.label, state.makeup === Object.keys(MAKEUP).find((k) => MAKEUP[k] === m), () => {
        set('makeup', Object.keys(MAKEUP).find((k) => MAKEUP[k] === m));
      }))));
    host.appendChild(row('肤色', Object.values(SKIN_TONES).map((s) =>
      chip(s.label, state.skin === Object.keys(SKIN_TONES).find((k) => SKIN_TONES[k] === s), () => {
        set('skin', Object.keys(SKIN_TONES).find((k) => SKIN_TONES[k] === s));
      }))));
  } else if (c === 'hair') {
    host.appendChild(row('款式', Object.values(HAIRS).map((h) =>
      chip(h.label, state.hair === Object.keys(HAIRS).find((k) => HAIRS[k] === h), () => {
        set('hair', Object.keys(HAIRS).find((k) => HAIRS[k] === h));
      }))));
    host.appendChild(row('发色', Object.values(HAIR_COLORS).map((h) =>
      swatch(h.label, h.hex, state.hairColor === Object.keys(HAIR_COLORS).find((k) => HAIR_COLORS[k] === h), () => {
        set('hairColor', Object.keys(HAIR_COLORS).find((k) => HAIR_COLORS[k] === h));
      }))));
  } else if (c === 'outfit') {
    host.appendChild(row('', Object.entries(OUTFITS).map(([k, v]) =>
      chip(v, state.outfit === k, () => set('outfit', k)))));
  } else if (c === 'shoes') {
    host.appendChild(row('', Object.entries(SHOES).map(([k, v]) =>
      chip(v, state.shoes === k, () => set('shoes', k)))));
  } else if (c === 'pose') {
    host.appendChild(row('', Object.entries(POSES).map(([k, v]) =>
      chip(v.label, state.pose === k, () => set('pose', k)))));
  } else if (c === 'bg') {
    host.appendChild(row('', Object.values(BACKDROPS).map((b) =>
      chip(b.label, state.bg === b.id, () => set('bg', b.id)))));
  }
}

function renderTabs() {
  const host = document.getElementById('tabs');
  host.innerHTML = '';
  for (const c of CATS) {
    const b = el('button', 'tab' + (c.id === currentCat ? ' on' : ''), c.label);
    b.addEventListener('click', () => {
      currentCat = c.id;
      renderTabs();
      renderRows();
    });
    host.appendChild(b);
  }
}

/* ---------------- actions ---------------- */

function pick(obj) {
  const keys = Object.keys(obj);
  return keys[Math.floor(Math.random() * keys.length)];
}

document.getElementById('btn-random').addEventListener('click', () => {
  state.head = pick(HEADS);
  state.makeup = pick(MAKEUP);
  state.skin = pick(SKIN_TONES);
  state.hair = pick(HAIRS);
  state.hairColor = pick(HAIR_COLORS);
  state.outfit = pick(OUTFITS);
  state.shoes = pick(SHOES);
  state.pose = pick(POSES);
  state.bg = pick(BACKDROPS);
  stage.setBackdrop(state.bg);
  rebuild(true);
  renderRows();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  Object.assign(state, {
    size: 'sd', head: 'oval', makeup: 'sweet', skin: 'porcelain',
    hair: 'long', hairColor: 'ink', outfit: 'lolita', shoes: 'maryjane',
    pose: 'stand', bg: 'studio',
  });
  stage.setBackdrop(state.bg);
  rebuild(true);
  renderRows();
});

document.getElementById('btn-save').addEventListener('click', () => {
  const url = stage.snapshot();
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bjd-atelier.png';
  a.click();
});

window.addEventListener('resize', () => stage.resize());

/* ---------------- boot ---------------- */

renderTabs();
rebuild(true);
renderRows();
const zoomQ = parseFloat(q.get('zoom'));
if (zoomQ) {
  stage.zoom = zoomQ;
  stage._frame();
  stage.orbit.radius = stage.orbit.tr;
}
if (q.get('look') === 'head') {
  stage.lockTarget = stage.height * 0.905;
  stage.zoom = 0.15;
  stage._frame();
  stage.orbit.radius = stage.orbit.tr;
  stage.orbit.phi = stage.orbit.tp = 1.46;
}
document.getElementById('loader').style.opacity = '0';
setTimeout(() => document.getElementById('loader').remove(), 700);

export { state };
window.__bjd = { state, rebuild, stage };
