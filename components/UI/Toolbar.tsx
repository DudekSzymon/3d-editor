import React, { useRef } from "react";
import {
  FaMousePointer,
  FaRulerCombined,
  FaVectorSquare,
  FaImage,
  FaCompressArrowsAlt,
  FaCube,
  FaCircle,
  FaCog,
  FaLayerGroup,
  FaRulerHorizontal,
} from "react-icons/fa";
import { EditorMode } from "../Editor/types";

interface ToolbarProps {
  currentMode: EditorMode;
  setMode: (mode: EditorMode) => void;
  onResetView: () => void;
  onImageSelect: (file: File) => void;
  isSnapEnabled: boolean;
  onToggleSnap: () => void;
  canvasScale: number;
  onOpenCanvasSettings: () => void;
  isLayersPanelOpen: boolean;
  onToggleLayersPanel: () => void;
}

export default function Toolbar({
  currentMode,
  setMode,
  onResetView,
  onImageSelect,
  isSnapEnabled,
  onToggleSnap,
  canvasScale,
  onOpenCanvasSettings,
  isLayersPanelOpen,
  onToggleLayersPanel,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
    }
    if (e.target) e.target.value = "";
  };

  const tools = [
    { id: "VIEW", icon: FaMousePointer, label: "Widok" },
    { id: "DRAW_RECT", icon: FaVectorSquare, label: "Rysuj" },
    { id: "EXTRUDE", icon: FaCube, label: "Wyciągnij" },
    { id: "PLACE_SPHERE", icon: FaCircle, label: "Obiekt" },
    { id: "MEASURE", icon: FaRulerHorizontal, label: "Wymiar" },
    { id: "CALIBRATE", icon: FaRulerCombined, label: "Kalibruj" },
  ] as const;

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 bg-white shadow-lg border border-gray-200 rounded-lg p-2 z-50">
      {/* SEKCJA NARZĘDZI */}
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setMode(tool.id as EditorMode)}
          title={tool.label}
          className={`
            flex flex-col items-center justify-center w-12 h-12 rounded transition-all
            ${
              currentMode === tool.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }
          `}
        >
          <tool.icon size={18} className="mb-1" />
          <span className="text-[9px] font-medium">{tool.label}</span>
        </button>
      ))}

      <div className="w-full h-px bg-gray-200 my-1"></div>

      {/* PRZYCISK SNAP */}
      <button
        onClick={onToggleSnap}
        title={isSnapEnabled ? "Wyłącz Snapowanie" : "Włącz Snapowanie"}
        className={`
          flex flex-col items-center justify-center w-12 h-12 rounded transition-all
          ${
            isSnapEnabled
              ? "bg-green-600 text-white shadow-sm"
              : "text-gray-400 hover:bg-gray-100"
          }
        `}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-1"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M3 12h2m14 0h2M12 3v2m0 14v2" />
        </svg>
        <span className="text-[9px] font-medium">Snap</span>
      </button>

      <div className="w-full h-px bg-gray-200 my-1"></div>

      {/* PRZYCISK WARSTW */}
      <button
        onClick={onToggleLayersPanel}
        title="Panel warstw"
        className={`
          flex flex-col items-center justify-center w-12 h-12 rounded transition-all
          ${
            isLayersPanelOpen
              ? "bg-purple-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }
        `}
      >
        <FaLayerGroup size={18} className="mb-1" />
        <span className="text-[9px] font-medium">Warstwy</span>
      </button>

      {/* USTAWIENIA PŁÓTNA */}
      <button
        onClick={onOpenCanvasSettings}
        title={`Skala płótna: 1 unit = ${canvasScale} mm`}
        className="flex flex-col items-center justify-center w-12 h-12 rounded text-gray-600 hover:bg-gray-100 transition-all relative"
      >
        <FaCog size={18} className="mb-1" />
        <span className="text-[9px] font-medium">Skala</span>
        {canvasScale !== 1 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[7px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {canvasScale <= 99 ? `${canvasScale}` : "!"}
          </span>
        )}
      </button>

      {/* SEKCJA AKCJI */}
      <button
        onClick={handleImportClick}
        title="Importuj Podkład"
        className="flex flex-col items-center justify-center w-12 h-12 rounded text-gray-600 hover:bg-gray-100 transition-all"
      >
        <FaImage size={18} className="mb-1" />
        <span className="text-[9px] font-medium">Import</span>
      </button>

      <button
        onClick={onResetView}
        title="Resetuj Widok"
        className="flex flex-col items-center justify-center w-12 h-12 rounded text-gray-600 hover:bg-gray-100 transition-all"
      >
        <FaCompressArrowsAlt size={18} className="mb-1" />
        <span className="text-[9px] font-medium">Reset</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
