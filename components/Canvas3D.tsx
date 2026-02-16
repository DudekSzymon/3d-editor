"use client";

import { Canvas } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";

import Toolbar from "./UI/Toolbar";
import ImageInfoPanel from "./UI/ImageInfoPanel";
import CanvasScaleModal from "./UI/CanvasScaleModal";
import CanvasSettingsModal from "./UI/CanvasSettingsModal";
import HeightInputPanel from "./UI/HeightInputPanel";
import LayersPanel from "./UI/LayersPanel";
import SceneContent from "./Editor/SceneContent";

import { EditorMode } from "./Editor/types";
import useShapesManager from "../hooks/useShapesManager";
import useLayersManager from "../hooks/useLayersManager";
import useImageScale from "../hooks/useImageScale";

export default function Canvas3D() {
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const [mode, setMode] = useState<EditorMode>("VIEW");
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  const [activeExtrudeId, setActiveExtrudeId] = useState<string | null>(null);

  /* === Hooki === */
  const shapesManager = useShapesManager();
  const layersManager = useLayersManager(
    shapesManager.migrateShapesToDefaultLayer,
  );
  const imageScale = useImageScale(1, setMode);

  /* === Widoczność === */
  const visibleShapes = shapesManager.shapes.filter(
    (s) => s.visible && !layersManager.hiddenLayerIds.has(s.layerId),
  );

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
        shapesManager.undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        e.preventDefault();
        shapesManager.redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shapesManager.undo, shapesManager.redo]);

  /* === Handlery edycji === */
  const handleHeightApply = (updates: {
    height: number;
    baseY: number;
    newWidth?: number;
    newDepth?: number;
    radius?: number;
    center?: [number, number, number];
  }) => {
    if (!editingShapeId) return;
    shapesManager.handleHeightApply(editingShapeId, updates);
    setEditingShapeId(null);
  };

  const handleSelectShapeFromPanel = (shapeId: string) => {
    const shape = shapesManager.shapes.find((s) => s.id === shapeId);
    if (shape?.type === "measurement") {
      // Wymiary nie mają panelu edycji — po prostu zaznacz
      setEditingShapeId(shapeId);
      return;
    }
    setEditingShapeId(shapeId);
    setMode("EXTRUDE");
  };

  const editingShape = editingShapeId
    ? shapesManager.shapes.find((s) => s.id === editingShapeId)
    : null;

  /* === Label trybu === */
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
      case "MEASURE":
        return "WYMIAROWANIE: Kliknij punkt początkowy, potem punkt końcowy — wymiar zostanie na płótnie";
      default:
        return "";
    }
  };

  return (
    <div className="w-screen h-screen bg-white relative select-none">
      <Toolbar
        currentMode={mode}
        setMode={setMode}
        onResetView={() => resetFunctionRef.current?.()}
        onImageSelect={imageScale.handleImageSelect}
        isSnapEnabled={isSnapEnabled}
        onToggleSnap={() => setIsSnapEnabled(!isSnapEnabled)}
        canvasScale={imageScale.canvasScale}
        onOpenCanvasSettings={() => imageScale.setIsCanvasSettingsOpen(true)}
        isLayersPanelOpen={layersManager.isLayersPanelOpen}
        onToggleLayersPanel={() =>
          layersManager.setIsLayersPanelOpen(!layersManager.isLayersPanelOpen)
        }
      />

      <Canvas gl={{ antialias: true }}>
        <SceneContent
          onResetReady={(fn) => {
            resetFunctionRef.current = fn;
          }}
          backgroundImage={imageScale.backgroundImage}
          mode={mode}
          shapes={shapesManager.shapes}
          visibleShapes={visibleShapes}
          onShapeAdd={shapesManager.handleShapeAdd}
          onShapeUpdate={shapesManager.handleShapeUpdate}
          onCalibrateConfirm={imageScale.handleMeasureFromInteraction}
          hoveredShapeId={hoveredShapeId}
          setHoveredShapeId={setHoveredShapeId}
          isSnapEnabled={isSnapEnabled}
          editingShapeId={editingShapeId}
          setEditingShapeId={setEditingShapeId}
          activeExtrudeId={activeExtrudeId}
          setActiveExtrudeId={setActiveExtrudeId}
          onShapesCommit={shapesManager.handleShapesCommit}
          canvasScale={imageScale.canvasScale}
        />
      </Canvas>

      {imageScale.backgroundImage && (
        <ImageInfoPanel
          data={imageScale.backgroundImage}
          canvasScale={imageScale.canvasScale}
        />
      )}

      <CanvasScaleModal
        key={imageScale.isCalibratingRuler ? "ruler" : "import"}
        isOpen={imageScale.isScaleModalOpen}
        onClose={imageScale.handleModalClose}
        onConfirm={imageScale.handleScaleConfirm}
        // @ts-ignore
        initialPixels={
          imageScale.isCalibratingRuler ? imageScale.measuredPixels : 1
        }
        // @ts-ignore
        title={
          imageScale.isCalibratingRuler ? "Kalibracja wymiaru" : "Skala płótna"
        }
      />

      <CanvasSettingsModal
        isOpen={imageScale.isCanvasSettingsOpen}
        onClose={() => imageScale.setIsCanvasSettingsOpen(false)}
        onApply={(newScale) =>
          imageScale.handleCanvasScaleChange(
            newScale,
            shapesManager.rescaleShapes,
          )
        }
        currentCanvasScale={imageScale.canvasScale}
      />

      {editingShape && editingShape.type !== "measurement" && (
        <HeightInputPanel
          currentHeight={editingShape.height}
          currentBaseY={editingShape.baseY || 0}
          shape={editingShape}
          onApply={handleHeightApply}
          onCancel={() => setEditingShapeId(null)}
          orientation={editingShape.orientation}
          faceDirection={editingShape.faceDirection}
          isChild={!!editingShape.parentId}
          onMove={(dx, dy, dz) =>
            shapesManager.handleShapeMove(editingShape.id, dx, dy, dz)
          }
          canvasScale={imageScale.canvasScale}
        />
      )}

      <LayersPanel
        isOpen={layersManager.isLayersPanelOpen}
        onClose={() => layersManager.setIsLayersPanelOpen(false)}
        layers={layersManager.layers}
        shapes={shapesManager.shapes}
        onToggleLayerVisibility={layersManager.handleToggleLayerVisibility}
        onToggleShapeVisibility={shapesManager.handleToggleShapeVisibility}
        onAddLayer={layersManager.handleAddLayer}
        onRemoveLayer={layersManager.handleRemoveLayer}
        onRenameLayer={layersManager.handleRenameLayer}
        onMoveShapeToLayer={shapesManager.handleMoveShapeToLayer}
        onSelectShape={handleSelectShapeFromPanel}
        canvasScale={imageScale.canvasScale}
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
