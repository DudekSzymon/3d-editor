"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  PerspectiveCamera,
} from "@react-three/drei";
import { useRef, useState, useEffect, useCallback } from "react";

import Toolbar from "./UI/Toolbar";
import ImageInfoPanel from "./UI/ImageInfoPanel";
import CanvasScaleModal from "./UI/CanvasScaleModal";
import HeightInputPanel from "./UI/HeightInputPanel";

import Axes from "./Editor/Axes";
import BackgroundPlane from "./Editor/BackgroundPlane";
import ShapeRenderer from "./Editor/ShapeRenderer";
import InteractionManager from "./Editor/InteractionManager";
import {
  EditorMode,
  DrawnShape,
  BackgroundImageData,
  getShapeBoxParams,
} from "./Editor/types";

interface SceneContentProps {
  onResetReady: (fn: () => void) => void;
  backgroundImage: BackgroundImageData | null;
  mode: EditorMode;
  shapes: DrawnShape[];
  onShapeAdd: (s: DrawnShape) => void;
  onShapeUpdate: (id: string, u: Partial<DrawnShape>) => void;
  onCalibrateConfirm: (dist: number) => void;
  hoveredShapeId: string | null;
  setHoveredShapeId: (id: string | null) => void;
  isSnapEnabled: boolean;
  editingShapeId: string | null;
  setEditingShapeId: (id: string | null) => void;
  // Nowe propsy do obsługi wycinania i historii
  activeExtrudeId: string | null;
  setActiveExtrudeId: (id: string | null) => void;
  onShapesCommit: () => void;
}

function SceneContent({
  onResetReady,
  backgroundImage,
  mode,
  shapes,
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
        <BackgroundPlane data={backgroundImage} shapes={shapes} />
      )}

      {/* Przekazujemy activeExtrudeId, aby ShapeRenderer wiedział, co wyłączyć z CSG podczas ruchu */}
      <ShapeRenderer
        shapes={shapes}
        hoveredShapeId={hoveredShapeId}
        activeExtrudeId={activeExtrudeId}
      />

      <InteractionManager
        mode={mode}
        shapes={shapes}
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

