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

  // --- NOWE: Stan dla trybu kalibracji (linijka) ---
  const [isCalibratingRuler, setIsCalibratingRuler] = useState(false);
  const [measuredPixels, setMeasuredPixels] = useState<number>(0);

  const handleReset = () => resetFunctionRef.current?.();

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

        if (s.type === "sphere") {
          // Przesuwanie sfery
          const center = s.center || [0, s.radius || 10, 0];
          return {
            ...s,
            center: [center[0] + dx, center[1] + dy, center[2] + dz] as [
              number,
              number,
              number,
            ],
          };
        }

        // Przesuwanie prostokąta
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

  const handleShapesCommit = () => {
    saveToHistory(shapes);
  };

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

  // --- NOWE: Funkcja wywoływana przez InteractionManager gdy zmierzymy odległość ---
  const handleMeasureFromInteraction = (distPx: number) => {
    if (distPx < 0.1) return;
    setMeasuredPixels(distPx);
    setIsCalibratingRuler(true);
    setIsScaleModalOpen(true);
  };

  const handleScaleConfirm = (pixels: number, realWorldUnits: number) => {
    // 1. Tryb KALIBRACJI LINIJKĄ
    if (isCalibratingRuler && backgroundImage) {
      const correctionFactor = realWorldUnits / pixels;

      setBackgroundImage({
        ...backgroundImage,
        scale: backgroundImage.scale * correctionFactor,
        width: backgroundImage.width * correctionFactor,
        height: backgroundImage.height * correctionFactor,
      });

      setIsScaleModalOpen(false);
      setIsCalibratingRuler(false);
      setMode("VIEW");
      return;
    }

    // 2. Tryb IMPORTU ZDJĘCIA
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
    setIsCalibratingRuler(false);
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
    radius?: number;
    center?: [number, number, number];
  }) => {
    if (!editingShapeId) return;

    const shape = shapes.find((s) => s.id === editingShapeId);
    if (!shape) return;

    let updatedShape = { ...shape };

    if (shape.type === "sphere") {
      // Edycja sfery
      if (updates.radius !== undefined) {
        updatedShape.radius = updates.radius;
      }
      if (updates.center !== undefined) {
        updatedShape.center = updates.center;
      }
    } else {
      // Edycja prostokąta
      updatedShape.height = updates.height;
      updatedShape.baseY = updates.baseY;

      if (updates.newWidth !== undefined && updates.newDepth !== undefined) {
        const { width: oldWidth, depth: oldDepth } = getShapeBoxParams(shape);
        const scaleW = updates.newWidth / oldWidth;
        const scaleD = updates.newDepth / oldDepth;

        const orientation = shape.orientation || "xz";

        let centerX = 0,
          centerY = 0,
          centerZ = 0;

        if (orientation === "xz") {
          centerX = (shape.points[0][0] + shape.points[2][0]) / 2;
          centerZ = (shape.points[0][2] + shape.points[2][2]) / 2;
          centerY = shape.baseY || 0;
        } else if (orientation === "xy") {
          centerX = (shape.points[0][0] + shape.points[2][0]) / 2;
          centerY = (shape.points[0][1] + shape.points[2][1]) / 2;
          centerZ = shape.faceOffset || 0;
        } else {
          centerY = (shape.points[0][1] + shape.points[2][1]) / 2;
          centerZ = (shape.points[0][2] + shape.points[2][2]) / 2;
          centerX = shape.faceOffset || 0;
        }

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
    }

    const newShapes = shapes.map((s) =>
      s.id === editingShapeId ? updatedShape : s,
    );
    saveToHistory(newShapes);
    setEditingShapeId(null);
  };

  const editingShape = editingShapeId
    ? shapes.find((s) => s.id === editingShapeId)
    : null;

  const getModeLabel = () => {
    switch (mode) {
      case "DRAW_RECT":
        return "RYSOWANIE: Kliknij podłogę lub ścianę bryły, potem drugi narożnik";
      case "EXTRUDE":
        return "WYCIĄGANIE: Ciągnij figurę myszą lub kliknij aby wpisać wartość";
      case "PLACE_SPHERE":
        return "KULKA: Kliknij aby umieścić kulkę, przeciągnij aby zmienić rozmiar";
      case "CALIBRATE":
        return "KALIBRACJA: Kliknij dwa punkty na obrazku, aby zmierzyć odległość referencyjną";
      default:
        return "";
    }
  };

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
          onCalibrateConfirm={handleMeasureFromInteraction}
          hoveredShapeId={hoveredShapeId} // <-- DODANO BRAKUJĄCY PROP
          setHoveredShapeId={setHoveredShapeId}
          isSnapEnabled={isSnapEnabled}
          editingShapeId={editingShapeId}
          setEditingShapeId={setEditingShapeId}
          activeExtrudeId={activeExtrudeId}
          setActiveExtrudeId={setActiveExtrudeId}
          onShapesCommit={handleShapesCommit}
        />
      </Canvas>

      {backgroundImage && <ImageInfoPanel data={backgroundImage} />}

      <CanvasScaleModal
        key={isCalibratingRuler ? "ruler" : "import"}
        isOpen={isScaleModalOpen}
        onClose={handleModalClose}
        onConfirm={handleScaleConfirm}
        // @ts-ignore
        initialPixels={isCalibratingRuler ? measuredPixels : 1}
        // @ts-ignore
        title={isCalibratingRuler ? "Kalibracja wymiaru" : "Skala płótna"}
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
          {getModeLabel()}
        </div>
      )}
    </div>
  );
}
