import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Suspense, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Cube } from './Cube';
import { SceneJuice } from './SceneJuice';
import { GestureLayer } from '../../interaction/GestureLayer';
import { useGameStore } from '../../store/gameStore';

const FOV = 38;
/**
 * World-space bounding radius the camera should comfortably fit in the frame.
 * Tuned per cube size so a 2x2 doesn't render at ~65% the visual weight of a
 * 3x3 (the 2x2's actual bounding radius is ~1.68 world units after the layout
 * scale in Cube.tsx; the 3x3's is ~2.55). Keeping the same visual padding
 * ratio (radius * 1.21 ≈ target) gives us these numbers.
 */
const TARGET_RADIUS_3X3 = 3.1;
const TARGET_RADIUS_2X2 = 2.05;

function computeCameraPosition(
  width: number,
  height: number,
  targetRadius: number,
): [number, number, number] {
  const aspect = Math.max(0.01, width / Math.max(1, height));
  const fovRad = (FOV * Math.PI) / 180;
  const distForHeight = targetRadius / Math.tan(fovRad / 2);
  const distForWidth = targetRadius / (Math.tan(fovRad / 2) * aspect);
  const dist = Math.max(distForHeight, distForWidth);
  return [dist * 0.48, dist * 0.5, dist * 0.64];
}

export function CubeScene() {
  const is2x2 =
    useGameStore.getState().currentLevel?.cubeSize === '2x2';
  const targetRadius = is2x2 ? TARGET_RADIUS_2X2 : TARGET_RADIUS_3X3;
  const initial = computeCameraPosition(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
    typeof window !== 'undefined' ? window.innerHeight : 800,
    targetRadius,
  );
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: initial, fov: FOV }}
      onCreated={({ gl, scene, camera }) => {
        // Transparent clear color so the CSS background painted on the level
        // wrapper (see App.tsx) shows through behind the cube.
        gl.setClearColor('#000000', 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.fog = new THREE.Fog('#0d0f13', 14, 24);
        camera.lookAt(0, 0, 0);
      }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[6, 8, 4]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-4, 3, -5]} intensity={0.35} color="#88a" />
      <hemisphereLight args={['#a5b6ff', '#1a1c22', 0.25]} />

      <ResponsiveCamera targetRadius={targetRadius} />
      <SceneJuice />
      <Suspense fallback={null}>
        <Environment preset="city" background={false} />
        <ShadowFloor />
        <GestureLayer>
          <Cube />
        </GestureLayer>
      </Suspense>
    </Canvas>
  );
}

/**
 * Push the camera further back on narrow (portrait) viewports so the cube
 * stays comfortably inside the frame with room for the HUD above and below.
 * `targetRadius` is passed from the parent so 2x2 mode can request a tighter
 * frame (smaller radius = camera closer = cube fills more of the view).
 */
function ResponsiveCamera({ targetRadius }: { targetRadius: number }) {
  const { camera, gl } = useThree();
  // useLayoutEffect so the correction lands before the first paint, avoiding a
  // one-frame flash of the default camera position. We measure the canvas
  // element directly (rather than r3f's size, which lags one frame) and also
  // re-run on window resize / orientation change.
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const measure = () => {
      const el = gl.domElement;
      const rect = el.getBoundingClientRect();
      const w = rect.width || el.clientWidth || window.innerWidth;
      const h = rect.height || el.clientHeight || window.innerHeight;
      const [x, y, z] = computeCameraPosition(w, h, targetRadius);
      camera.position.set(x, y, z);
      camera.aspect = w / h;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [camera, gl, targetRadius]);
  return null;
}

function ShadowFloor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2.4, 0]}
      receiveShadow
    >
      <planeGeometry args={[20, 20]} />
      <shadowMaterial opacity={0.42} />
    </mesh>
  );
}
