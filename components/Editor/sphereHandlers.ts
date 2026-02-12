import * as THREE from "three";
import { DrawnShape } from "./types";

/**
 * Tworzy nową kulkę w podanej pozycji
 */
export const createSphere = (
  point: THREE.Vector3,
  radius: number = 10,
): DrawnShape => {
  return {
    id: Math.random().toString(36),
    type: "sphere",
    points: [],
    height: 0,
    baseY: 0,
    radius,
    center: [point.x, point.y, point.z],
  };
};

/**
 * Oblicza nowy promień na podstawie ruchu myszy
 */
export const calculateNewRadius = (
  mouseDownY: number,
  currentY: number,
  initialRadius: number = 10,
  minRadius: number = 1,
): number => {
  const deltaY = (currentY - mouseDownY) * 150;
  return Math.max(minRadius, initialRadius + deltaY);
};

/**
 * Sprawdza czy to kulka (sfera)
 */
export const isSphere = (shape: DrawnShape | undefined): boolean => {
  return shape?.type === "sphere";
};

/**
 * Logika handlePointerDown dla trybu PLACE_SPHERE
 * Zwraca akcję do wykonania
 */
export interface SpherePointerDownResult {
  action: "EDIT" | "CREATE" | "COMMIT" | "CLOSE_PANEL" | "NONE";
  shapeId?: string;
  newSphere?: DrawnShape;
  point?: THREE.Vector3;
}

export const handleSpherePointerDown = (params: {
  editingShapeId: string | null;
  placingSphereId: string | null;
  hoveredId: string | null;
  hoveredShape: DrawnShape | undefined;
  faceHit: { point: THREE.Vector3 } | null;
  rawPoint: THREE.Vector3 | null;
  isSnapEnabled: boolean;
  getSnappedPosition: (point: THREE.Vector3) => { point: THREE.Vector3 };
}): SpherePointerDownResult => {
  const {
    editingShapeId,
    placingSphereId,
    hoveredId,
    hoveredShape,
    faceHit,
    rawPoint,
    isSnapEnabled,
    getSnappedPosition,
  } = params;

  if (editingShapeId) {
    return { action: "CLOSE_PANEL" };
  }

  if (placingSphereId) {
    return { action: "COMMIT" };
  }

  if (hoveredId && hoveredShape && isSphere(hoveredShape)) {
    return { action: "EDIT", shapeId: hoveredId };
  }

  if (faceHit) {
    const finalPoint = isSnapEnabled
      ? getSnappedPosition(faceHit.point).point
      : faceHit.point.clone();

    return {
      action: "CREATE",
      newSphere: createSphere(finalPoint),
      point: finalPoint,
    };
  }

  if (rawPoint) {
    const finalPoint = isSnapEnabled
      ? getSnappedPosition(rawPoint).point
      : rawPoint.clone();

    return {
      action: "CREATE",
      newSphere: createSphere(finalPoint),
      point: finalPoint,
    };
  }

  return { action: "NONE" };
};

export interface SpherePointerUpResult {
  action: "COMMIT" | "OPEN_EDIT_PANEL" | "NONE";
  shapeId?: string;
}

export const handleSpherePointerUp = (params: {
  placingSphereId: string | null;
  hasMoved: boolean;
}): SpherePointerUpResult => {
  const { placingSphereId, hasMoved } = params;

  if (!placingSphereId) {
    return { action: "NONE" };
  }

  if (hasMoved) {
    return { action: "COMMIT" };
  }

  return { action: "OPEN_EDIT_PANEL", shapeId: placingSphereId };
};
