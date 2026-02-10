import { ImageInfoPanelData } from "../UI/ImageInfoPanel";

export type EditorMode = "VIEW" | "CALIBRATE" | "DRAW_RECT" | "EXTRUDE";

export type ShapeOrientation = "xz" | "xy" | "yz";

export interface BackgroundImageData extends ImageInfoPanelData {
  url: string;
}

export interface DrawnShape {
  id: string;
  type: "rect";
  points: [number, number, number][]; // 4 narożniki prostokąta bazowego
  height: number; // Wysokość/głębokość wyciągnięcia
  baseY: number; // Dla 'xz': pozycja Y podstawy

  // Rysowanie na ścianach
  parentId?: string; // ID rodzica (jeśli narysowane na innej bryle)
  orientation?: ShapeOrientation; // 'xz' = poziomo, 'xy' = przód/tył, 'yz' = lewo/prawo
  faceOffset?: number; // Pozycja ściany wzdłuż osi normalnej
  faceDirection?: number; // +1 = top/front/right, -1 = bottom/back/left
}

/**
 * Czy kształt-dziecko wyciąga się NA ZEWNĄTRZ rodzica?
 *   height * faceDirection > 0  →  na zewnątrz  →  ADDITION (niezależna bryła)
 *   height * faceDirection < 0  →  do wewnątrz   →  SUBTRACTION (wycięcie CSG)
 *   height == 0                 →  jeszcze nie wyciągnięty
 */
export function isOutwardExtrusion(shape: DrawnShape): boolean {
  if (!shape.parentId) return false;
  const dir = shape.faceDirection ?? 1;
  return shape.height * dir > 0;
}

/**
 * Oblicza parametry geometrii Box dla dowolnej orientacji kształtu.
 */
export function getShapeBoxParams(shape: DrawnShape) {
  const orientation = shape.orientation || "xz";

  if (orientation === "xz") {
    const x1 = shape.points[0][0],
      z1 = shape.points[0][2];
    const x2 = shape.points[2][0],
      z2 = shape.points[2][2];
    const w = Math.abs(x1 - x2);
    const d = Math.abs(z1 - z2);
    const h = Math.abs(shape.height) || 0.01;
    return {
      boxArgs: [w, h, d] as [number, number, number],
      center: {
        x: (x1 + x2) / 2,
        y: shape.baseY + shape.height / 2,
        z: (z1 + z2) / 2,
      },
      width: w,
      depth: d,
      absHeight: h,
    };
  } else if (orientation === "xy") {
    const x1 = shape.points[0][0],
      y1 = shape.points[0][1];
    const x2 = shape.points[2][0],
      y2 = shape.points[2][1];
    const w = Math.abs(x1 - x2);
    const h = Math.abs(y1 - y2);
    const depth = Math.abs(shape.height) || 0.01;
    const fz = shape.faceOffset || 0;
    return {
      boxArgs: [w, h, depth] as [number, number, number],
      center: {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
        z: fz + shape.height / 2,
      },
      width: w,
      depth: h,
      absHeight: depth,
    };
  } else {
    const z1 = shape.points[0][2],
      y1 = shape.points[0][1];
    const z2 = shape.points[2][2],
      y2 = shape.points[2][1];
    const w = Math.abs(z1 - z2);
    const h = Math.abs(y1 - y2);
    const depth = Math.abs(shape.height) || 0.01;
    const fx = shape.faceOffset || 0;
    return {
      boxArgs: [depth, h, w] as [number, number, number],
      center: {
        x: fx + shape.height / 2,
        y: (y1 + y2) / 2,
        z: (z1 + z2) / 2,
      },
      width: w,
      depth: h,
      absHeight: depth,
    };
  }
}
