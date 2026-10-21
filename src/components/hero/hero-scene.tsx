"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshTransmissionMaterial } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// The emblem from fjd-logo.tsx as a 3D object: a glass shield with a solid F inside.
// Coordinates come from the SVG (viewBox 96 × 112); the y axis is flipped.

function shieldShape() {
  const shape = new THREE.Shape();
  shape.moveTo(48, -4);
  shape.lineTo(90, -17);
  shape.lineTo(90, -58);
  shape.bezierCurveTo(90, -84, 72, -100, 48, -109);
  shape.bezierCurveTo(24, -100, 6, -84, 6, -58);
  shape.lineTo(6, -17);
  shape.closePath();
  return shape;
}

function letterShape() {
  const points: [number, number][] = [
    [33, 34], [63, 34], [63, 45], [44, 45], [44, 58], [57, 58], [57, 68], [44, 68], [44, 84], [33, 84],
  ];
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, -y) : shape.lineTo(x, -y)));
  shape.closePath();
  return shape;
}

function useEmblemGeometry() {
  const geometry = useMemo(() => {
    const shield = new THREE.ExtrudeGeometry(shieldShape(), {
      depth: 10,
      bevelEnabled: true,
      bevelThickness: 5,
      bevelSize: 3.5,
      bevelSegments: 12,
      curveSegments: 64,
    });
    const letter = new THREE.ExtrudeGeometry(letterShape(), {
      depth: 5,
      bevelEnabled: true,
      bevelThickness: 1.2,
      bevelSize: 0.8,
      bevelSegments: 8,
    });

    // Center the shield, shift the F by the same offset and place it inside the shield's depth.
    shield.computeBoundingBox();
    const center = new THREE.Vector3();
    shield.boundingBox!.getCenter(center);
    shield.translate(-center.x, -center.y, -center.z);

    letter.computeBoundingBox();
    const letterCenter = new THREE.Vector3();
    letter.boundingBox!.getCenter(letterCenter);
    letter.translate(-center.x, -center.y, -letterCenter.z);

    // ExtrudeGeometry ships flat per-face normals, so the bevel and the curved walls show as
    // bands at steep angles. Creased normals smooth those while keeping real corners sharp.
    return {
      shield: toCreasedNormals(shield, Math.PI / 5),
      letter: toCreasedNormals(letter, Math.PI / 5),
    };
  }, []);

  useEffect(
    () => () => {
      geometry.shield.dispose();
      geometry.letter.dispose();
    },
    [geometry],
  );

  return geometry;
}

