import * as THREE from 'three';
import { latheGeo, limbGeo, lockGeo, TAU, DEG, irisCapTexture, blushTexture, shadowTexture, texFromCanvas } from './core.js';

export const SIZES = {
  sd: { id: 'sd', label: '1/3 SD', sub: '60cm', cm: 60, H: 7.2, child: 0.0, hipR: 0.44, waistR: 0.315, chestR: 0.415, shoulder: 0.42, thighR: 0.20, calfR: 0.162, armR: 0.124, foreR: 0.104 },
  msd: { id: 'msd', label: '1/4 MSD', sub: '45cm', cm: 45, H: 6.2, child: 0.45, hipR: 0.455, waistR: 0.345, chestR: 0.425, shoulder: 0.425, thighR: 0.213, calfR: 0.176, armR: 0.132, foreR: 0.113 },
  yosd: { id: 'yosd', label: '1/6 YOSD', sub: '26cm', cm: 26, H: 5.0, child: 0.85, hipR: 0.47, waistR: 0.375, chestR: 0.445, shoulder: 0.435, thighR: 0.232, calfR: 0.196, armR: 0.141, foreR: 0.122 },
  tiny: { id: 'tiny', label: '1/12', sub: '15cm', cm: 15, H: 4.3, child: 1.0, hipR: 0.48, waistR: 0.39, chestR: 0.455, shoulder: 0.44, thighR: 0.242, calfR: 0.205, armR: 0.147, foreR: 0.128 },
};

export const HEADS = {
  oval: {
    id: 'oval', label: '鹅蛋脸', eyeY: 0.455, eyeX: 0.156, eyeS: 1.0, browY: 0.582, lipY: 0.215,
    profile: [[0.02, 0], [0.10, 0.02], [0.18, 0.07], [0.26, 0.14], [0.33, 0.24], [0.395, 0.36], [0.432, 0.50], [0.444, 0.62], [0.437, 0.74], [0.408, 0.84], [0.345, 0.92], [0.20, 0.975], [0.0, 1.0]],
  },
  sharp: {
    id: 'sharp', label: '尖下颌', eyeY: 0.475, eyeX: 0.150, eyeS: 0.94, browY: 0.595, lipY: 0.235,
    profile: [[0.012, 0], [0.065, 0.03], [0.135, 0.09], [0.215, 0.17], [0.30, 0.28], [0.375, 0.40], [0.425, 0.54], [0.442, 0.66], [0.435, 0.77], [0.405, 0.86], [0.335, 0.93], [0.19, 0.98], [0.0, 1.0]],
  },
  baby: {
    id: 'baby', label: '婴儿肥', eyeY: 0.435, eyeX: 0.166, eyeS: 1.1, browY: 0.568, lipY: 0.205,
    profile: [[0.03, 0], [0.12, 0.02], [0.215, 0.07], [0.30, 0.15], [0.375, 0.26], [0.425, 0.38], [0.448, 0.52], [0.452, 0.64], [0.44, 0.75], [0.405, 0.85], [0.335, 0.93], [0.19, 0.98], [0.0, 1.0]],
  },
  mature: {
    id: 'mature', label: '成熟颜', eyeY: 0.492, eyeX: 0.150, eyeS: 0.88, browY: 0.605, lipY: 0.235,
    profile: [[0.02, 0], [0.075, 0.02], [0.145, 0.07], [0.225, 0.15], [0.305, 0.26], [0.375, 0.39], [0.42, 0.53], [0.437, 0.65], [0.432, 0.76], [0.405, 0.86], [0.34, 0.93], [0.19, 0.98], [0.0, 1.0]],
  },
};

export const Z_SCALE = 0.92;
export const Z_OFF = 0.012;

export function radiusAt(profile, y) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0 || 1);
      return r0 + (r1 - r0) * t;
    }
  }
  return profile[profile.length - 1][0];
}

export function surfacePointOf(profile, y, theta) {
  const r = radiusAt(profile, y);
  return new THREE.Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r * Z_SCALE + Z_OFF);
}
const surfacePoint = surfacePointOf;
function surfaceNormal(theta) {
  return new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta) / (Z_SCALE * Z_SCALE)).normalize();
}

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addBall(parent, r, mats, y = 0, x = 0, z = 0) {
  const b = mesh(new THREE.SphereGeometry(r, 26, 20), mats.joint);
  b.position.set(x, y, z);
  parent.add(b);
  return b;
}

function addSeam(parent, r, mats, y = 0) {
  const t = mesh(new THREE.TorusGeometry(r * 1.005, r * 0.045, 6, 30), mats.joint);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  parent.add(t);
}