export default function Canvas3D() {
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const [mode, setMode] = useState<EditorMode>("VIEW");
  const [backgroundImage, setBackgroundImage] =
    useState<BackgroundImageData | null>(null);
  const [shapes, setShapes] = useState<DrawnShape[]>([]);

  // Historia i stany edycji
  const [history, setHistory] = useState<DrawnShape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [activeExtrudeId, setActiveExtrudeId] = useState<string | null>(null);

  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);

  const [tempImage, setTempImage] = useState<{
    file: File;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);

  const handleReset = () => resetFunctionRef.current?.();

  // == LOGIKA HISTORII ==
  const saveToHistory = useCallback(
    (newShapes: DrawnShape[]) => {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push([...newShapes]);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setShapes(newShapes);
    },
    [history, historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevShapes = history[historyIndex - 1];
      setShapes([...prevShapes]);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextShapes = history[historyIndex + 1];
      setShapes([...nextShapes]);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Handlery zmian kształtów
  const handleShapeAdd = (shape: DrawnShape) => {
    const newShapes = [...shapes, shape];
    saveToHistory(newShapes);
  };

  const handleShapeUpdate = (id: string, updates: Partial<DrawnShape>) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const handleShapeMove = (id: string, dx: number, dy: number, dz: number) => {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          points: s.points.map((p) => [p[0] + dx, p[1] + dy, p[2] + dz]) as [
            number,
            number,
            number,
          ][],
        };
      }),
    );
  };

  // Wywoływane przez InteractionManager po puszczeniu myszki
  const handleShapesCommit = () => {
    saveToHistory(shapes);
  };

  // Obsługa klawiatury
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMode("VIEW");
        setEditingShapeId(null);
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey
      ) {
        e.preventDefault();
        undo();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

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

  const handleHeightApply = (updates: {
    height: number;
    baseY: number;
    newWidth?: number;
    newDepth?: number;
  }) => {
    if (!editingShapeId) return;

    const shape = shapes.find((s) => s.id === editingShapeId);
    if (!shape) return;

    let updatedShape = { ...shape };

    // 1. Najpierw zmień wysokość i baseY
    updatedShape.height = updates.height;
    updatedShape.baseY = updates.baseY;

    // 2. Jeśli są nowe wymiary, przeskaluj punkty
    if (updates.newWidth !== undefined && updates.newDepth !== undefined) {
      const { width: oldWidth, depth: oldDepth } = getShapeBoxParams(shape);
      const scaleW = updates.newWidth / oldWidth;
      const scaleD = updates.newDepth / oldDepth;

      const orientation = shape.orientation || "xz";

      // Znajdź środek prostokąta
      let centerX = 0,
        centerY = 0,
        centerZ = 0;

      if (orientation === "xz") {
        // Dla poziomych: środek w X i Z
        centerX = (shape.points[0][0] + shape.points[2][0]) / 2;
        centerZ = (shape.points[0][2] + shape.points[2][2]) / 2;
        centerY = shape.baseY || 0;
      } else if (orientation === "xy") {
        // Dla pionowych front/back: środek w X i Y
        centerX = (shape.points[0][0] + shape.points[2][0]) / 2;
        centerY = (shape.points[0][1] + shape.points[2][1]) / 2;
        centerZ = shape.faceOffset || 0;
      } else {
        // yz - boczne ściany: środek w Y i Z
        centerY = (shape.points[0][1] + shape.points[2][1]) / 2;
        centerZ = (shape.points[0][2] + shape.points[2][2]) / 2;
        centerX = shape.faceOffset || 0;
      }

      // Przeskaluj punkty względem środka
      const newPoints = shape.points.map((p) => {
        if (orientation === "xz") {
          const dx = p[0] - centerX;
          const dz = p[2] - centerZ;
          return [centerX + dx * scaleW, p[1], centerZ + dz * scaleD] as [
            number,
            number,
            number,
          ];
        } else if (orientation === "xy") {
          const dx = p[0] - centerX;
          const dy = p[1] - centerY;
          return [centerX + dx * scaleW, centerY + dy * scaleD, p[2]] as [
            number,
            number,
            number,
          ];
        } else {
          // yz
          const dy = p[1] - centerY;
          const dz = p[2] - centerZ;
          return [p[0], centerY + dy * scaleD, centerZ + dz * scaleW] as [
            number,
            number,
            number,
          ];
        }
      });

      updatedShape.points = newPoints;
    }

    // 3. Zapisz zmiany
    const newShapes = shapes.map((s) =>
      s.id === editingShapeId ? updatedShape : s,
    );
    saveToHistory(newShapes);
    setEditingShapeId(null);
  };

  const editingShape = editingShapeId
    ? shapes.find((s) => s.id === editingShapeId)
    : null;

  return (
    <div className="w-screen h-screen bg-white relative select-none">
      <Toolbar
        currentMode={mode}
        setMode={setMode}
        onResetView={handleReset}
        onImageSelect={handleImageSelect}
        isSnapEnabled={isSnapEnabled}
        onToggleSnap={() => setIsSnapEnabled(!isSnapEnabled)}
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
          onShapeUpdate={handleShapeUpdate}
          onCalibrateConfirm={() => {}}
          hoveredShapeId={hoveredShapeId}
          setHoveredShapeId={setHoveredShapeId}
          isSnapEnabled={isSnapEnabled}
          editingShapeId={editingShapeId}
          setEditingShapeId={setEditingShapeId}
          // Przekazujemy nowe propsy do SceneContent
          activeExtrudeId={activeExtrudeId}
          setActiveExtrudeId={setActiveExtrudeId}
          onShapesCommit={handleShapesCommit}
        />
      </Canvas>

      {backgroundImage && <ImageInfoPanel data={backgroundImage} />}

      <CanvasScaleModal
        isOpen={isScaleModalOpen}
        onClose={handleModalClose}
        onConfirm={handleScaleConfirm}
      />

      {editingShape && (
        <HeightInputPanel
          currentHeight={editingShape.height}
          currentBaseY={editingShape.baseY || 0}
          shape={editingShape}
          onApply={handleHeightApply}
          onCancel={() => setEditingShapeId(null)}
          orientation={editingShape.orientation}
          faceDirection={editingShape.faceDirection}
          isChild={!!editingShape.parentId}
          onMove={(dx, dy, dz) => handleShapeMove(editingShape.id, dx, dy, dz)}
        />
      )}

      {mode !== "VIEW" && (
        <div className="absolute top-4 left-24 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded shadow-lg z-20 text-sm font-bold animate-pulse">
          {mode === "DRAW_RECT" &&
            "RYSOWANIE: Kliknij podłogę lub ścianę bryły, potem drugi narożnik"}
          {mode === "EXTRUDE" &&
            "WYCIĄGANIE: Ciągnij figurę myszą lub kliknij aby wpisać wartość"}
        </div>
      )}
    </div>
  );
}