// Backdrop inside the scene: the same light blobs as the CSS, plus fine ruled lines.
// The glass refracts the lines, which is what makes the refraction visible at all.
function useBackdropTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    const width = 1600;
    const height = 1000;
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d")!;
    context.scale(2, 2);

    context.fillStyle = "#16263a";
    context.fillRect(0, 0, width, height);

    const blob = (x: number, y: number, radius: number, color: string) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(22, 38, 58, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    };
    blob(1180, 220, 640, "rgba(150, 40, 62, 0.9)");
    blob(1400, 820, 560, "rgba(59, 110, 165, 0.8)");
    blob(880, 600, 380, "rgba(47, 143, 138, 0.45)");
    blob(160, 980, 600, "rgba(59, 110, 165, 0.35)");

    context.strokeStyle = "rgba(255, 255, 255, 0.07)";
    context.lineWidth = 1.5;
    for (let y = 24; y < height; y += 36) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Backdrop() {
  const texture = useBackdropTexture();
  const { viewport, camera } = useThree();
  const area = viewport.getCurrentViewport(camera, [0, 0, -6]);
  return (
    <mesh position={[0, 0, -6]} scale={[area.width * 1.2, area.height * 1.2, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export type PointerPosition = { x: number; y: number };

type ShieldProps = {
  progress: MotionValue<number>;
  pointer: RefObject<PointerPosition>;
  reduced: boolean;
  compact: boolean;
};

function Shield({ progress, pointer, reduced, compact }: ShieldProps) {
  const group = useRef<THREE.Group>(null);
  const { shield, letter } = useEmblemGeometry();
  const { viewport } = useThree();
  // On first load the shield waits for the intro curtain; on in-app navigation it does not.
  const appearDelay = useRef(0);
  const startedAt = useRef<number | null>(null);

  const units = compact
    ? Math.min((viewport.width * 0.52) / 96, (viewport.height * 0.27) / 112)
    : (viewport.height * 0.62) / 112;
  const baseX = compact ? 0 : viewport.width * 0.2;
  const baseY = compact ? viewport.height * 0.23 : 0;

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    if (startedAt.current === null) {
      startedAt.current = state.clock.elapsedTime;
      appearDelay.current = Math.max(0, 2.2 - performance.now() / 1000);
    }

    const elapsed = state.clock.elapsedTime - startedAt.current - appearDelay.current;
    const appear = reduced ? 1 : easeOutCubic(THREE.MathUtils.clamp(elapsed / 1.6, 0, 1));
    const scroll = progress.get();

    // The pointer comes from a page-wide listener (hero.tsx): the hero text lies on top of the
    // canvas, so the canvas itself never receives pointer events.
    const { x, y } = pointer.current;
    const pointerY = reduced ? 0 : x * 0.55;
    const pointerX = reduced ? 0 : -y * 0.32;
    const spin = reduced ? 0 : (1 - appear) * -1.6;
    // Scrolling turns the shield away and tips it back as the glass sheet slides over it.
    const turn = reduced ? 0 : scroll;

    node.rotation.y = THREE.MathUtils.damp(node.rotation.y, -0.38 + pointerY + spin + turn * 2.4, 5, delta);
    node.rotation.x = THREE.MathUtils.damp(node.rotation.x, pointerX + turn * 0.6, 5, delta);

    const scale = units * (0.55 + appear * 0.45) * (1 - turn * 0.28);
    node.scale.setScalar(scale);
    node.position.set(baseX, baseY + turn * viewport.height * 0.22, 0);
  });

  return (
    <group ref={group}>
      <mesh geometry={shield}>
        {/* Three's transmission sampler uses a full-resolution multisampled target.
            Canvas antialiasing alone cannot smooth the F inside drei's default offscreen buffers. */}
        <MeshTransmissionMaterial
          transmissionSampler
          side={THREE.DoubleSide}
          thickness={0.9}
          samples={8}
          transmission={1}
          roughness={0}
          ior={1.45}
          chromaticAberration={0.008}
          anisotropicBlur={0}
          distortion={0}
          temporalDistortion={0}
          color="#ffffff"
        />
      </mesh>
      <mesh geometry={letter}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.55}
          metalness={0.2}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
}

type HeroSceneProps = {
  progress: MotionValue<number>;
  pointer: RefObject<PointerPosition>;
  active: boolean;
  reduced: boolean;
  onReady: () => void;
};

export default function HeroScene({ progress, pointer, active, reduced, onReady }: HeroSceneProps) {
  const [compact] = useState(() => window.innerWidth < 768);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[2, 3]}
      camera={{ position: [0, 0, 10], fov: 32 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={onReady}
      aria-hidden="true"
    >
      <Backdrop />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 8]} intensity={1.4} />

      <Float enabled={!reduced} speed={1.1} rotationIntensity={0.2} floatIntensity={0.45}>
        <Shield progress={progress} pointer={pointer} reduced={reduced} compact={compact} />
      </Float>

      {/* Studio lighting without an external HDR file: light formers create the reflections in the glass. */}
      <Environment resolution={512}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 6]} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="circle" color="#c0435c" intensity={6} position={[5, 2, -2]} scale={3} />
        <Lightformer form="circle" color="#4f86c6" intensity={5} position={[-4, -3, -1]} scale={3} />
        <Lightformer form="ring" color="#ffffff" intensity={2} position={[0, 0, 8]} scale={6} />
      </Environment>
    </Canvas>
  );
}
