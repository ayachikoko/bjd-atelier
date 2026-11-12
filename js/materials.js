import * as THREE from 'three';

export const SKIN_TONES = {
  porcelain: { label: '白瓷', base: '#f8e8e0', deep: '#e9cfc4', sheen: '#ffe6f0' },
  natural: { label: '自然', base: '#f2d8c4', deep: '#dcbba4', sheen: '#ffe0cf' },
  honey: { label: '蜜色', base: '#e6bd9d', deep: '#caa084', sheen: '#ffdcc4' },
  rose: { label: '粉瓷', base: '#f9dfdc', deep: '#e8c3c1', sheen: '#ffe4ef' },
};

export const MAKEUP = {
  clear: {
    label: '素颜清透', iris: '#8ea9bd', irisDeep: '#3d5566',
    lip: '#c98a86', lipDeep: '#a96a6b', blush: '224,140,150', blushStr: 0.5,
    shadow: null, shadowStr: 0, lash: 0.85, brow: '#6b5148',
  },
  sweet: {
    label: '甜系粉调', iris: '#a87e6c', irisDeep: '#5c3b30',
    lip: '#d4697d', lipDeep: '#b04f63', blush: '235,120,140', blushStr: 0.85,
    shadow: '214,140,175', shadowStr: 0.6, lash: 1.05, brow: '#6f4f49',
  },
  gothic: {
    label: '哥特烟熏', iris: '#9a7fae', irisDeep: '#40304f',
    lip: '#7d2b3a', lipDeep: '#5a1c29', blush: '190,120,150', blushStr: 0.3,
    shadow: '110,80,130', shadowStr: 1.1, lash: 1.4, brow: '#4c3a42',
  },
  peach: {
    label: '晨光蜜桃', iris: '#b58a63', irisDeep: '#6b4a33',
    lip: '#cf7f6e', lipDeep: '#b06152', blush: '240,150,120', blushStr: 0.65,
    shadow: '230,160,120', shadowStr: 0.5, lash: 0.95, brow: '#7a5a46',
  },
};

export function createMaterials(skinId, makeupId) {
  const s = SKIN_TONES[skinId] || SKIN_TONES.porcelain;
  const m = MAKEUP[makeupId] || MAKEUP.clear;

  const skin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(s.base),
    roughness: 0.48,
    metalness: 0.0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.46,
    sheen: 0.28,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(s.sheen),
  });

  const joint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(s.deep).lerp(new THREE.Color(s.base), 0.35),
    roughness: 0.3,
    clearcoat: 0.85,
    clearcoatRoughness: 0.22,
    sheen: 0.3,
    sheenColor: new THREE.Color(s.sheen),
  });

  const eyeWhite = new THREE.MeshPhysicalMaterial({
    color: 0xfdfaf8, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04,
  });

  const lash = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.brow).multiplyScalar(0.55), roughness: 0.45, clearcoat: 0.3,
  });

  const lip = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.lip), roughness: 0.44, clearcoat: 0.4, clearcoatRoughness: 0.35,
  });

  const brow = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.brow), roughness: 0.6,
  });

  return { skin, joint, eyeWhite, lash, lip, brow, makeup: m, skinDef: s };
}

export function hairMaterial(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    roughness: 0.46,
    metalness: 0.03,
    clearcoat: 0.22,
    clearcoatRoughness: 0.42,
    sheen: 0.45,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
    side: THREE.DoubleSide,
  });
}

export function clothMaterial(hex, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    roughness: opts.roughness ?? 0.72,
    metalness: 0.0,
    sheen: opts.sheen ?? 0.55,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(opts.sheenColor ?? '#ffffff'),
    side: opts.side ?? THREE.DoubleSide,
    clearcoat: opts.clearcoat ?? 0,
    clearcoatRoughness: 0.5,
  });
}

export function leatherMaterial(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex), roughness: 0.34, clearcoat: 0.75, clearcoatRoughness: 0.22,
  });
}

export function metalMaterial(hex = '#d8c39a') {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex), metalness: 0.9, roughness: 0.28,
  });
}
