import React from "react";

// Eksportujemy ten interfejs, żeby Canvas3D wiedział, jakie dane przekazać
export interface ImageInfoPanelData {
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  scale: number;
}

interface ImageInfoPanelProps {
  data: ImageInfoPanelData;
}

export default function ImageInfoPanel({ data }: ImageInfoPanelProps) {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-300 shadow-lg rounded-full px-6 py-3 flex items-center gap-6 text-sm text-gray-700 pointer-events-none select-none z-10">
      {/* Sekcja: Wymiary oryginału */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 uppercase font-semibold">
          Oryginał (px)
        </span>
        <span className="font-mono font-bold text-black">
          {data.originalWidth} <span className="text-gray-400">x</span>{" "}
          {data.originalHeight}
        </span>
      </div>

      {/* Separator */}
      <div className="h-8 w-px bg-gray-300"></div>

      {/* Sekcja: Wymiary w scenie */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 uppercase font-semibold">
          Scena (mm)
        </span>
        <span className="font-mono font-bold text-black">
          {data.width.toFixed(0)} <span className="text-gray-400">x</span>{" "}
          {data.height.toFixed(0)}
        </span>
      </div>

      {/* Separator */}
      <div className="h-8 w-px bg-gray-300"></div>

      {/* Sekcja: Skala */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-400 uppercase font-semibold">
          Skala
        </span>
        <span className="font-medium text-blue-600">
          1 px = {data.scale.toFixed(3)} mm
        </span>
      </div>
    </div>
  );
}
