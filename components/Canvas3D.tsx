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
import CanvasSettingsModal from "./UI/CanvasSettingsModal";
import HeightInputPanel from "./UI/HeightInputPanel";
import LayersPanel from "./UI/LayersPanel";

import Axes from "./Editor/Axes";
import BackgroundPlane from "./Editor/BackgroundPlane";
import ShapeRenderer from "./Editor/ShapeRenderer";
import InteractionManager from "./Editor/InteractionManager";
import {
  EditorMode,
  DrawnShape,
  BackgroundImageData,
  Layer,
  DEFAULT_LAYER_ID,
  createDefaultLayers,
  getShapeBoxParams,
} from "./Editor/types";

/* ======= Liczniki autonazw ======= */
let structureCounter = 0;
let entityCounter = 0;

function generateShapeName(type: "rect" | "sphere"): string {
  if (type === "sphere") {
    entityCounter++;
    return `Kamera ${entityCounter}`;
  }
  structureCounter++;
  return `Ściana ${structureCounter}`;
}

/* ======= SceneContent (bez zmian logicznych, dodane filtrowanie) ======= */

interface SceneContentProps {
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

function SceneContent({
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

      {/* Renderujemy TYLKO widoczne kształty */}
      <ShapeRenderer
        shapes={visibleShapes}
        hoveredShapeId={hoveredShapeId}
        activeExtrudeId={activeExtrudeId}
      />

      {/* InteractionManager dostaje WSZYSTKIE shapes do snap/parent,
          ale visibleShapes do hover/interakcji */}
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

/* ======= Główny komponent ======= */

const LAYER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

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

  // --- WARSTWY ---
  const [layers, setLayers] = useState<Layer[]>(createDefaultLayers());
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);

  // --- SKALA PŁÓTNA ---
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);

