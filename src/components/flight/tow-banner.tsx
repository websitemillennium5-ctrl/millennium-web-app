"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Progress } from "./plane-scene";
import { TAIL_TOW_POINT } from "./airliner";

const BRAND = "#e3182d";
const INK = "#0e1626";

const MESSAGE = "ADMISSION OPEN";

// banner size in plane-local units (the fuselage is 4 long, tail tip at x = -2)
const L = 1.0;
const H = 0.24;
const TOW = 0.4; // rope length from the tail to the banner's leading pole
const SEG_X = 36;
const SEG_Y = 6;

function bannerCanvas() {
  const W = 2048;
  const Hc = Math.round((W * H) / L);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Hc;
  const draw = () => {
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, Hc);
    // red hems with a thin navy pinstripe
    const hem = Hc * 0.11;
    ctx.fillStyle = BRAND;
    ctx.fillRect(0, 0, W, hem);
    ctx.fillRect(0, Hc - hem, W, hem);
    ctx.fillStyle = INK;
    ctx.fillRect(0, hem, W, Hc * 0.018);
    ctx.fillRect(0, Hc - hem - Hc * 0.018, W, Hc * 0.018);

    // message, fitted to the width
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "4px";
    let size = Hc * 0.46;
    const font = (s: number) => `800 ${s}px "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif`;
    ctx.font = font(size);
    const maxW = W * 0.9;
    const w = ctx.measureText(MESSAGE).width;
    if (w > maxW) {
      size *= maxW / w;
      ctx.font = font(size);
    }
    ctx.fillStyle = INK;
    ctx.fillText(MESSAGE, W / 2, Hc / 2 + size * 0.04);
  };
  draw();
  return { canvas, draw };
}

/** Cylinder spanning two points — used for the tow rope and bridle */
function Rope({ a, b, r = 0.006, material }: { a: THREE.Vector3; b: THREE.Vector3; r?: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const dir = b.clone().sub(a);
    return {
      pos: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={material}>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  );
}

/**
 * A cloth banner towed behind the aircraft. Lives in the plane's local space,
 * unfurls after lift-off and ripples with a travelling wave.
 */
export function TowBanner({ progress }: { progress: Progress }) {
  const group = useRef<THREE.Group>(null);
  const cloth = useRef<THREE.Mesh>(null);

  const { geometry, base, front, back, rope, pole } = useMemo(() => {
    // leading edge at x = 0, the banner trails off towards -x
    const geometry = new THREE.PlaneGeometry(L, H, SEG_X, SEG_Y);
    geometry.translate(-L / 2 - TOW, 0, 0);
    const base = Float32Array.from(geometry.attributes.position.array);

    const { canvas, draw } = bannerCanvas();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    // seen from the -z side the text would read backwards, so that face gets a mirrored copy
    const texBack = tex.clone();
    texBack.wrapS = THREE.RepeatWrapping;
    texBack.repeat.x = -1;
    texBack.offset.x = 1;
    // repaint once the brand font has loaded
    document.fonts?.ready.then(() => {
      draw();
      tex.needsUpdate = true;
      texBack.needsUpdate = true;
    });

    const cloth = { roughness: 0.85, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color("#ffffff") };
    return {
      geometry,
      base,
      front: new THREE.MeshPhysicalMaterial({ ...cloth, map: tex, side: THREE.FrontSide }),
      back: new THREE.MeshPhysicalMaterial({ ...cloth, map: texBack, side: THREE.BackSide }),
      rope: new THREE.MeshStandardMaterial({ color: "#3a4150", roughness: 0.8 }),
      pole: new THREE.MeshStandardMaterial({ color: "#c9ced6", roughness: 0.3, metalness: 0.8 }),
    };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      front.map?.dispose();
      back.map?.dispose();
      [front, back, rope, pole].forEach((m) => m.dispose());
    },
    [geometry, front, back, rope, pole],
  );

  const ropePoints = useMemo(
    () => ({
      tail: new THREE.Vector3(0, 0, 0),
      knot: new THREE.Vector3(-TOW * 0.6, 0, 0),
      top: new THREE.Vector3(-TOW, H / 2, 0),
      bottom: new THREE.Vector3(-TOW, -H / 2, 0),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const p = progress.current;
    // unfurl after lift-off, reel in again as the plane heads off into the distance
    const out = THREE.MathUtils.smoothstep(p, 0.2, 0.32) * (1 - THREE.MathUtils.smoothstep(p, 0.92, 0.99));
    g.visible = out > 0.01;
    if (!g.visible) return;
    g.scale.set(Math.max(out, 0.001), 1, 1);

    // travelling ripple that grows towards the free end
    // the geometry is read back from the scene graph so it can be deformed per frame
    const geo = cloth.current?.geometry;
    if (!geo) return;
    const t = clock.elapsedTime;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i];
      const y = base[i + 1];
      const d = Math.max(0, (-x - TOW) / L); // 0 at the pole, 1 at the tail end
      const amp = 0.008 + d * 0.05;
      pos[i + 2] = Math.sin(d * 9 - t * 6.5) * amp + Math.sin(d * 4 - t * 3 + y * 3) * amp * 0.35;
      pos[i + 1] = y - d * d * 0.03; // slight droop at the end
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    // anchored at the tip of the tail cone, so the rope always leaves from the aircraft
    <group ref={group} position={TAIL_TOW_POINT}>
      <mesh ref={cloth} geometry={geometry} material={front} />
      <mesh geometry={geometry} material={back} />
      {/* tow ring clipped onto the tail */}
      <mesh material={pole} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.012, 0.004, 8, 16]} />
      </mesh>
      <Rope a={ropePoints.tail} b={ropePoints.knot} material={rope} />
      <Rope a={ropePoints.knot} b={ropePoints.top} r={0.004} material={rope} />
      <Rope a={ropePoints.knot} b={ropePoints.bottom} r={0.004} material={rope} />
      {/* spreader pole on the leading edge */}
      <mesh position={[-TOW, 0, 0]} material={pole}>
        <cylinderGeometry args={[0.007, 0.007, H + 0.03, 8]} />
      </mesh>
    </group>
  );
}
