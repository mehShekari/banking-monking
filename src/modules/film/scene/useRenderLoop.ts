import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { clock } from "@/modules/film/timeline/clock";
import { live } from "./live";
import type { Post } from "./post";

/**
 * The render loop (useFrame priority 1, after every object has written its uniforms), and the
 * shader warm-up before the film starts. Calls `onReady` once every program is compiled.
 */
export function useRenderLoop(post: Post, canStart: () => boolean, onReady: () => void) {
  const three = useThree();
  const gl = three.gl as unknown as THREE.WebGPURenderer;
  const scene = three.scene;
  const ready = useRef(false);
  const warming = useRef(false);
  useEffect(() => {
    live.ready = false;
  }, []);

  useFrame(() => {
    // The end credits cover the screen: nothing to show, nothing to render.
    if (clock.covered && ready.current) return;
    post.pipeline.render();
    if (ready.current || warming.current || !canStart()) return;
    warming.current = true;
    warmUp(gl, scene, post).then(() => {
      post.pipeline.render(); // also compiles the post chain (the fracture branch is in the same shader)
      ready.current = live.ready = true;
      performance.mark("film-ready"); // load time, for DevTools and perf scripts
      onReady();
    });
  }, 1);
}

/**
 * Shader warm-up behind the loading screen: every program compiles now, instead of hitching
 * the first time a door or the constellation appears. One compileAsync per object, all at once:
 * a single call over the scene compiles its pipelines one after another (~60 s cold on an iGPU);
 * in parallel the driver's compile threads overlap them. Each call collects its object
 * synchronously, so hidden objects are shown only within this block, never drawn.
 */
function warmUp(gl: THREE.WebGPURenderer, scene: THREE.Scene, post: Post) {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  const drawables: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) drawables.push(o);
  });
  // Compiled for the scene pass target (half-float), which is where the scene is drawn.
  const target = gl.getRenderTarget();
  const mrt = gl.getMRT();
  gl.setRenderTarget(post.scenePass.renderTarget);
  gl.setMRT(post.scenePass.getMRT());
  const jobs = drawables.map((o) => gl.compileAsync(o, post.scenePass.camera, scene).catch(() => {}));
  gl.setRenderTarget(target);
  gl.setMRT(mrt);
  for (const o of hidden) o.visible = false;
  return Promise.all(jobs);
}
