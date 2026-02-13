import { ImageInfoPanelData } from "../UI/ImageInfoPanel";

export type EditorMode =
  | "VIEW"
  | "CALIBRATE"
  | "DRAW_RECT"
  | "EXTRUDE"
  | "PLACE_SPHERE";

export type ShapeOrientation = "xz" | "xy" | "yz";

export interface BackgroundImageData extends ImageInfoPanelData {
  url: string;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  color: string; // kolor identyfikacyjny warstwy
}

export const DEFAULT_LAYER_ID = "default";

export function createDefaultLayers(): Layer[] {
  return [
    {
      id: DEFAULT_LAYER_ID,
      name: "Podstawowa",
      visible: true,
      color: "#3b82f6",
    },
  ];
}

export interface DrawnShape {
  id: string;
  type: "rect" | "sphere";
  name: string; // nazwa obiektu (np. "Ściana 1", "Kamera 2")
  layerId: string; // ID warstwy, domyślnie DEFAULT_LAYER_ID
  visible: boolean; // widoczność pojedynczego obiektu
  points: [number, number, number][]; // 4 narożniki prostokąta bazowego (tylko dla rect)
  height: number; // Wysokość/głębokość wyciągnięcia (dla rect)
  baseY: number; // Dla 'xz': pozycja Y podstawy (dla rect)

  // Parametry dla sfery
  radius?: number; // Promień kuli
  center?: [number, number, number]; // Środek kuli [x, y, z]

  // Rysowanie na ścianach
  parentId?: string; // ID rodzica (jeśli narysowane na innej bryle)
  orientation?: ShapeOrientation; // 'xz' = poziomo, 'xy' = przód/tył, 'yz' = lewo/prawo
  faceOffset?: number; // Pozycja ściany wzdłuż osi normalnej
  faceDirection?: number; // +1 = top/front/right, -1 = bottom/back/left
}

export function isOutwardExtrusion(shape: DrawnShape): boolean {
  if (!shape.parentId) return false;
  const dir = shape.faceDirection ?? 1;
  return shape.height * dir > 0;
}

export function getShapeBoxParams(shape: DrawnShape) {
  if (shape.type === "sphere") {
    const r = shape.radius || 10;
    const center = shape.center || [0, r, 0];
    return {
      boxArgs: [r * 2, r * 2, r * 2] as [number, number, number],
      center: {
        x: center[0],
        y: center[1],
        z: center[2],
      },
      width: r * 2,
      depth: r * 2,
      absHeight: r * 2,
    };
  }

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
