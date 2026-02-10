import React, { useRef } from "react";
import {
  FaMousePointer,
  FaRulerCombined,
  FaVectorSquare,
  FaImage,
  FaCompressArrowsAlt,
  FaCube, // Ikona dla Extrude
} from "react-icons/fa";
import { EditorMode } from "../Editor/types";

interface ToolbarProps {
  currentMode: EditorMode;
  setMode: (mode: EditorMode) => void;
  onResetView: () => void;
  onImageSelect: (file: File) => void;
}

export default function Toolbar({
  currentMode,
  setMode,
  onResetView,
  onImageSelect,
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
    { id: "CALIBRATE", icon: FaRulerCombined, label: "Kalibruj" },
    { id: "DRAW_RECT", icon: FaVectorSquare, label: "Rysuj" },
    { id: "EXTRUDE", icon: FaCube, label: "Wyciągnij" }, // NOWY PRZYCISK
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
