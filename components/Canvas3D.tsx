"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  PerspectiveCamera,
} from "@react-three/drei";
import { useRef, useState, useEffect } from "react";

// Importy UI
import Toolbar from "./UI/Toolbar";
import ImageInfoPanel from "./UI/ImageInfoPanel";
import CanvasScaleModal from "./UI/CanvasScaleModal";

// Importy z folderu editor
import Axes from "./Editor/Axes";
import BackgroundPlane from "./Editor/BackgroundPlane";
import ShapeRenderer from "./Editor/ShapeRenderer";
import InteractionManager from "./Editor/InteractionManager";
import { EditorMode, DrawnShape, BackgroundImageData } from "./Editor/types";

// --- KOMPONENT SCENY ---
function SceneContent({
  onResetReady,
  backgroundImage,
  mode,
  shapes,
  onShapeAdd,
  onShapeUpdate, // NOWE
  onCalibrateConfirm,
  hoveredShapeId, // NOWE
  setHoveredShapeId, // NOWE
}: {
  onResetReady: (fn: () => void) => void;
  backgroundImage: BackgroundImageData | null;
  mode: EditorMode;
  shapes: DrawnShape[];
  onShapeAdd: (s: DrawnShape) => void;
  onShapeUpdate: (id: string, u: Partial<DrawnShape>) => void;
  onCalibrateConfirm: (dist: number) => void;
  hoveredShapeId: string | null;
  setHoveredShapeId: (id: string | null) => void;
}) {
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

      {/* Komponenty Edytora */}
      <Axes />
      {backgroundImage && <BackgroundPlane data={backgroundImage} />}

      {/* Przekazujemy hoveredShapeId do renderera, żeby wiedział co podświetlić */}
      <ShapeRenderer shapes={shapes} hoveredShapeId={hoveredShapeId} />

      <InteractionManager
        mode={mode}
        shapes={shapes}
        onShapeAdd={onShapeAdd}
        onShapeUpdate={onShapeUpdate}
        onCalibrate={onCalibrateConfirm}
        setHoveredShapeId={setHoveredShapeId}
      />

      <OrbitControls
        makeDefault
        enabled={mode === "VIEW"} // Obracanie tylko w trybie widoku
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

// --- GŁÓWNY KOMPONENT ---
export default function Canvas3D() {
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const [mode, setMode] = useState<EditorMode>("VIEW");
  const [backgroundImage, setBackgroundImage] =
    useState<BackgroundImageData | null>(null);
  const [shapes, setShapes] = useState<DrawnShape[]>([]);

  // Stan podświetlenia figury (hover)
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);

  const [tempImage, setTempImage] = useState<{
    file: File;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);

  const handleReset = () => resetFunctionRef.current?.();

  // Dodawanie kształtu
  const handleShapeAdd = (shape: DrawnShape) => {
    setShapes((prev) => [...prev, shape]);
  };

  // Aktualizacja kształtu (np. zmiana wysokości)
  const handleShapeUpdate = (id: string, updates: Partial<DrawnShape>) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const handleImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setTempImage({
        file,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setIsScaleModalOpen(true);
    };
    img.src = url;
  };

  const handleScaleConfirm = (pixels: number, realWorldUnits: number) => {
    if (!tempImage) return;
    const scaleFactor = realWorldUnits / pixels;
    setBackgroundImage({
      url: tempImage.url,
      width: tempImage.width * scaleFactor,
      height: tempImage.height * scaleFactor,
      originalWidth: tempImage.width,
      originalHeight: tempImage.height,
      scale: scaleFactor,
    });
    setIsScaleModalOpen(false);
    setTempImage(null);
    setMode("VIEW");
  };

  const handleModalClose = () => {
    setIsScaleModalOpen(false);
    if (tempImage) {
      URL.revokeObjectURL(tempImage.url);
      setTempImage(null);
    }
  };

  return (
    <div className="w-screen h-screen bg-white relative select-none">
      <Toolbar
        currentMode={mode}
        setMode={setMode}
        onResetView={handleReset}
        onImageSelect={handleImageSelect}
      />

      <Canvas gl={{ antialias: true }}>
        <SceneContent
          onResetReady={(fn) => {
            resetFunctionRef.current = fn;
          }}
          backgroundImage={backgroundImage}
          mode={mode}
          shapes={shapes}
          onShapeAdd={handleShapeAdd}
          onShapeUpdate={handleShapeUpdate} // Przekazujemy funkcję update
          onCalibrateConfirm={() => {}} // (Opcjonalne, jeśli używamy modala)
          hoveredShapeId={hoveredShapeId}
          setHoveredShapeId={setHoveredShapeId}
        />
      </Canvas>

      {backgroundImage && <ImageInfoPanel data={backgroundImage} />}

      <CanvasScaleModal
        isOpen={isScaleModalOpen}
        onClose={handleModalClose}
        onConfirm={handleScaleConfirm}
      />

      {mode !== "VIEW" && (
        <div className="absolute top-4 left-24 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded shadow-lg z-20 text-sm font-bold animate-pulse">
          {mode === "DRAW_RECT" && "RYSOWANIE: Zaznacz narożniki"}
          {mode === "EXTRUDE" &&
            "WYCIĄGANIE: Kliknij figurę i pociągnij myszką"}
        </div>
      )}
    </div>
  );
}
