// Opt-in synthesized sound for the film: Web Audio only, no audio files.
// Every call is a no-op until setEnabled(true) has been called from a user gesture.
// Nothing touches window/AudioContext at module scope, so this is SSR-safe.

const MASTER = 0.35;
const FADE = 0.6; // s
const ROOT = 392; // G4
const PENTA = [0, 2, 4, 7, 9, 12, 14]; // major pentatonic, one step per path stage 0…6

type Engine = {
  ac: AudioContext;
  master: GainNode;
  bed: GainNode;
  lp: BiquadFilterNode;
  noise: AudioBuffer;
};

let eng: Engine | null = null;
let riser: { o: OscillatorNode; g: GainNode } | null = null;
let offTimer: ReturnType<typeof setTimeout> | undefined;
let lastX = -1;
let lastCharge = 0;
const lastAt = new Map<string, number>();

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const note = (i: number) => ROOT * 2 ** (PENTA[i] / 12);

/** Graph: voices → master → compressor → destination, plus the ambient bed. */
function boot(): Engine {
  const ac = new AudioContext();
  const comp = ac.createDynamicsCompressor();
  comp.connect(ac.destination);
  const master = ac.createGain();
  master.gain.value = 0;
  master.connect(comp);

  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Ambient bed: detuned low oscillators + looping noise, all through one lowpass.
  const bed = ac.createGain();
  bed.gain.value = 0.15;
  bed.connect(master);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 200;
  lp.connect(bed);
  for (const [f, v] of [
    [55, 0.3],
    [55.4, 0.3],
    [110, 0.08],
  ]) {
    const o = ac.createOscillator();
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.value = v;
    o.connect(g).connect(lp);
    o.start();
  }
  const n = ac.createBufferSource();
  n.buffer = noise;
  n.loop = true;
  const ng = ac.createGain();
  ng.gain.value = 0.12;
  n.connect(ng).connect(lp);
  n.start();

  return { ac, master, bed, lp, noise };
}

/** Returns the engine if enabled and `key` hasn't fired within `gap` ms. */
function gate(key: string, gap: number): Engine | null {
  if (!sound.enabled || !eng) return null;
  const now = performance.now();
  if (now - (lastAt.get(key) ?? -Infinity) < gap) return null;
  lastAt.set(key, now);
  return eng;
}

function cleanup(src: AudioScheduledSourceNode, nodes: AudioNode[]) {
  src.onended = () => nodes.forEach((n) => n.disconnect());
}

/** One enveloped oscillator: linear attack, exponential decay, then stop + disconnect. */
function voice(
  e: Engine,
  freq: number,
  peak: number,
  attack: number,
  decay: number,
  delay = 0,
  detune = 0,
  type: OscillatorType = "sine",
) {
  const t = e.ac.currentTime + delay;
  const o = e.ac.createOscillator();
  const g = e.ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  o.connect(g).connect(e.master);
  cleanup(o, [o, g]);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function bell(e: Engine, freq: number, peak: number, delay = 0) {
  voice(e, freq, peak, 0.005, 1.4, delay);
  voice(e, freq * 2.76, peak * 0.3, 0.005, 0.6, delay);
}

export const sound = {
  enabled: false,
  setEnabled(on: boolean) {
    sound.enabled = on;
    if (on) eng ??= boot();
    if (!eng) return;
    const { ac, master } = eng;
    const t = ac.currentTime;
    clearTimeout(offTimer);
    if (on) ac.resume().catch(() => {});
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(on ? MASTER : 0, t + FADE);
    if (on) return;
    riser?.g.gain.setTargetAtTime(0, t, 0.05);
    lastCharge = 0;
    offTimer = setTimeout(() => {
      if (!sound.enabled) ac.suspend().catch(() => {});
    }, FADE * 1000 + 50);
  },
  /** 0…1 overall film intensity, called every frame. */
  intensity(x: number) {
    x = clamp(x);
    if (!sound.enabled || !eng || Math.abs(x - lastX) < 0.005) return;
    lastX = x;
    const t = eng.ac.currentTime;
    eng.lp.frequency.setTargetAtTime(200 * 7 ** x, t, 0.25); // 200 → 1400 Hz
    eng.bed.gain.setTargetAtTime(0.15 + 0.2 * x, t, 0.25);
  },
  /** The talent point is chosen. */
  chosen() {
    const e = gate("chosen", 120);
    if (!e) return;
    for (const [f, cents] of [
      [1568, -7],
      [1568, 7],
      [2349, -5],
      [2349, 5],
    ])
      voice(e, f, 0.04, 0.45, 0.75, 0, cents);
  },
  /** The partners' braid meets the chosen point. */
  merge() {
    const e = gate("merge", 120);
    if (!e) return;
    for (const f of [196, 246.94, 293.66]) voice(e, f, 0.07, 0.9, 1.1, 0, 0, "triangle");
  },
  /** The pulse arrives at path stage k (0…6). */
  node(k: number) {
    const i = Math.min(6, Math.max(0, Math.round(k)));
    const e = gate(`node${i}`, 400);
    if (e) bell(e, note(i), 0.2);
  },
  /** The card passes through a door. */
  door() {
    const e = gate("door", 120);
    if (!e) return;
    const { ac } = e;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = e.noise;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(3000, t + 0.7);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(bp).connect(g).connect(e.master);
    cleanup(src, [src, bp, g]);
    src.start(t, Math.random() * 1.2);
    src.stop(t + 0.75);
  },
  /** The finale title arrives. */
  finale() {
    const e = gate("finale", 120);
    if (!e) return;
    for (const f of [98, 196, 293.66, 392, 493.88, 587.33]) {
      voice(e, f, 0.035, 1.2, 1.8, 0, -4);
      voice(e, f, 0.035, 1.2, 1.8, 0, 4);
    }
  },
  /** Hold-to-charge level, 0…1, called every frame in the finale. */
  charge(x: number) {
    x = clamp(x);
    if (!sound.enabled || !eng || Math.abs(x - lastCharge) < 0.005) return;
    lastCharge = x;
    if (!riser) {
      if (x < 0.01) return;
      const o = eng.ac.createOscillator();
      o.type = "triangle";
      const g = eng.ac.createGain();
      g.gain.value = 0;
      o.connect(g).connect(eng.master);
      o.start();
      riser = { o, g };
    }
    const t = eng.ac.currentTime;
    riser.o.frequency.setTargetAtTime(110 * 4 ** x, t, 0.05); // 110 → 440 Hz
    riser.g.gain.setTargetAtTime(x < 0.01 ? 0 : 0.12 * x, t, 0.05);
  },
  /** The charge released into the network burst. */
  burst() {
    const e = gate("burst", 120);
    if (!e) return;
    for (let i = 0; i < 5; i++)
      bell(e, 2 * note(Math.floor(Math.random() * PENTA.length)), 0.1, i * 0.07 + Math.random() * 0.03);
  },
};
