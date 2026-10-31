import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import defaults, { normalize } from './content.default.js';
import './site.css';

const html = htm.bind(React.createElement);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const preview = new URLSearchParams(location.search).has('preview');
const isMobile = () => innerWidth < 760;
const AURA = defaults.theme.aura;
gsap.registerPlugin(ScrollTrigger);
try { history.scrollRestoration = 'manual'; } catch (e) {}
if (!preview) scrollTo(0, 0);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : null);
const hostOf = p => p.host || (p.url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
const clean = a => (a || []).map(s => String(s).trim()).filter(Boolean);

function go(id) {
  const L = window.__lenis; const el = id === 'intro' ? 0 : document.getElementById(id);
  if (el == null) return;
  if (L) L.scrollTo(el, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
  else if (el === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------- WebGL stage ---------- */
const Stage = (() => {
  const noop = { setShape() {}, setHero() {}, setEnd() {}, intro() {}, pulse() {}, capsulePx: () => innerHeight * 0.4 };
  if (!window.THREE) return noop;
  const canvas = document.getElementById('gl');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { return noop; }
  const PR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(PR);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  // studio softboxes baked into an environment map
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x020202);
  const panel = (w, h, hex, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel(9, 2.2, 0xffffff, 3.2, 0, 6, 0.3);
  panel(1.1, 9, 0xd9c7a3, 3, -6, 0, 1.5);
  panel(1.1, 9, 0x9fb2ff, 2.2, 6, 0.5, -1);
  panel(7, 0.8, 0xffffff, 1.2, 0, -3, 6);
  panel(3, 3, 0xffffff, 0.5, 0, 0, -7);
  scene.environment = pmrem.fromScene(studio, 0.035).texture;

  // capsule: glass top, chrome bottom, gold seam
  const R = 0.55, H = 0.65;
  const prof = [new THREE.Vector2(R, 0)];
  for (let i = 0; i <= 32; i++) { const a = (i / 32) * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * R), H + Math.sin(a) * R)); }
  const halfGeo = new THREE.LatheGeometry(prof, 96);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8 });
  const chromeMat = new THREE.MeshPhysicalMaterial({ color: 0xd8d8de, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xd9c7a3, metalness: 1, roughness: 0.22, transparent: true });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, metalness: 0.6, roughness: 0.5, transparent: true });
  const capsule = new THREE.Group(); capsule.rotation.order = 'ZYX';
  const top = new THREE.Mesh(halfGeo, glassMat); top.renderOrder = 2;
  const bottom = new THREE.Group();
  const shell = new THREE.Mesh(halfGeo, chromeMat); shell.rotation.x = Math.PI; bottom.add(shell);
  const lid = new THREE.Mesh(new THREE.CircleGeometry(R * 0.995, 64), innerMat); lid.rotation.x = -Math.PI / 2; lid.position.y = -0.002; bottom.add(lid);
  const band = new THREE.Mesh(new THREE.TorusGeometry(R + 0.008, 0.02, 16, 128), goldMat); band.rotation.x = Math.PI / 2; bottom.add(band);
  capsule.add(top, bottom);

  // particles
  const N = isMobile() ? 7000 : 15000, DUST = Math.floor(N * 0.14), M = N - DUST;
  const cur = new Float32Array(N * 3), tgt = new Float32Array(N * 3), vel = new Float32Array(M * 3), dustBase = new Float32Array(DUST * 3);
  const seed = new Float32Array(N), size = new Float32Array(N);
  const rnd = Math.random, TAU = Math.PI * 2;
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rnd()); };
  for (let i = 0; i < N; i++) { seed[i] = rnd(); size[i] = i < M ? 0.55 + Math.pow(rnd(), 3) * 2.4 : 0.35 + rnd() * 0.9; }
  for (let d = 0; d < DUST; d++) { dustBase[d * 3] = (rnd() * 2 - 1) * 9; dustBase[d * 3 + 1] = (rnd() * 2 - 1) * 5.5; dustBase[d * 3 + 2] = -9 + rnd() * 10; }
  const build = fn => { const a = new Float32Array(M * 3), p = [0, 0, 0]; for (let i = 0; i < M; i++) { fn(p); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; } return a; };
  const shellPt = (p, cx, cy, cz, r) => { const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u), k = r * (0.9 + rnd() * 0.1); p[0] = cx + s * Math.cos(th) * k; p[1] = cy + u * k; p[2] = cz + s * Math.sin(th) * k; };
  const seg = (p, ax, ay, bx, by, r) => { const t = rnd(); p[0] = ax + (bx - ax) * t + gauss() * r; p[1] = ay + (by - ay) * t + gauss() * r; };

  const SH = {};
  SH.capsule = build(p => { const rr = R * 0.8; for (;;) { const x = (rnd() * 2 - 1) * rr, z = (rnd() * 2 - 1) * rr, y = 0.04 + rnd() * (H + rr - 0.04); const ok = y <= H ? x * x + z * z < rr * rr : x * x + z * z + (y - H) * (y - H) < rr * rr; if (ok) { p[0] = x; p[1] = y; p[2] = z; return; } } });
  SH.burst = build(p => { const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u), d = 2.2 + Math.pow(rnd(), 0.6) * 4.2; p[0] = s * Math.cos(th) * d * 1.4; p[1] = u * d * 0.8; p[2] = s * Math.sin(th) * d - 1; });
  const F = [[-0.32, -0.6, -0.32, 0.6, 0.45], [-0.32, 0.6, 0.42, 0.6, 0.75], [-0.32, 0.06, 0.26, 0.06, 1]];
  SH.coin = build(p => {
    const u = rnd(), th = rnd() * TAU;
    if (u < 0.3) { const ph = rnd() * TAU, rt = 0.09, rad = 1.5 + Math.cos(ph) * rt; p[0] = Math.cos(th) * rad; p[1] = Math.sin(th) * rad; p[2] = Math.sin(ph) * rt * 1.3; }
    else if (u < 0.5) { const rad = (rnd() < 0.5 ? 1.12 : 0.98) + gauss() * 0.006; p[0] = Math.cos(th) * rad; p[1] = Math.sin(th) * rad; p[2] = (rnd() < 0.5 ? -1 : 1) * 0.05; }
    else if (u < 0.78) { const v = rnd(), s = F.find(f => v < f[4]); seg(p, s[0], s[1], s[2], s[3], 0.028); p[2] = gauss() * 0.03; }
    else { const rr = 0.86 * Math.sqrt(rnd()); p[0] = Math.round(Math.cos(th) * rr / 0.09) * 0.09; p[1] = Math.round(Math.sin(th) * rr / 0.09) * 0.09; p[2] = (rnd() < 0.5 ? -1 : 1) * 0.05; }
  });
  const A = 2.0, FY = -1.05, oct = [...Array(8)].map((_, k) => { const a = k * TAU / 8 + TAU / 16; return [Math.cos(a) * A, Math.sin(a) * A]; });
  SH.arena = build(p => {
    const u = rnd();
    if (u < 0.36) { const lv = [FY, -0.62, -0.32, -0.02][Math.floor(rnd() * 4)], k = Math.floor(rnd() * 8), a = oct[k], b = oct[(k + 1) % 8], t = rnd(); p[0] = a[0] + (b[0] - a[0]) * t; p[2] = a[1] + (b[1] - a[1]) * t; p[1] = lv + gauss() * 0.006; }
    else if (u < 0.44) { const a = oct[Math.floor(rnd() * 8)]; p[0] = a[0] + gauss() * 0.015; p[2] = a[1] + gauss() * 0.015; p[1] = FY + rnd() * 1.15; }
    else if (u < 0.6) { const rr = A * 0.88 * Math.sqrt(rnd()), th = rnd() * TAU; p[0] = Math.round(Math.cos(th) * rr * 5) / 5; p[2] = Math.round(Math.sin(th) * rr * 5) / 5; p[1] = FY; }
    else {
      const s = u < 0.8 ? -1 : 1, x0 = s * 0.62, v = rnd();
      if (v < 0.16) shellPt(p, x0, 0.66, 0, 0.16);
      else if (v < 0.5) { shellPt(p, 0, 0, 0, 1); p[0] = x0 + p[0] * 0.19; p[1] = 0.16 + p[1] * 0.3; p[2] = p[2] * 0.11; }
      else if (v < 0.76) { const lx = x0 + (rnd() < 0.5 ? -0.1 : 0.1); p[0] = lx + gauss() * 0.035; p[1] = -1.02 + rnd() * 0.88; p[2] = gauss() * 0.035; }
      else { if (rnd() < 0.5) seg(p, x0, 0.38, x0 - s * 0.22, 0.2, 0.03); else seg(p, x0 - s * 0.22, 0.2, x0 - s * 0.38, 0.5, 0.03); p[2] = gauss() * 0.03 + (rnd() < 0.5 ? -0.1 : 0.1); }
    }
  });
  SH.twin = build(p => { const th = rnd() * TAU, ph = rnd() * TAU, a = 1 + 0.06 * Math.cos(ph), x = a * Math.cos(th), y = a * Math.sin(th), z = 0.06 * Math.sin(ph); if (rnd() < 0.5) { p[0] = x - 0.5; p[1] = y; p[2] = z; } else { p[0] = x + 0.5; p[1] = z; p[2] = y; } });
  const edge = (p, h) => { const ax = Math.floor(rnd() * 3); p[ax] = (rnd() * 2 - 1) * h; p[(ax + 1) % 3] = rnd() < 0.5 ? -h : h; p[(ax + 2) % 3] = rnd() < 0.5 ? -h : h; for (let k = 0; k < 3; k++) p[k] += gauss() * 0.008; };
  const rotIn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.62, 0.785, 0)), tv = new THREE.Vector3();
  SH.vault = build(p => {
    const u = rnd(), h = 1.05;
    if (u < 0.42) edge(p, h);
    else if (u < 0.8) { const ax = Math.floor(rnd() * 3), b = (ax + 1) % 3, c = (ax + 2) % 3, line = (Math.floor(rnd() * 5) + 1) / 6 * 2 * h - h; p[ax] = rnd() < 0.5 ? -h : h; if (rnd() < 0.5) { p[b] = line; p[c] = (rnd() * 2 - 1) * h; } else { p[c] = line; p[b] = (rnd() * 2 - 1) * h; } }
    else { edge(p, 0.42); tv.set(p[0], p[1], p[2]).applyMatrix4(rotIn); p[0] = tv.x; p[1] = tv.y; p[2] = tv.z; }
  });
  const K = 26, nodes = [], links = [];
  for (let k = 0; k < K; k++) { const y = 1 - (k + 0.5) / K * 2, r = Math.sqrt(1 - y * y), th = k * 2.39996; nodes.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
  nodes.forEach((a, i) => { nodes.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2]).filter(x => x[0] !== i).sort((x, y) => x[1] - y[1]).slice(0, 2).forEach(([j]) => links.push([i, j])); });
  SH.agents = build(p => {
    const u = rnd(), RR = 1.55;
    if (u < 0.3) { const n = nodes[Math.floor(rnd() * K)]; p[0] = n[0] * RR + gauss() * 0.045; p[1] = n[1] * RR + gauss() * 0.045; p[2] = n[2] * RR + gauss() * 0.045; }
    else if (u < 0.94) { const e = links[Math.floor(rnd() * links.length)], a = nodes[e[0]], b = nodes[e[1]], t = rnd(); let x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t; const l = Math.hypot(x, y, z) || 1, k = RR * (1 + 0.08 * Math.sin(Math.PI * t)) / l; p[0] = x * k + gauss() * 0.006; p[1] = y * k + gauss() * 0.006; p[2] = z * k + gauss() * 0.006; }
    else shellPt(p, 0, 0, 0, 0.5 * Math.cbrt(rnd()));
  });
  const waveBase = new Float32Array(M * 2), cols = Math.ceil(Math.sqrt(M * 1.8)), rows = Math.ceil(M / cols);
  for (let i = 0; i < M; i++) { waveBase[i * 2] = (i % cols) / cols * 11 - 5.5; waveBase[i * 2 + 1] = Math.floor(i / cols) / rows * 6 - 4; }

  cur.set(SH.capsule, 0); tgt.set(SH.capsule, 0);
  for (let d = 0; d < DUST; d++) for (let k = 0; k < 3; k++) { cur[(M + d) * 3 + k] = tgt[(M + d) * 3 + k] = dustBase[d * 3 + k]; }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(cur, 3); posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const uni = { uTime: { value: 0 }, uPR: { value: PR }, uSize: { value: 0.42 }, uAlpha: { value: 0 }, uJit: { value: 0.35 }, uTint: { value: new THREE.Color(AURA) }, uCool: { value: new THREE.Color('#A9B8FF') } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSeed; attribute float aSize;
      uniform float uTime; uniform float uPR; uniform float uSize; uniform float uJit;
      varying float vSeed; varying float vFade;
      void main(){
        vec3 p = position + vec3(sin(uTime*.8+aSeed*31.), cos(uTime*.7+aSeed*23.), sin(uTime*.6+aSeed*17.)) * .014 * uJit;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        float tw = .62 + .38 * sin(uTime * 1.6 + aSeed * 61.);
        gl_PointSize = aSize * uSize * uPR * tw * (22. / max(.5, -mv.z));
        vSeed = aSeed; vFade = smoothstep(18., 4., -mv.z);
      }`,
    fragmentShader: `
      uniform vec3 uTint; uniform vec3 uCool; uniform float uAlpha;
      varying float vSeed; varying float vFade;
      void main(){
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d); a *= a;
        vec3 c = mix(uTint, vec3(1.), step(.72, vSeed) * .55);
        c = mix(c, uCool, step(.95, vSeed) * .8);
        gl_FragColor = vec4(c, a * uAlpha * (.35 + .65 * vFade));
      }`
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false;
  const rig = new THREE.Group(); rig.add(capsule, points); scene.add(rig);

  const CAPBASE = 0.72;
  const ST = {
    capsule: { size: 0.42, spin: 0, tilt: 0, jit: 0.35 }, burst: { size: 0.75, spin: 0.06, tilt: 0.1, jit: 1 },
    coin: { size: 1, spin: 0.32, tilt: 0.12, jit: 1 }, arena: { size: 0.95, spin: 0.14, tilt: 0.34, jit: 0.8 },
    twin: { size: 1, spin: 0.24, tilt: 0.3, jit: 1 }, vault: { size: 0.9, spin: 0.18, tilt: 0.45, jit: 0.7 },
    agents: { size: 0.95, spin: 0.14, tilt: 0.22, jit: 1 }, wave: { size: 0.85, spin: 0, tilt: 0, jit: 0.4 },
  };
  let shape = 'capsule';
  const tint = new THREE.Color(AURA), tintTo = new THREE.Color(AURA);
  const cap = { heroOpen: 0, heroAlpha: 1, endOpen: 1, endAlpha: 0, intro: 0, open: 0, alpha: 0 };
  const rigS = () => (isMobile() ? 0.58 : 1);

  function setShape(name, hex) {
    if (hex) tintTo.set(hex);
    if (name === shape) return;
    shape = name;
    if (name === 'wave') { for (let i = 0; i < M; i++) { tgt[i * 3] = waveBase[i * 2]; tgt[i * 3 + 2] = waveBase[i * 2 + 1]; } }
    else tgt.set(SH[name] || SH.coin, 0);
    if (!reduce) for (let i = 0; i < M * 3; i++) vel[i] += (rnd() - 0.5) * 0.09;
  }

  let mx = 0, my = 0, smx = 0, smy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

  const clock = new THREE.Clock(), qT = new THREE.Quaternion(), eT = new THREE.Euler();
  let t = 0, spin = 0, capSpin = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); t += dt; const f = dt * 60, st = ST[shape] || ST.coin;
    const e = 1 - Math.pow(0.94, f);
    smx += (mx - smx) * (1 - Math.pow(0.95, f)); smy += (my - smy) * (1 - Math.pow(0.95, f));
    if (shape === 'wave') for (let i = 0; i < M; i++) { const x = waveBase[i * 2], z = waveBase[i * 2 + 1]; tgt[i * 3 + 1] = -1.25 + 0.22 * Math.sin(x * 0.9 + t * 0.8) + 0.17 * Math.cos(z * 1.3 + t * 0.6) + 0.07 * Math.sin((x + z) * 2.1 + t * 1.5); }
    const damp = Math.pow(0.9, f);
    for (let i = 0; i < M; i++) {
      const k = reduce ? 1 : 1 - Math.pow(1 - (0.016 + seed[i] * 0.05), f), j = i * 3;
      cur[j] += (tgt[j] - cur[j]) * k + vel[j]; cur[j + 1] += (tgt[j + 1] - cur[j + 1]) * k + vel[j + 1]; cur[j + 2] += (tgt[j + 2] - cur[j + 2]) * k + vel[j + 2];
      vel[j] *= damp; vel[j + 1] *= damp; vel[j + 2] *= damp;
    }
    for (let d = 0; d < DUST; d++) { const j = (M + d) * 3, b = d * 3, s = seed[M + d]; cur[j] = dustBase[b] + Math.sin(t * 0.07 + s * 40) * 0.6; cur[j + 1] = dustBase[b + 1] + Math.cos(t * 0.05 + s * 30) * 0.4; }
    posAttr.needsUpdate = true;

    uni.uTime.value = t;
    uni.uSize.value += (st.size - uni.uSize.value) * e;
    uni.uJit.value += (st.jit - uni.uJit.value) * e;
    tint.lerp(tintTo, e); uni.uTint.value.copy(tint);

    const heroWins = cap.heroAlpha >= cap.endAlpha;
    const aT = Math.max(cap.heroAlpha, cap.endAlpha) * cap.intro, oT = heroWins ? cap.heroOpen : cap.endOpen, ce = 1 - Math.pow(0.88, f);
    cap.alpha += (aT - cap.alpha) * ce; cap.open += (oT - cap.open) * ce;
    capSpin += dt * 0.3;
    capsule.rotation.set(smy * 0.15, capSpin + smx * 0.4, -0.6);
    const cs = CAPBASE * (0.8 + 0.2 * cap.alpha);
    capsule.scale.setScalar(cs);
    top.position.y = cap.open * 1.35; top.rotation.z = cap.open * 0.35;
    bottom.position.y = -cap.open * 1.35; bottom.rotation.z = -cap.open * 0.25;
    glassMat.opacity = 0.2 * cap.alpha; chromeMat.opacity = goldMat.opacity = innerMat.opacity = cap.alpha;
    capsule.visible = cap.alpha > 0.005;

    spin += st.spin * dt;
    if (shape === 'capsule') qT.copy(capsule.quaternion); else qT.setFromEuler(eT.set(st.tilt + smy * 0.18, spin + smx * 0.35, 0));
    points.quaternion.slerp(qT, 1 - Math.pow(0.93, f));
    const ps = shape === 'capsule' ? cs : 1; points.scale.setScalar(points.scale.x + (ps - points.scale.x) * e);
    const rs = rigS(); rig.scale.setScalar(rig.scale.x + (rs - rig.scale.x) * e);
    camera.position.x = smx * 0.15; camera.position.y = -smy * 0.1; camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  rig.scale.setScalar(rigS());
  requestAnimationFrame(frame);

  return {
    setShape,
    setHero(p) { cap.heroOpen = sstep(0.06, 0.5, p); cap.heroAlpha = 1 - sstep(0.36, 0.6, p); },
    setEnd(p) { cap.endOpen = 1 - sstep(0.35, 1, p); cap.endAlpha = sstep(0.1, 0.7, p); },
    intro() { gsap.to(cap, { intro: 1, duration: reduce ? 0.01 : 1.8, ease: 'expo.out' }); gsap.to(uni.uAlpha, { value: 1, duration: reduce ? 0.01 : 2.4, ease: 'power2.out' }); },
    pulse() { if (reduce) return; for (let i = 0; i < M * 3; i++) vel[i] += (rnd() - 0.5) * 0.16; },
    capsulePx() { const visH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); return 2 * (H + R) * CAPBASE * rigS() / visH * innerHeight; },
  };
})();



/* ---------- components ---------- */
function Split({ text }) {
  const words = String(text || '').split(' ');
  return html`<span className="split"><span className="sr">${text}</span>${words.map((w, wi) => html`<span className="w" aria-hidden="true" key=${wi}>${[...w].map((c, ci) => html`<span className="c" key=${ci}><span className="ci">${c}</span></span>`)}</span>${wi < words.length - 1 ? ' ' : ''}`)}</span>`;
}

function Loader({ C, logoRef, onReveal, onDone }) {
  const root = useRef(), word = useRef(), mark = useRef(), num = useRef(), bar = useRef(), sweep = useRef(), meta = useRef();
  useEffect(() => {
    let tl;
    const sp = reduce ? 0.25 : 1;
    const draws = mark.current.querySelectorAll('.draw');
    draws.forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 600; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    gsap.set(mark.current, { rotation: 34 });
    const handoff = () => {
      const lr = logoRef.current.getBoundingClientRect(), wr = word.current.getBoundingClientRect();
      const s = lr.width / wr.width;
      const dx = lr.left + lr.width / 2 - (wr.left + wr.width / 2), dy = lr.top + lr.height / 2 - (wr.top + wr.height / 2);
      const mr = mark.current.getBoundingClientRect();
      const m = Stage.capsulePx() / (mark.current.offsetHeight * 0.9);
      const my = innerHeight / 2 - (mr.top + mr.height / 2), mx = innerWidth / 2 - (mr.left + mr.width / 2);
      gsap.timeline({ onComplete: onDone })
        .to(meta.current, { opacity: 0, duration: 0.4 }, 0)
        .to(word.current, { x: dx, y: dy, scale: s, duration: 1.25 * sp, ease: 'expo.inOut' }, 0)
        .to(mark.current, { x: mx, y: my, scale: m, duration: 1.3 * sp, ease: 'expo.inOut' }, 0.05)
        .to(mark.current, { opacity: 0, duration: 0.55 * sp, ease: 'power1.in' }, 0.8 * sp)
        .to(root.current, { backgroundColor: 'rgba(0,0,0,0)', duration: 1.1 * sp, ease: 'power2.inOut' }, 0.35 * sp)
        .add(() => { Stage.intro(); onReveal(); }, 0.55 * sp)
        .fromTo(sweep.current, { x: 0 }, { x: innerWidth * 1.5, duration: 1.3 * sp, ease: 'power2.inOut' }, 0.2 * sp);
    };
    const start = () => {
      const c = { v: 0 };
      tl = gsap.timeline()
        .to(draws, { strokeDashoffset: 0, duration: 1.4 * sp, ease: 'power2.inOut', stagger: 0.12 * sp }, 0)
        .to(mark.current.querySelectorAll('.fill'), { opacity: 1, duration: 0.6 * sp, stagger: 0.05 }, 1.0 * sp)
        .fromTo(word.current.querySelectorAll('.ci'), { yPercent: 115 }, { yPercent: 0, duration: 1.1 * sp, ease: 'expo.out', stagger: 0.07 * sp }, 0.3 * sp)
        .to(c, { v: 100, duration: 2.0 * sp, ease: 'power2.inOut', onUpdate: () => { num.current.textContent = String(Math.round(c.v)).padStart(3, '0'); bar.current.style.transform = `scaleX(${c.v / 100})`; } }, 0.15 * sp)
        .add(handoff, 2.3 * sp);
    };
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(start);
    return () => tl && tl.kill();
  }, []);
  const grains = [[34, 62], [58, 48], [46, 80], [66, 70], [40, 40], [54, 28], [30, 84], [70, 52]];
  const aura = C.theme.aura;
  return html`
    <div className="loader" ref=${root} role="status" aria-label="Loading">
      <div className="ld-center">
        <div className="ld-mark" ref=${mark}>
          <svg viewBox="0 0 100 200" fill="none" aria-hidden="true">
            <path className="fill" d="M9 100 H91 V149 A41 41 0 0 1 9 149 Z" fill="#EEEEF0" opacity="0"></path>
            <g className="fill" opacity="0" fill=${aura}>${grains.map(([x, y], i) => html`<circle key=${i} cx=${x} cy=${y} r="3"></circle>`)}</g>
            <rect className="draw" x="9" y="10" width="82" height="180" rx="41" stroke="#EEEEF0" strokeWidth="2.2"></rect>
            <line className="draw" x1="9" y1="100" x2="91" y2="100" stroke=${aura} strokeWidth="2.2"></line>
          </svg>
        </div>
        <div className="ld-word" ref=${word} aria-hidden="true">${[...C.brand.wordmark].map((ch, i) => html`<span className="c" key=${i}><span className="ci">${ch}</span></span>`)}</div>
      </div>
      <div className="ld-meta" ref=${meta}><span>${C.brand.tagline}</span><span><b ref=${num}>000</b></span><i className="ld-bar" ref=${bar}></i></div>
    </div>
    <div className="sweep" ref=${sweep}></div>`;
}

function Nav({ C, logoRef, revealed, booted }) {
  const L = C.labels, first = (C.projects[0] || {}).id || 'stack';
  return html`<header className=${'nav' + (revealed ? ' on' : '')}>
    <button className=${'logo' + (booted ? ' on' : '')} ref=${logoRef} onClick=${() => go('intro')} aria-label=${C.brand.wordmark + ', back to top'}>${C.brand.wordmark}</button>
    <nav className="nav-links" aria-label="Main">
      <button className="opt" onClick=${() => go(first)}>${L.navWork}</button>
      <button className="opt" onClick=${() => go('stack')}>${L.navStack}</button>
      <button onClick=${() => go('contact')}>${L.navContact}</button>
    </nav>
  </header>`;
}

function Hero({ C, revealed }) {
  const ref = useRef();
  const first = (C.projects[0] || {}).id || 'stack';
  useEffect(() => {
    if (reduce) return; const el = ref.current;
    gsap.set(el.querySelectorAll('.intro-title .ci'), { yPercent: 115 });
    gsap.set(el.querySelectorAll('.intro-sub, .intro-bottom > *'), { opacity: 0, y: 18 });
  }, []);
  useEffect(() => {
    if (!revealed || reduce) return; const el = ref.current;
    gsap.timeline({ delay: preview ? 0 : 0.35 })
      .to(el.querySelectorAll('.intro-title .ci'), { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.016 })
      .to(el.querySelectorAll('.intro-sub, .intro-bottom > *'), { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12 }, 0.45);
  }, [revealed]);
  return html`<section className="intro" id="intro" ref=${ref}>
    <div className="intro-stage">
      <div className="intro-top">
        <h1 className="intro-title"><${Split} text=${C.hero.title} /></h1>
        <p className="intro-sub">${C.hero.sub}</p>
      </div>
      <div className="intro-bottom">
        <div className="ctas">
          <button className="btn btn-pri mag" onClick=${() => go(first)} data-cursor="Play">${C.hero.primary}</button>
          <button className="btn btn-sec mag" onClick=${() => go('contact')}>${C.hero.secondary}</button>
        </div>
        <div className="scroll-hint" aria-hidden="true"><i></i><span>${C.labels.scroll}</span></div>
      </div>
    </div>
  </section>`;
}

function Scene({ C, p, active, onOpen }) {
  const ref = useRef();
  const url = safeUrl(p.url);
  useEffect(() => {
    if (!active || reduce) return; const el = ref.current;
    gsap.fromTo(el.querySelectorAll('.scene-title .ci'), { yPercent: 115 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.03, overwrite: true });
    gsap.fromTo(el.querySelectorAll('.scene-kind, .scene-host, .spec, .ctas'), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.07, delay: 0.25, overwrite: true });
  }, [active]);
  return html`<section className="scene" id=${p.id} ref=${ref} aria-label=${p.name}>
    <div className="scene-head">
      <h2 className="scene-title"><${Split} text=${p.name} /></h2>
      ${p.kind ? html`<p className="scene-kind">${p.kind}</p>` : null}
      ${url ? html`<a className="scene-host" href=${url} target="_blank" rel="noopener" data-cursor="Visit">${hostOf(p)}</a>` : null}
    </div>
    <div className="scene-foot">
      <div className="specs">${(p.specs || []).filter(s => s.value || s.label).map((s, i) => html`<div className="spec" key=${i}><b>${s.value}</b><span>${s.label}</span></div>`)}</div>
      <div className="ctas">
        ${url ? html`<a className="btn btn-pri mag" href=${url} target="_blank" rel="noopener" data-cursor="Visit">${C.labels.visit}</a>` : null}
        <button className=${'btn mag ' + (url ? 'btn-sec' : 'btn-pri')} onClick=${() => onOpen(p)} data-cursor="Open">${C.labels.notes}</button>
      </div>
    </div>
  </section>`;
}

function Stack({ C }) {
  const [sel, setSel] = useState(null);
  const S = C.stack;
  const skill = sel ? S.groups.flatMap(g => g.skills || []).find(s => s.name === sel) : null;
  const on = skill ? skill.uses || [] : null;
  return html`<section className="stack" id="stack" aria-label=${C.labels.stackChapter}>
    <div className="stack-in">
      <div className="stack-head">
        <h2 className="stack-title">${S.title}</h2>
        <p>${S.intro}</p>
      </div>
      <div className="stack-grid" onMouseLeave=${() => setSel(null)}>
        <div className="groups">${S.groups.map((g, gi) => html`<div className="group" key=${gi}><h3>${g.name}</h3><div className="chips">${(g.skills || []).map((s, si) => html`<button key=${si} className=${'chip' + (sel === s.name ? ' on' : '')} aria-pressed=${sel === s.name} onMouseEnter=${() => setSel(s.name)} onFocus=${() => setSel(s.name)} onClick=${() => setSel(s.name)}>${s.name}</button>`)}</div></div>`)}</div>
        <aside className="usedin" aria-live="polite">
          <p className="usedin-h">${sel ? `${S.usedPrefix} ${sel}` : S.hint}</p>
          <ul>${C.work.map((w, i) => html`<li key=${w.id || i} className=${on ? (on.includes(w.id) ? 'on' : 'off') : ''}><div><b>${w.name}</b>${w.summary ? html`<small>${w.summary}</small>` : null}</div><span>${w.note}</span></li>`)}</ul>
        </aside>
      </div>
    </div>
  </section>`;
}

function Contact({ C }) {
  const K = C.contact;
  const [copied, setCopied] = useState(false); const mailRef = useRef();
  const gh = safeUrl(K.github);
  const copy = () => {
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(mailRef.current); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(K.email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }, fallback); } catch (e) { fallback(); }
  };
  return html`<section className="contact" id="contact" aria-label=${C.labels.contactChapter}>
    <div>
      <h2 className="contact-title">${K.title}</h2>
      <p className="intro-sub">${K.sub}</p>
    </div>
    <div className="contact-foot">
      <div className="ctas">
        ${K.email ? html`<button className="btn btn-pri mag" onClick=${copy} data-cursor="Copy">${copied ? K.copied : K.copy}</button>` : null}
        ${gh ? html`<a className="btn btn-sec mag" href=${gh} target="_blank" rel="noopener" data-cursor="Visit">${K.githubLabel}</a>` : null}
      </div>
      ${K.email ? html`<p className="mail" ref=${mailRef}>${K.email}</p>` : null}
      <div className="foot"><span>${C.brand.footerLeft}</span><span>${C.brand.footerRight}</span></div>
    </div>
  </section>`;
}

function Drawer({ C, p, onClose }) {
  const [d, setD] = useState(null); const xRef = useRef();
  useEffect(() => { if (p) { setD(p); setTimeout(() => xRef.current && xRef.current.focus(), 60); } }, [p]);
  useEffect(() => { const k = e => { if (e.key === 'Escape') onClose(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  useEffect(() => { if (!window.__booted) return; const L = window.__lenis; if (L) p ? L.stop() : L.start(); }, [p]);
  const open = !!p, url = d && safeUrl(d.url);
  return html`
    <div className=${'drawer-scrim' + (open ? ' open' : '')} onClick=${onClose}></div>
    <aside className=${'drawer' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-hidden=${!open} aria-label=${d ? d.name + ' ' + C.labels.notes : C.labels.notes} data-lenis-prevent="" style=${{ '--t': d ? d.tint : C.theme.aura }}>
      <button className="x" ref=${xRef} onClick=${onClose} data-cursor="Close" tabIndex=${open ? 0 : -1}>${C.labels.close}</button>
      ${d ? html`<div className="reveal" key=${d.id}>
        <h3>${d.name}</h3>
        <p className="lede">${d.problem}</p>
        ${clean(d.built).length ? html`<h4>${C.labels.built}</h4>` : null}
        ${clean(d.built).length ? html`<ul className="d-list">${clean(d.built).map((b, i) => html`<li key=${i}>${b}</li>`)}</ul>` : null}
        ${clean(d.stack).length ? html`<h4>${C.labels.stack}</h4>` : null}
        ${clean(d.stack).length ? html`<div className="d-tags">${clean(d.stack).map((s, i) => html`<span key=${i}>${s}</span>`)}</div>` : null}
        ${url ? html`<a className="btn btn-pri" href=${url} target="_blank" rel="noopener" tabIndex=${open ? 0 : -1}>Visit ${hostOf(d)}</a>` : null}
      </div>` : null}
    </aside>`;
}

function Rail({ chapters, active, on }) {
  return html`<nav className=${'rail' + (on ? ' on' : '')} aria-label="Chapters">${chapters.map(([id, l]) => html`<button key=${id} className=${active === id ? 'on' : ''} onClick=${() => go(id)} aria-label=${l}><span className="lbl">${l}</span><i className="tick"></i></button>`)}</nav>`;
}

function Timecode({ chapters, active, on }) {
  const ref = useRef();
  useEffect(() => {
    let raf; const pad = n => String(n).padStart(2, '0');
    const tick = () => { const fr = Math.floor(scrollY / innerHeight * 4 * 24); ref.current.textContent = `00:${pad(Math.floor(fr / 1440) % 60)}:${pad(Math.floor(fr / 24) % 60)}:${pad(fr % 24)}`; raf = requestAnimationFrame(tick); };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  const label = (chapters.find(c => c[0] === active) || chapters[0])[1];
  return html`<div className=${'tc' + (on ? ' on' : '')} aria-hidden="true"><span className="tc-dot"></span><span className="tc-num" ref=${ref}>00:00:00:00</span><span>${label}</span></div>`;
}

function Cursor() {
  const ring = useRef(), dot = useRef(), lab = useRef();
  useEffect(() => {
    if (touch) return;
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf;
    const mv = e => { x = e.clientX; y = e.clientY; const t = e.target.closest && e.target.closest('a,button,[data-cursor]'); ring.current.classList.toggle('hov', !!t); lab.current.textContent = (t && t.dataset.cursor) || ''; };
    addEventListener('pointermove', mv, { passive: true });
    const loop = () => { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.current.style.transform = `translate3d(${rx}px,${ry}px,0)`; dot.current.style.transform = `translate3d(${x}px,${y}px,0)`; raf = requestAnimationFrame(loop); };
    loop();
    return () => { removeEventListener('pointermove', mv); cancelAnimationFrame(raf); };
  }, []);
  if (touch) return null;
  return html`<div className="cur" ref=${ring} aria-hidden="true"><div className="cur-ring"><span className="cur-lab" ref=${lab}></span></div></div><div className="cur-dot" ref=${dot} aria-hidden="true"><i></i></div>`;
}

function App({ C }) {
  const [revealed, setRevealed] = useState(preview);
  const [booted, setBooted] = useState(preview);
  const [active, setActive] = useState('intro');
  const [drawer, setDrawer] = useState(null);
  const logoRef = useRef();
  const L = C.labels, aura = C.theme.aura;
  const chapters = [['intro', L.introChapter], ...C.projects.map(p => [p.id, p.name]), ['stack', L.stackChapter], ['contact', L.contactChapter]];

  useEffect(() => {
    const root = document.documentElement;
    if (!preview) root.classList.add('locked');
    if (!touch) root.classList.add('has-cursor');
    let lenis = null; const raf = t => lenis && lenis.raf(t * 1000);
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf); gsap.ticker.lagSmoothing(0);
      if (!preview) lenis.stop();
    }
    window.__lenis = lenis;
    if (preview) { window.__booted = true; Stage.intro(); }
    const setTint = hex => root.style.setProperty('--scene', hex);
    const lbT = document.querySelector('.lb-top'), lbB = document.querySelector('.lb-bot');
    const hT = document.querySelector('.intro-top'), hB = document.querySelector('.intro-bottom');

    ScrollTrigger.create({
      trigger: '#intro', start: 'top top', end: 'bottom bottom',
      onUpdate: s => {
        const p = s.progress; Stage.setHero(p);
        if (s.isActive) Stage.setShape(p < 0.42 ? 'capsule' : 'burst', aura);
        const f = Math.max(0, 1 - p * 2.6);
        hT.style.opacity = f; hT.style.transform = `translateY(${-p * 140}px)`; hB.style.opacity = f;
        const b = Math.max(0, 1 - p * 2.2); lbT.style.transform = lbB.style.transform = `scaleY(${b})`;
      },
      onToggle: s => { if (s.isActive) { setActive('intro'); setTint(aura); Stage.setShape(s.progress < 0.42 ? 'capsule' : 'burst', aura); } },
    });
    C.projects.forEach(p => ScrollTrigger.create({ trigger: '#' + p.id, start: 'top 55%', end: 'bottom 45%', onToggle: s => { if (s.isActive) { setActive(p.id); setTint(p.tint || aura); Stage.setShape(p.shape, p.tint || aura); } } }));
    ScrollTrigger.create({ trigger: '#stack', start: 'top 55%', end: 'bottom 45%', onToggle: s => { if (s.isActive) { setActive('stack'); setTint(C.theme.stackTint); Stage.setShape('wave', C.theme.stackTint); } } });
    ScrollTrigger.create({ trigger: '#contact', start: 'top 55%', end: 'bottom top', onToggle: s => { if (s.isActive) { setActive('contact'); setTint(aura); Stage.setShape('capsule', aura); } } });
    ScrollTrigger.create({ trigger: '#contact', start: 'top bottom', end: 'center center', onUpdate: s => Stage.setEnd(s.progress) });
    document.querySelectorAll('.scene-head').forEach(h => gsap.to(h, { y: -70, ease: 'none', scrollTrigger: { trigger: h.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    const pd = e => { if (!e.target.closest('a,button,.drawer,.usedin')) Stage.pulse(); };
    addEventListener('pointerdown', pd);

    if (!touch && !reduce) document.querySelectorAll('.mag').forEach(el => {
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: 'power3.out' }); });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.45)' }));
    });
    if (preview) ScrollTrigger.refresh();

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
      if (lenis) { gsap.ticker.remove(raf); lenis.destroy(); }
      window.__lenis = null;
      removeEventListener('pointerdown', pd);
    };
  }, []);

  const onReveal = () => setRevealed(true);
  const onDone = () => {
    setBooted(true); window.__booted = true;
    document.documentElement.classList.remove('locked');
    if (window.__lenis) window.__lenis.start();
    ScrollTrigger.refresh();
  };

  return html`
    <div className="vignette"></div>
    <div className="lb lb-top"></div>
    <div className="lb lb-bot"></div>
    <${Nav} C=${C} logoRef=${logoRef} revealed=${revealed} booted=${booted} />
    <main>
      <${Hero} C=${C} revealed=${revealed} />
      ${C.projects.map(p => html`<${Scene} key=${p.id} C=${C} p=${p} active=${active === p.id} onOpen=${setDrawer} />`)}
      <${Stack} C=${C} />
      <${Contact} C=${C} />
    </main>
    <${Rail} chapters=${chapters} active=${active} on=${revealed} />
    <${Timecode} chapters=${chapters} active=${active} on=${revealed} />
    <${Drawer} C=${C} p=${drawer} onClose=${() => setDrawer(null)} />
    <${Cursor} />
    ${!booted ? html`<${Loader} C=${C} logoRef=${logoRef} onReveal=${onReveal} onDone=${onDone} />` : null}
  `;
}

/* ---------- boot ---------- */
const root = createRoot(document.getElementById('root'));
let ver = 0;
function mount(C) {
  document.documentElement.style.setProperty('--aura', C.theme.aura);
  if (C.seo.title) document.title = C.seo.title;
  root.render(html`<${App} key=${++ver} C=${C} />`);
}

if (preview) {
  mount(normalize(defaults));
  addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'fargo:content') return;
    mount(normalize(e.data.content));
  });
  parent.postMessage({ type: 'fargo:ready' }, location.origin);
} else {
  const timeout = new Promise(r => setTimeout(() => r(null), 2500));
  Promise.race([fetch('/api/content').then(r => (r.ok ? r.json() : null)).catch(() => null), timeout])
    .then(c => mount(normalize(c || defaults)));
}
