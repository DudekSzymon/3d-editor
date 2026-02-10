import { ImageInfoPanelData } from "../UI/ImageInfoPanel";

export type EditorMode = "VIEW" | "CALIBRATE" | "DRAW_RECT" | "EXTRUDE";

export interface BackgroundImageData extends ImageInfoPanelData {
  url: string;
}

export interface DrawnShape {
  id: string;
  type: "rect";
  points: [number, number, number][]; // Tablica punktów [x, y, z]
  height: number; // NOWE: Wysokość bryły (może być ujemna)
}