function buildHand(mats, er, side) {
  const g = new THREE.Group();
  const palm = mesh(new THREE.SphereGeometry(1, 20, 16), mats.skin);
  palm.scale.set(0.075 * er, 0.098 * er, 0.042 * er);
  palm.position.y = -0.075 * er;
  g.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = mesh(limbGeo(0.085 * er, 0.019 * er, 0.015 * er, 14), mats.skin);
    f.position.set((i - 1.5) * 0.038 * er, -0.145 * er, 0.004 * er);
    f.rotation.z = (i - 1.5) * 4 * DEG;
    f.rotation.x = -6 * DEG;
    g.add(f);
  }
  const thumb = mesh(limbGeo(0.065 * er, 0.021 * er, 0.016 * er, 14), mats.skin);
  thumb.position.set(-0.075 * er * side, -0.072 * er, 0.03 * er);
  thumb.rotation.z = -32 * DEG * side;
  thumb.rotation.x = -22 * DEG;
  g.add(thumb);
  return g;
}

function buildFoot(mats, ankleH, r) {
  const g = new THREE.Group();
  const heel = mesh(new THREE.SphereGeometry(1, 18, 14), mats.skin);
  heel.scale.set(r * 0.85, r * 0.9, r * 0.9);
  heel.position.set(0, -ankleH * 0.42, -0.035);
  g.add(heel);
  const body = mesh(new THREE.SphereGeometry(1, 22, 16), mats.skin);
  body.scale.set(r * 1.02, r * 0.62, r * 1.75);
  body.position.set(0, -ankleH * 0.60, r * 0.72);
  g.add(body);
  const toe = mesh(new THREE.SphereGeometry(1, 18, 14), mats.skin);
  toe.scale.set(r * 0.9, r * 0.42, r * 0.55);
  toe.position.set(0, -ankleH * 0.86, r * 1.55);
  g.add(toe);
  return g;
}