  const [tempImage, setTempImage] = useState<{
    file: File;
    url: string;
    width: number;
    height: number;
  } | null>(null);

  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isCalibratingRuler, setIsCalibratingRuler] = useState(false);
  const [measuredPixels, setMeasuredPixels] = useState<number>(0);

  /* === Filtrowanie widocznych kształtów === */
  const hiddenLayerIds = new Set(
    layers.filter((l) => !l.visible).map((l) => l.id),
  );
  const visibleShapes = shapes.filter(
    (s) => s.visible && !hiddenLayerIds.has(s.layerId),
  );

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

  /* === Dodawanie kształtów — autonazwa + domyślna warstwa === */
  const handleShapeAdd = (shape: DrawnShape) => {
    const namedShape: DrawnShape = {
      ...shape,
      name: shape.name || generateShapeName(shape.type),
      layerId: shape.layerId || DEFAULT_LAYER_ID,
      visible: true,
    };
    const newShapes = [...shapes, namedShape];
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

  /* === Operacje na warstwach === */
  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l)),
    );
  };

  const handleAddLayer = (name: string) => {
    const colorIndex = layers.length % LAYER_COLORS.length;
    const newLayer: Layer = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      visible: true,
      color: LAYER_COLORS[colorIndex],
    };
    setLayers((prev) => [...prev, newLayer]);
  };

  const handleRemoveLayer = (layerId: string) => {
    if (layerId === DEFAULT_LAYER_ID) return;
    // Przenieś obiekty z usuwanej warstwy do domyślnej
    setShapes((prev) =>
      prev.map((s) =>
        s.layerId === layerId ? { ...s, layerId: DEFAULT_LAYER_ID } : s,
      ),
    );
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
  };

  const handleRenameLayer = (layerId: string, newName: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, name: newName } : l)),
    );
  };

  const handleMoveShapeToLayer = (shapeId: string, targetLayerId: string) => {
    setShapes((prev) =>
      prev.map((s) =>
        s.id === shapeId ? { ...s, layerId: targetLayerId } : s,
      ),
    );
  };

  const handleToggleShapeVisibility = (shapeId: string) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === shapeId ? { ...s, visible: !s.visible } : s)),
    );
  };

  const handleSelectShapeFromPanel = (shapeId: string) => {
    setEditingShapeId(shapeId);
    setMode("EXTRUDE");
  };

  /* === Klawiatura === */
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

  /* === Import obrazu === */
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

  const handleMeasureFromInteraction = (distSceneUnits: number) => {
    if (distSceneUnits < 0.1) return;
    setMeasuredPixels(distSceneUnits);
    setIsCalibratingRuler(true);
    setIsScaleModalOpen(true);
  };

  const handleScaleConfirm = (pixels: number, realWorldMM: number) => {
    if (isCalibratingRuler && backgroundImage) {
      const currentMM = pixels * canvasScale;
      const correctionFactor = realWorldMM / currentMM;

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

    if (!tempImage) return;

    const mmPerPixel = realWorldMM / pixels;
    const sceneUnitsPerPixel = mmPerPixel / canvasScale;

    setBackgroundImage({
      url: tempImage.url,
      width: tempImage.width * sceneUnitsPerPixel,
      height: tempImage.height * sceneUnitsPerPixel,
      originalWidth: tempImage.width,
      originalHeight: tempImage.height,
      scale: sceneUnitsPerPixel,
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

  const handleCanvasScaleChange = (newScale: number) => {
    if (backgroundImage && canvasScale !== newScale) {
      const ratio = canvasScale / newScale;
      setBackgroundImage({
        ...backgroundImage,
        width: backgroundImage.width * ratio,
        height: backgroundImage.height * ratio,
        scale: backgroundImage.scale * ratio,
      });
    }

    if (canvasScale !== newScale) {
      const ratio = canvasScale / newScale;
      setShapes((prev) =>
        prev.map((s) => {
          if (s.type === "sphere") {
            const center = s.center || [0, s.radius || 10, 0];
            return {
              ...s,
              radius: (s.radius || 10) * ratio,
              center: [
                center[0] * ratio,
                center[1] * ratio,
                center[2] * ratio,
              ] as [number, number, number],
            };
          }
          return {
            ...s,
            points: s.points.map(
              (p) =>
                [p[0] * ratio, p[1] * ratio, p[2] * ratio] as [
                  number,
                  number,
                  number,
                ],
            ),
            height: s.height * ratio,
            baseY: (s.baseY || 0) * ratio,
            faceOffset: s.faceOffset ? s.faceOffset * ratio : s.faceOffset,
          };
        }),
      );
    }

    setCanvasScale(newScale);
    setIsCanvasSettingsOpen(false);
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
      if (updates.radius !== undefined) updatedShape.radius = updates.radius;
      if (updates.center !== undefined) updatedShape.center = updates.center;
    } else {
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
        canvasScale={canvasScale}
        onOpenCanvasSettings={() => setIsCanvasSettingsOpen(true)}
        isLayersPanelOpen={isLayersPanelOpen}
        onToggleLayersPanel={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
      />

      <Canvas gl={{ antialias: true }}>
        <SceneContent
          onResetReady={(fn) => {
            resetFunctionRef.current = fn;
          }}
          backgroundImage={backgroundImage}
          mode={mode}
          shapes={shapes}
          visibleShapes={visibleShapes}
          onShapeAdd={handleShapeAdd}
          onShapeUpdate={handleShapeUpdate}
          onCalibrateConfirm={handleMeasureFromInteraction}
          hoveredShapeId={hoveredShapeId}
          setHoveredShapeId={setHoveredShapeId}
          isSnapEnabled={isSnapEnabled}
          editingShapeId={editingShapeId}
          setEditingShapeId={setEditingShapeId}
          activeExtrudeId={activeExtrudeId}
          setActiveExtrudeId={setActiveExtrudeId}
          onShapesCommit={handleShapesCommit}
        />
      </Canvas>

      {backgroundImage && (
        <ImageInfoPanel data={backgroundImage} canvasScale={canvasScale} />
      )}

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

      <CanvasSettingsModal
        isOpen={isCanvasSettingsOpen}
        onClose={() => setIsCanvasSettingsOpen(false)}
        onApply={handleCanvasScaleChange}
        currentCanvasScale={canvasScale}
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
          canvasScale={canvasScale}
        />
      )}

      {/* PANEL WARSTW (prawy sidebar) */}
      <LayersPanel
        isOpen={isLayersPanelOpen}
        onClose={() => setIsLayersPanelOpen(false)}
        layers={layers}
        shapes={shapes}
        onToggleLayerVisibility={handleToggleLayerVisibility}
        onToggleShapeVisibility={handleToggleShapeVisibility}
        onAddLayer={handleAddLayer}
        onRemoveLayer={handleRemoveLayer}
        onRenameLayer={handleRenameLayer}
        onMoveShapeToLayer={handleMoveShapeToLayer}
        onSelectShape={handleSelectShapeFromPanel}
        canvasScale={canvasScale}
        editingShapeId={editingShapeId}
      />

      {mode !== "VIEW" && (
        <div className="absolute top-4 left-24 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded shadow-lg z-20 text-sm font-bold animate-pulse">
          {getModeLabel()}
        </div>
      )}
    </div>
  );
}
