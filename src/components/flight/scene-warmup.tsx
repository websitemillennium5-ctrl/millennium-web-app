"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { signalReady } from "@/lib/preload";

/**
 * Place last inside a <Canvas>: once every sibling has mounted, compiles all of the scene's shaders
 * (in parallel where the driver allows) and draws one frame so textures are uploaded to the GPU.
 * The first real frame on screen is then cheap instead of a multi-hundred-millisecond stall.
 */
export function SceneWarmup({ id }: { id: string }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      gl.render(scene, camera);
      signalReady(id);
    };
    gl.compileAsync(scene, camera).then(finish, finish);
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, id]);

  return null;
}
