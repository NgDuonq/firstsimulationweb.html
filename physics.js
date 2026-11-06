/* Pure SI physics; shared by the browser and Node validation. No rendering units here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HarmonicPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = 2 * Math.PI;
  const LIMITS = {
    reference: { A: [0, .6], omega: [.5, 8], phi: [-Math.PI, Math.PI] },
    horizontal: { A: [0, .6], m: [.1, 2], k: [2, 80], phi: [-Math.PI, Math.PI] },
    vertical: { A: [0, .6], m: [.1, 2], k: [2, 80], g: [0, 20], l0: [.2, 1.5], phi: [-Math.PI, Math.PI] },
    pendulum: { m: [.1, 2], L: [.3, 3], g: [1, 20], alpha: [.01, 1.4], phi: [-Math.PI, Math.PI] }
  };
  const DEFAULTS = {
    reference: { A: .35, omega: 2, phi: 0 },
    horizontal: { A: .25, m: .5, k: 8, l0: .8, phi: 0 },
    vertical: { A: .18, m: .5, k: 20, g: 9.81, l0: .6, phi: 0 },
    pendulum: { m: .5, L: 1.2, g: 9.81, alpha: .15, phi: 0, model: 'small' }
  };
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const wrap = x => ((x % TAU) + TAU) % TAU;
  const freshParams = () => JSON.parse(JSON.stringify(DEFAULTS));
  function sanitize(kind, input) {
    const p = { ...DEFAULTS[kind], ...input };
    for (const [key, [lo, hi]] of Object.entries(LIMITS[kind])) {
      const value = Number(p[key]);
      p[key] = clamp(Number.isFinite(value) ? value : DEFAULTS[kind][key], lo, hi);
    }
    if (kind === 'horizontal') p.l0 = DEFAULTS.horizontal.l0;
    if (kind === 'vertical') p.A = Math.min(p.A, maxVerticalAmplitude(p));
    if (kind === 'pendulum') { p.model = p.model === 'nonlinear' ? 'nonlinear' : 'small'; if(p.model === 'small') p.alpha = Math.min(.2,p.alpha); }
    return p;
  }
  function maxVerticalAmplitude(p) {
    // A bilateral ideal spring can compress, but its geometric length must stay positive.
    return Math.max(0, Math.min(.6, p.l0 + p.m * p.g / p.k - .12));
  }
  function harmonic(A, omega, phi, t, m = 1) {
    const theta = omega * t + phi;
    const x = A * Math.cos(theta), v = -A * omega * Math.sin(theta);
    const a = -omega * omega * x, k = m * omega * omega;
    return { A, omega, phi, theta, x, v, a, m, k, T: TAU / omega, f: omega / TAU,
      vmax: A * omega, amax: A * omega * omega, F: -k * x,
      K: .5 * m * v * v, U: .5 * k * x * x, E: .5 * k * A * A, harmonic: true };
  }
  function horizontal(p, t) {
    return { ...harmonic(p.A, Math.sqrt(p.k / p.m), p.phi, t, p.m), l0: p.l0,
      L: p.l0 + p.A * Math.cos(Math.sqrt(p.k / p.m) * t + p.phi) };
  }
  function vertical(p, t) {
    const s = harmonic(p.A, Math.sqrt(p.k / p.m), p.phi, t, p.m);
    const extension = p.m * p.g / p.k;
    return { ...s, y: s.x, g: p.g, l0: p.l0, extension, Leq: p.l0 + extension,
      L: p.l0 + extension + s.x, Fs: -p.k * (extension + s.x), Fg: p.m * p.g,
      Fnet: -p.k * s.x };
  }
  // K(k) by the arithmetic-geometric mean; T = 4 sqrt(L/g) K(sin(alpha/2)).
  function ellipticK(k) {
    let a = 1, b = Math.sqrt(1 - k * k);
    for (let n = 0; n < 30 && Math.abs(a - b) > 1e-15; n++) {
      const next = (a + b) / 2; b = Math.sqrt(a * b); a = next;
    }
    return Math.PI / (2 * a);
  }
  const pendulumCache = new Map();
  function nonlinearTable(alpha) {
    const key = String(alpha);
    if (pendulumCache.has(key)) return pendulumCache.get(key);
    // Dimensionless q'' = -sin(q), integrated once per amplitude, never per frame.
    const period = 4 * ellipticK(Math.sin(alpha / 2)), N = 4096, h = period / N;
    const q = new Float64Array(N + 1), u = new Float64Array(N + 1);
    q[0] = alpha;
    for (let i = 0; i < N; i++) {
      const x = q[i], v = u[i];
      const a1 = -Math.sin(x), v2 = v + h * a1 / 2, a2 = -Math.sin(x + h * v / 2);
      const v3 = v + h * a2 / 2, a3 = -Math.sin(x + h * v2 / 2);
      const v4 = v + h * a3, a4 = -Math.sin(x + h * v3);
      q[i + 1] = x + h * (v + 2 * v2 + 2 * v3 + v4) / 6;
      u[i + 1] = v + h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
    }
    q[N] = alpha; u[N] = 0;
    const table = { q, u, N, h, period };
    if (pendulumCache.size >= 8) pendulumCache.delete(pendulumCache.keys().next().value);
    pendulumCache.set(key, table);
    return table;
  }
  function pendulum(p, t) {
    const w0 = Math.sqrt(p.g / p.L), A = p.L * p.alpha;
    if (p.model === 'small') {
      const s = harmonic(A, w0, p.phi, t, p.m);
      return { ...s, q: s.x / p.L, qdot: s.v / p.L, L: p.L, g: p.g, alpha: p.alpha,
        model: 'small', bobX: p.L * Math.sin(s.x / p.L), bobY: -p.L * Math.cos(s.x / p.L) };
    }
    const tab = nonlinearTable(p.alpha), T = tab.period / w0, omega = TAU / T;
    const theta = omega * t + p.phi, z = wrap(theta) / TAU * tab.N;
    const i = Math.min(tab.N - 1, Math.floor(z)), r = z - i;
    // Quintic Hermite interpolation also matches endpoint accelerations. This
    // keeps the derivative of v consistent with -g sin(q), including near seams.
    const x0=tab.q[i], x1=tab.q[i+1], hu0=tab.h*tab.u[i], hu1=tab.h*tab.u[i+1];
    const h2a0=-tab.h*tab.h*Math.sin(x0), h2a1=-tab.h*tab.h*Math.sin(x1);
    const d=x1-x0-hu0-h2a0/2, d1=hu1-hu0-h2a0, d2=h2a1-h2a0;
    const c3=10*d-4*d1+d2/2, c4=-15*d+7*d1-d2, c5=6*d-3*d1+d2/2;
    const q=x0+r*(hu0+r*(h2a0/2+r*(c3+r*(c4+r*c5))));
    const du=(hu0+r*(h2a0+r*(3*c3+r*(4*c4+r*5*c5))))/tab.h;
    const v = p.L * w0 * du, a = -p.g * Math.sin(q), U = p.m*p.g*p.L*(1-Math.cos(q));
    return { A, omega, phi:p.phi, theta, x:p.L*q, v, a, q, qdot:w0*du, L:p.L, g:p.g,
      alpha:p.alpha, m:p.m, T, f:1/T, vmax:Math.sqrt(2*p.g*p.L*(1-Math.cos(p.alpha))),
      amax:p.g*Math.sin(p.alpha), K:.5*p.m*v*v, U, E:p.m*p.g*p.L*(1-Math.cos(p.alpha)),
      F:p.m*a, harmonic:false, model:'nonlinear', bobX:p.L*Math.sin(q), bobY:-p.L*Math.cos(q) };
  }
  function effectiveParams(params, mode) {
    const p = JSON.parse(JSON.stringify(params));
    if (mode === 'comparison') {
      const r = p.reference;
      p.horizontal = { ...p.horizontal, A:r.A, phi:r.phi, k:p.horizontal.m*r.omega*r.omega };
      p.vertical = { ...p.vertical, phi:r.phi, k:p.vertical.m*r.omega*r.omega };
      p.vertical.A = Math.min(r.A, maxVerticalAmplitude(p.vertical));
      const L = p.pendulum.g / (r.omega*r.omega);
      p.pendulum = { ...p.pendulum, L, alpha:Math.min(.2, r.A/L), phi:r.phi, model:'small' };
    }
    return p;
  }
  function evaluate(kind, params, t) {
    if (kind === 'reference') return harmonic(params.A, params.omega, params.phi, t);
    if (kind === 'horizontal') return horizontal(params, t);
    if (kind === 'vertical') return vertical(params, t);
    return pendulum(params, t);
  }
  function all(params, mode, t) {
    const p = effectiveParams(params, mode), samples = {};
    for (const kind of Object.keys(p)) samples[kind] = evaluate(kind, p[kind], t);
    return { params:p, samples };
  }
  class Clock {
    constructor() { this.time = 0; this.speed = 1; this.running = true; }
    advance(dt) { if (this.running && Number.isFinite(dt) && dt > 0) this.seek(this.time + Math.min(dt,.1)*this.speed); }
    seek(t) { if (Number.isFinite(t)) this.time = clamp(t,0,86400); }
    step(direction) { this.running = false; this.seek(this.time + Math.sign(direction)/60); }
    restart() { this.time = 0; }
  }
  return { TAU, LIMITS, DEFAULTS, freshParams, clamp, wrap, sanitize, maxVerticalAmplitude,
    harmonic, horizontal, vertical, pendulum, ellipticK, effectiveParams, evaluate, all, Clock };
});