export function buildDoll(state, mats, headDef) {
  const size = SIZES[state.size] || SIZES.sd;
  const head = headDef || HEADS[state.head] || HEADS.oval;
  const H = size.H;
  const child = size.child;

  // ---- proportions (head units) ----
  const headH = 1.0;
  const neckLen = 0.30 + 0.04 * (1 - child);
  const torsoLen = H * 0.285 + 0.03 * child;
  const legToHip = H - headH - neckLen - torsoLen;
  const thighLen = legToHip * 0.505;
  const calfLen = legToHip * 0.415;
  const ankleH = legToHip - thighLen - calfLen;
  const upperArm = H * 0.152;
  const foreArm = H * 0.138;

  const k = size.hipR / 0.42;
  const zs = Z_SCALE;

  const root = new THREE.Group();

  const hips = new THREE.Group();
  hips.position.y = legToHip;
  root.add(hips);

  // pelvis shell
  const pelvis = mesh(latheGeo([
    [0.06 * k, -0.27], [0.15 * k, -0.235], [0.245 * k, -0.175], [0.335 * k, -0.09],
    [0.40 * k, 0.01], [0.425 * k, 0.12], [0.395 * k, 0.23], [0.35 * k, 0.31], [0.325 * k, 0.36],
  ].map(([r, y]) => [r, y]), 56), mats.skin);
  pelvis.scale.z = zs;
  hips.add(pelvis);

  // waist joint
  addBall(hips, size.waistR * 0.93, mats, 0.36);
  addSeam(hips, size.waistR * 0.93, mats, 0.36);

  const spine = new THREE.Group();
  spine.position.y = 0.36;
  hips.add(spine);

  const chestH = torsoLen - 0.36;
  const chestProfile = [
    [0.315, 0], [0.332, 0.08], [0.375, 0.22], [0.405, 0.38], [0.415, 0.50],
    [0.402, 0.62], [0.372, 0.72], [0.328, 0.82], [0.268, 0.90], [0.215, 0.96],
  ].map(([r, v]) => [r * (size.chestR / 0.415), v * chestH]);
  const chest = mesh(latheGeo(chestProfile, 56), mats.skin);
  chest.scale.z = zs;
  spine.add(chest);

  // ---- neck + head ----
  const neck = new THREE.Group();
  neck.position.y = chestH * 0.965;
  spine.add(neck);
  const neckMesh = mesh(latheGeo([[0.135, 0], [0.145, 0.1], [0.15, neckLen * 0.7], [0.142, neckLen]], 32), mats.skin);
  neckMesh.scale.z = zs;
  neck.add(neckMesh);
  addBall(neck, 0.16, mats, 0.02);
  addSeam(neck, 0.155, mats, 0.0);

  const headG = new THREE.Group();
  headG.position.y = neckLen;
  neck.add(headG);
  const headMesh = mesh(latheGeo(head.profile, 64), mats.skin);
  headMesh.scale.z = zs;
  headMesh.position.z = Z_OFF;
  headG.add(headMesh);
  addBall(headG, 0.13, mats, 0.01);

  // ---- arms ----
  const arms = {};
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * size.shoulder, chestH * 0.90, 0);
    spine.add(shoulder);
    addBall(shoulder, 0.158 * (0.9 + child * 0.2), mats);
    const upper = mesh(limbGeo(upperArm, size.armR, size.foreR * 1.02, 24), mats.skin);
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -upperArm;
    shoulder.add(elbow);
    addBall(elbow, size.foreR * 1.16, mats);

    const fore = mesh(limbGeo(foreArm, size.foreR, size.foreR * 0.78, 22), mats.skin);
    elbow.add(fore);

    const wrist = new THREE.Group();
    wrist.position.y = -foreArm;
    elbow.add(wrist);
    addBall(wrist, size.foreR * 0.8, mats);

    const hand = buildHand(mats, 1 + child * 0.18, s);
    wrist.add(hand);

    arms[side] = { shoulder, elbow, wrist, hand };
  }

  // ---- legs ----
  const legs = {};
  for (const [side, s] of [['L', 1], ['R', -1]]) {
    const hip = new THREE.Group();
    hip.position.set(s * size.hipR * 0.58, -0.185, 0);
    hips.add(hip);
    addBall(hip, size.thighR * 1.02, mats);
    const thigh = mesh(limbGeo(thighLen, size.thighR, size.thighR * 0.8, 24), mats.skin);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -thighLen;
    hip.add(knee);
    addBall(knee, size.thighR * 0.74, mats);
    addSeam(knee, size.thighR * 0.74, mats);

    const calf = mesh(limbGeo(calfLen, size.calfR, size.calfR * 0.62, 24), mats.skin);
    knee.add(calf);

    const ankle = new THREE.Group();
    ankle.position.y = -calfLen;
    knee.add(ankle);
    addBall(ankle, size.calfR * 0.52, mats);

    const foot = buildFoot(mats, ankleH, size.calfR * 0.9);
    ankle.add(foot);
    // let the sole touch y=0
    const soleFix = new THREE.Group();
    ankle.add(soleFix);

    legs[side] = { hip, knee, ankle, foot };
  }

  const rig = { hips, spine, chest, neck, head: headG, arms, legs };

  return {
    root, rig, size, head, headH, neckLen, torsoLen, legToHip, thighLen, calfLen, ankleH,
    upperArm, foreArm, chestH, chestProfile, k, zs, H,
    headRadius: radiusAt(head.profile, 0.62),
    radiusAt: (y) => radiusAt(head.profile, y),
  };
}

/* ---------------- face ---------------- */

