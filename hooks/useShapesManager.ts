import { useState, useCallback } from "react";
import {
  DrawnShape,
  DEFAULT_LAYER_ID,
  getShapeBoxParams,
} from "../components/Editor/types";

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

export default function useShapesManager() {
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [history, setHistory] = useState<DrawnShape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

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

  const handleToggleShapeVisibility = (shapeId: string) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === shapeId ? { ...s, visible: !s.visible } : s)),
    );
  };

  const handleHeightApply = (
    editingShapeId: string,
    updates: {
      height: number;
      baseY: number;
      newWidth?: number;
      newDepth?: number;
      radius?: number;
      center?: [number, number, number];
    },
  ) => {
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
  };

  /** Przelicza kształty przy zmianie skali płótna */
  const rescaleShapes = (oldScale: number, newScale: number) => {
    if (oldScale === newScale) return;
    const ratio = oldScale / newScale;
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
  };

  /** Przenosi obiekt do innej warstwy */
  const handleMoveShapeToLayer = (shapeId: string, targetLayerId: string) => {
    setShapes((prev) =>
      prev.map((s) =>
        s.id === shapeId ? { ...s, layerId: targetLayerId } : s,
      ),
    );
  };

  /** Przenosi obiekty z usuwanej warstwy do domyślnej */
  const migrateShapesToDefaultLayer = (fromLayerId: string) => {
    setShapes((prev) =>
      prev.map((s) =>
        s.layerId === fromLayerId ? { ...s, layerId: DEFAULT_LAYER_ID } : s,
      ),
    );
  };

  return {
    shapes,
    undo,
    redo,
    handleShapeAdd,
    handleShapeUpdate,
    handleShapeMove,
    handleShapesCommit,
    handleToggleShapeVisibility,
    handleHeightApply,
    rescaleShapes,
    handleMoveShapeToLayer,
    migrateShapesToDefaultLayer,
  };
}
