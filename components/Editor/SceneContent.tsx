"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  PerspectiveCamera,
} from "@react-three/drei";

import Axes from "./Axes";
import BackgroundPlane from "./BackgroundPlane";
import ShapeRenderer from "./ShapeRenderer";
import InteractionManager from "./InteractionManager";
import { EditorMode, DrawnShape, BackgroundImageData } from "./types";

export interface SceneContentProps {
  onResetReady: (fn: () => void) => void;
  backgroundImage: BackgroundImageData | null;
  mode: EditorMode;
  shapes: DrawnShape[];
  visibleShapes: DrawnShape[];
  onShapeAdd: (s: DrawnShape) => void;
  onShapeUpdate: (id: string, u: Partial<DrawnShape>) => void;
  onCalibrateConfirm: (dist: number) => void;
  hoveredShapeId: string | null;
  setHoveredShapeId: (id: string | null) => void;
  isSnapEnabled: boolean;
  editingShapeId: string | null;
  setEditingShapeId: (id: string | null) => void;
  activeExtrudeId: string | null;
  setActiveExtrudeId: (id: string | null) => void;
  onShapesCommit: () => void;
}

export default function SceneContent({
  onResetReady,
  backgroundImage,
  mode,
  shapes,
  visibleShapes,
  onShapeAdd,
  onShapeUpdate,
  onCalibrateConfirm,
  hoveredShapeId,
  setHoveredShapeId,
  isSnapEnabled,
  editingShapeId,
  setEditingShapeId,
  activeExtrudeId,
  setActiveExtrudeId,
  onShapesCommit,
}: SceneContentProps) {
  const { camera, controls } = useThree();

  useEffect(() => {
    onResetReady(() => {
      camera.position.set(100, 150, 100);
      if (controls) {
        // @ts-ignore
        controls.target.set(0, 0, 0);
        // @ts-ignore
        controls.update();
      }
    });
  }, [controls, camera, onResetReady]);

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <PerspectiveCamera
        makeDefault
        position={[100, 150, 100]}
        fov={45}
        near={0.1}
        far={100000}
      />
      <ambientLight intensity={0.8} />
      <directionalLight position={[50, 100, 50]} intensity={1} />

      <Grid
        infiniteGrid
        cellSize={10}
        sectionSize={100}
        fadeDistance={2000}
        cellColor="#e5e5e5"
        sectionColor="#d1d1d1"
        position={[0, -0.01, 0]}
      />

      <Axes />
      {backgroundImage && (
        <BackgroundPlane data={backgroundImage} shapes={visibleShapes} />
      )}

      <ShapeRenderer
        shapes={visibleShapes}
        hoveredShapeId={hoveredShapeId}
        activeExtrudeId={activeExtrudeId}
      />

      <InteractionManager
        mode={mode}
        shapes={shapes}
        visibleShapes={visibleShapes}
        onShapeAdd={onShapeAdd}
        onShapeUpdate={onShapeUpdate}
        onCalibrate={onCalibrateConfirm}
        setHoveredShapeId={setHoveredShapeId}
        isSnapEnabled={isSnapEnabled}
        editingShapeId={editingShapeId}
        setEditingShapeId={setEditingShapeId}
        activeExtrudeId={activeExtrudeId}
        setActiveExtrudeId={setActiveExtrudeId}
        onShapesCommit={onShapesCommit}
      />

      <OrbitControls
        makeDefault
        enabled={mode === "VIEW"}
        zoomToCursor={true}
        maxPolarAngle={Math.PI / 2}
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