export function buildFace(doll, mats) {
  const head = doll.head;
  const m = mats.makeup;
  const g = doll.rig.head;
  const grp = new THREE.Group();
  g.add(grp);

  const er = 0.105 * head.eyeS;
  const eyeY = head.eyeY;
  const eyeTheta = 0.40; // rad from front
  const iris = irisCapTexture(m.iris, m.irisDeep);

  for (const s of [-1, 1]) {
    const theta = s * eyeTheta;
    const p = surfacePoint(head.profile, eyeY, theta);
    const n = surfaceNormal(theta);
    const face = p.clone().addScaledVector(n, 2);

    const eye = mesh(new THREE.SphereGeometry(er, 30, 22), mats.eyeWhite);
    eye.scale.set(1.08, 0.90, 0.55);
    eye.position.copy(p).addScaledVector(n, -er * 0.35);
    eye.lookAt(face);
    grp.add(eye);

    const capGeo = new THREE.SphereGeometry(er * 1.006, 48, 26, 0, TAU, 0, 0.9);
    capGeo.rotateX(Math.PI / 2);
    const irisMesh = mesh(capGeo, new THREE.MeshPhysicalMaterial({
      map: iris, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03,
    }));
    irisMesh.scale.copy(eye.scale);
    irisMesh.position.copy(eye.position);
    irisMesh.quaternion.copy(eye.quaternion);
    irisMesh.rotateX(0.26);
    irisMesh.renderOrder = 3;
    grp.add(irisMesh);

    // upper lash line
    const lash = mesh(new THREE.TorusGeometry(er * 0.99, er * 0.075 * m.lash, 8, 32, Math.PI * 1.04), mats.lash);
    lash.position.copy(p).addScaledVector(n, er * 0.115);
    lash.lookAt(face);
    lash.rotateZ(-Math.PI * 0.02);
    lash.translateY(er * 0.012);
    lash.scale.set(1.06, 1.0, 1);
    lash.renderOrder = 4;
    grp.add(lash);

    // lower lash
    const llash = mesh(new THREE.TorusGeometry(er * 0.9, er * 0.028 * m.lash, 6, 22, Math.PI * 0.4), mats.lash);
    llash.position.copy(p).addScaledVector(n, er * 0.11);
    llash.lookAt(face);
    llash.rotateZ(Math.PI * 1.30);
    llash.translateY(-er * 0.02);
    llash.scale.set(1.1, 1.0, 1);
    llash.renderOrder = 4;
    grp.add(llash);

    // eyeshadow
    if (m.shadow) {
      const sh = mesh(new THREE.CircleGeometry(er * 1.25, 28), new THREE.MeshBasicMaterial({
        map: shadowTexture(m.shadow, m.shadowStr), transparent: true, depthWrite: false,
      }));
      sh.position.copy(p).addScaledVector(n, er * 0.30);
      sh.lookAt(face);
      sh.translateY(er * 0.52);
      sh.renderOrder = 2;
      grp.add(sh);
    }

    // brow: a thin lock that hugs the face surface
    const bpts = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      const th = s * (0.225 + u * 0.19);
      const yy = head.browY + Math.sin(u * Math.PI) * 0.012 - u * 0.010;
      const q = surfacePointOf(head.profile, yy, th);
      bpts.push([q.x * 1.004, q.y, q.z * 1.004 + 0.002]);
    }
    const brow = mesh(lockGeo(bpts, 0.030, 0.011, 0.008, 8, 0.5), mats.brow);
    grp.add(brow);

    // blush
    const bp = surfacePoint(head.profile, eyeY - 0.145, s * 0.66);
    const bn = surfaceNormal(s * 0.66);
    const blush = mesh(new THREE.CircleGeometry(0.115, 28), new THREE.MeshBasicMaterial({
      map: blushTexture(m.blush, m.blushStr), transparent: true, depthWrite: false,
    }));
    blush.position.copy(bp).addScaledVector(bn, 0.016);
    blush.lookAt(bp.clone().addScaledVector(bn, 2));
    blush.renderOrder = 2;
    grp.add(blush);
  }

  // nose
  const noseP = surfacePoint(head.profile, head.lipY + 0.105, 0);
  const nose = mesh(new THREE.SphereGeometry(1, 16, 12), mats.skin);
  nose.scale.set(0.022, 0.030, 0.012);
  nose.position.copy(noseP).addScaledVector(surfaceNormal(0), -0.010);
  grp.add(nose);

  // lips: two squashed spheres
  const lipY = head.lipY;
  const lp = surfacePoint(head.profile, lipY, 0);
  const lipN = surfaceNormal(0);
  const upper = mesh(new THREE.SphereGeometry(1, 20, 14), mats.lip);
  upper.scale.set(0.060, 0.023, 0.020);
  upper.position.copy(lp).addScaledVector(lipN, 0.002);
  upper.translateY(0.010);
  grp.add(upper);
  const lower = mesh(new THREE.SphereGeometry(1, 20, 14), mats.lip);
  lower.scale.set(0.054, 0.031, 0.022);
  lower.position.copy(lp).addScaledVector(lipN, 0.0);
  lower.translateY(-0.010);
  grp.add(lower);

  return grp;
}

/* ---------------- pose ---------------- */

export function applyPose(doll, pose) {
  const r = doll.rig;
  const all = [
    ['hips', r.hips],
    ['spine', r.spine], ['chest', r.chest], ['neck', r.neck], ['head', r.head],
    ['shoulderL', r.arms.L.shoulder], ['elbowL', r.arms.L.elbow], ['wristL', r.arms.L.wrist],
    ['shoulderR', r.arms.R.shoulder], ['elbowR', r.arms.R.elbow], ['wristR', r.arms.R.wrist],
    ['hipL', r.legs.L.hip], ['kneeL', r.legs.L.knee], ['ankleL', r.legs.L.ankle],
    ['hipR', r.legs.R.hip], ['kneeR', r.legs.R.knee], ['ankleR', r.legs.R.ankle],
  ];
  for (const [, g] of all) g.rotation.set(0, 0, 0);
  for (const [name, g] of all) {
    const p = pose && pose[name];
    if (!p) continue;
    g.rotation.set((p.x || 0) * DEG, (p.y || 0) * DEG, (p.z || 0) * DEG);
  }
}
