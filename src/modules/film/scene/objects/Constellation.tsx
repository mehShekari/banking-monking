"use client";

// The achievement recap: the seven stage nodes lift off the card into a constellation,
// joined stage to stage by dotted links of light flowing upward. Child of the card group,
// like PathTrace. Everything moves in the materials; the CPU only toggles visibility.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  attribute,
  exp,
  fract,
  fwidth,
  instancedBufferAttribute,
  length,
  max,
  min,
  mix,
  sin,
  smoothstep,
  uv,
  varying,
  vec2,
  vec3,
} from "three/tsl";
import { FACE_Z } from "./Card";
import { STAGES } from "@/modules/film/timeline/path";
import { GLOW } from "./PathTrace";
import { SIGNAL, type Float } from "../tsl";
import type { PathU } from "../tsl";

type V3 = THREE.Node<"vec3">;

const NODE_HALF = 0.05;
const DOT_HALF = 0.012;
const DOTS = 40;
const LINE_SEG = 24;

const onCard = (k: number) => [STAGES[k].pos[0], STAGES[k].pos[1], FACE_Z + 0.0015];
const lifted = (k: number) => [STAGES[k].pos[0] * 1.6, STAGES[k].pos[1] * 1.6, FACE_Z + 0.08 + 0.05 * k];

type Item = Record<string, number[]>;
type Get = { f: (name: string) => Float; v: (name: string) => V3 };

/** Packs items into one array per field. */
function columns(items: Item[]) {
  return Object.keys(items[0]).map((name) => {
    const size = items[0][name].length;
    const arr = new Float32Array(items.length * size);
    items.forEach((it, i) => arr.set(it[name], i * size));
    return { name, size, arr };
  });
}

/** One vertex per item (for the lines). */
function vertexGeometry(items: Item[]) {
  const g = new THREE.BufferGeometry();
  for (const c of columns(items)) g.setAttribute(c.name, new THREE.BufferAttribute(c.arr, c.size));
  return g;
}
const vertexGet: Get = { f: (n) => attribute<"float">(n, "float"), v: (n) => attribute<"vec3">(n, "vec3") };

/** One sprite instance per item. */
function instanceGet(items: Item[]): Get {
  const cols = new Map(
    columns(items).map((c) => {
      const a = new THREE.InstancedBufferAttribute(c.arr, c.size);
      return [c.name, c.size === 1 ? instancedBufferAttribute<"float">(a, "float") : instancedBufferAttribute<"vec3">(a, "vec3")];
    }),
  );
  return { f: (n) => cols.get(n) as Float, v: (n) => cols.get(n) as V3 };
}

// Link k→k+1 at arc parameter t: both ends on-card and lifted.
const linkItem = (k: number, t: number): Item => ({
  position: onCard(k),
  aB0: onCard(k + 1),
  aA1: lifted(k),
  aB1: lifted(k + 1),
  aK: [k],
  aT: [t],
});

const links = STAGES.slice(1).map((_, k) => k);

function shared(u: PathU, get: Get) {
  // Bottom stage lifts first.
  const lk = (k: Float) => smoothstep(k.mul(0.06), k.mul(0.06).add(0.6), u.uLift);
  // A node's place: from the card face to its lifted spot, bobbing gently once up.
  const node = (p0: V3, p1: V3, k: Float) => {
    const l = lk(k);
    const bob = vec3(sin(u.uTime.mul(0.8).add(k.mul(2.3))).mul(0.004), sin(u.uTime.mul(1.1).add(k.mul(1.7))).mul(0.01), 0);
    return mix(p0, p1, l).add(bob.mul(l));
  };
  const aK = get.f("aK");
  // Point t along link k→k+1, on a slight arch toward the viewer.
  const link = (t: Float, la: Float) => {
    const p = mix(node(get.v("position"), get.v("aA1"), aK), node(get.v("aB0"), get.v("aB1"), aK.add(1)), t);
    return p.add(vec3(0, 0, t.mul(t.oneMinus()).mul(la).mul(0.2)));
  };
  const la = min(lk(aK), lk(aK.add(1)));
  return { node, link, la, aK };
}

