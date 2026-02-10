"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  Line,
  PerspectiveCamera,
} from "@react-three/drei";
import { useRef } from "react";
import ResetViewButton from "./UI/ResetViewButton";

function SketchUpAxes() {
  const length = 500;
  const dashProps = {
    dashed: true,
    dashSize: 2,
    gapSize: 2,
  };

  return (
    <group>
      <Line
        points={[
          [0, 0, 0],
          [length, 0, 0],
        ]}
        color="red"
        lineWidth={1}
      />
      <Line
        points={[
          [0, 0, 0],
          [-length, 0, 0],
        ]}
        color="red"
        lineWidth={1}
        {...dashProps}
      />

      <Line
        points={[
          [0, 0, 0],
          [0, length, 0],
        ]}
        color="green"
        lineWidth={1}
      />
      <Line
        points={[
          [0, 0, 0],
          [0, -length, 0],
        ]}
        color="green"
        lineWidth={1}
        {...dashProps}
      />

      <Line
        points={[
          [0, 0, 0],
          [0, 0, length],
        ]}
        color="blue"
        lineWidth={1}
      />
      <Line
        points={[
          [0, 0, 0],
          [0, 0, -length],
        ]}
        color="blue"
        lineWidth={1}
        {...dashProps}
      />
    </group>
  );
}

// Zawartość sceny
function SceneContent({
  onResetReady,
}: {
  onResetReady: (fn: () => void) => void;
}) {
  const { camera, controls } = useThree();

  const resetView = () => {
    camera.position.set(50, 50, 50);
    if (controls) {
      // @ts-ignore
      controls.target.set(0, 0, 0);
      // @ts-ignore
      controls.update();
    }
  };

  onResetReady(resetView);

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <PerspectiveCamera
        makeDefault
        position={[50, 50, 50]}
        fov={45}
        near={0.1}
        far={2000}
      />

      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <Grid
        infiniteGrid
        cellSize={10}
        cellColor="#e5e5e5"
        sectionSize={100}
        sectionColor="#d1d1d1"
        fadeDistance={300}
        fadeStrength={1.5}
        cellThickness={0.5}
        sectionThickness={1}
      />

      <SketchUpAxes />

      <OrbitControls
        makeDefault
        zoomToCursor={true}
        enableDamping={true}
        dampingFactor={0.1}
      />

      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube
          color="white"
          strokeColor="gray"
          textColor="black"
          opacity={0.8}
        />
      </GizmoHelper>
    </>
  );
}

// Główny komponent
export default function Canvas3D() {
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const handleReset = () => {
    if (resetFunctionRef.current) {
      resetFunctionRef.current();
    }
  };

  return (
    <div className="w-screen h-screen bg-white relative">
      <Canvas gl={{ antialias: true }}>
        <SceneContent
          onResetReady={(fn) => {
            resetFunctionRef.current = fn;
          }}
        />
      </Canvas>

      <ResetViewButton onReset={handleReset} />
    </div>
  );
}
