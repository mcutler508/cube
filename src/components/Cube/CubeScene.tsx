import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Suspense, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Cube } from './Cube';
import { SceneJuice } from './SceneJuice';
import { GestureLayer } from '../../interaction/GestureLayer';

const FOV = 38;
const TARGET_RADIUS = 3.1;

function computeCameraPosition(width: number, height: number): [number, number, number] {
  const aspect = Math.max(0.01, width / Math.max(1, height));
  const fovRad = (FOV * Math.PI) / 180;
  const distForHeight = TARGET_RADIUS / Math.tan(fovRad / 2);
  const distForWidth = TARGET_RADIUS / (Math.tan(fovRad / 2) * aspect);
  const dist = Math.max(distForHeight, distForWidth);
  return [dist * 0.48, dist * 0.5, dist * 0.64];
}

export function CubeScene() {
  const initial = computeCameraPosition(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: initial, fov: FOV }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor('#0d0f13');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.fog = new THREE.Fog('#0d0f13', 14, 24);
        camera.lookAt(0, 0, 0);
      }}
    >
      <color attach="background" args={['#0d0f13']} />
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

      <ResponsiveCamera />
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
 */
function ResponsiveCamera() {
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
      const [x, y, z] = computeCameraPosition(w, h);
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
  }, [camera, gl]);
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