/** Distance from the sprite centre in the old billboard units (±half). */
const corner = (half: number) => length(uv().sub(0.5)).mul(2 * half);

export function Constellation({ u }: { u: PathU }) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const BLUE = SIGNAL();

    // Nodes: core + ring + halo; the on-card node fades by (1 - uLift) as this one takes its light.
    const ng = instanceGet(STAGES.map((_, k) => ({ position: onCard(k), aA1: lifted(k), aK: [k] })));
    const n = shared(u, ng);
    const r = corner(NODE_HALF);
    const aa = max(fwidth(r), 0.0005);
    const core = smoothstep(0.008, aa.add(0.008), r).oneMinus();
    const ring = smoothstep(aa.negate().add(0.027), 0.027, r).mul(smoothstep(0.03, aa.add(0.03), r).oneMinus());
    const halo = exp(r.mul(r).mul(-2500));
    const nodeMat = new THREE.SpriteNodeMaterial(GLOW);
    nodeMat.positionNode = n.node(ng.v("position"), ng.v("aA1"), n.aK);
    nodeMat.scaleNode = vec2(2 * NODE_HALF);
    nodeMat.colorNode = BLUE.mul(core.mul(6).add(ring.mul(2.5)).add(halo.mul(1.5)));
    nodeMat.opacityNode = u.uLift;

    // Dots: evenly spaced seeds, a dotted line that flows.
    const dg = instanceGet(links.flatMap((k) => Array.from({ length: DOTS }, (_, i) => linkItem(k, i / DOTS))));
    const d = shared(u, dg);
    const t = fract(dg.f("aT").add(u.uTime.mul(0.35)));
    const dotA = varying(d.la.mul(smoothstep(0, 0.1, t)).mul(smoothstep(0.9, 1, t).oneMinus()));
    const dr = corner(DOT_HALF).div(DOT_HALF);
    const dotMat = new THREE.SpriteNodeMaterial(GLOW);
    dotMat.positionNode = d.link(t, d.la);
    dotMat.scaleNode = vec2(2 * DOT_HALF);
    dotMat.colorNode = BLUE.mul(3);
    dotMat.opacityNode = exp(dr.mul(dr).mul(-9)).mul(dotA);

    // Faint lines along the same arches.
    const l = shared(u, vertexGet);
    const lineMat = new THREE.LineBasicNodeMaterial(GLOW);
    lineMat.positionNode = l.link(vertexGet.f("aT"), l.la);
    lineMat.colorNode = BLUE;
    lineMat.opacityNode = varying(l.la.mul(0.12));

    return {
      nodeQuad: new THREE.PlaneGeometry(1, 1),
      dotQuad: new THREE.PlaneGeometry(1, 1),
      lines: vertexGeometry(
        links.flatMap((k) =>
          Array.from({ length: LINE_SEG }, (_, i) => [linkItem(k, i / LINE_SEG), linkItem(k, (i + 1) / LINE_SEG)]).flat(),
        ),
      ),
      nodeCount: STAGES.length,
      dotCount: links.length * DOTS,
      nodeMat,
      dotMat,
      lineMat,
    };
  }, [u]);

  useEffect(
    () => () => {
      for (const d of [parts.nodeQuad, parts.dotQuad, parts.lines, parts.nodeMat, parts.dotMat, parts.lineMat]) d.dispose();
    },
    [parts],
  );

  useFrame(() => {
    if (group.current) group.current.visible = u.uLift.value > 0.001;
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments geometry={parts.lines} material={parts.lineMat} frustumCulled={false} renderOrder={5} />
      <sprite
        args={[parts.dotMat]}
        geometry={parts.dotQuad}
        count={parts.dotCount}
        frustumCulled={false}
        renderOrder={6}
      />
      <sprite
        args={[parts.nodeMat]}
        geometry={parts.nodeQuad}
        count={parts.nodeCount}
        frustumCulled={false}
        renderOrder={7}
      />
    </group>
  );
}
