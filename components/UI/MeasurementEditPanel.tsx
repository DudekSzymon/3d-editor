"use client";

import { useState, useEffect, useRef } from "react";
import { DrawnShape } from "../Editor/types";
import { FaRulerHorizontal, FaTrash } from "react-icons/fa";

interface MeasurementEditPanelProps {
  shape: DrawnShape;
  canvasScale: number;
  onRename: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function MeasurementEditPanel({
  shape,
  canvasScale,
  onRename,
  onDelete,
  onClose,
}: MeasurementEditPanelProps) {
  const [nameValue, setNameValue] = useState(shape.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const cs = canvasScale;
  const start = shape.measureStart || [0, 0, 0];
  const end = shape.measureEnd || [0, 0, 0];
  const distanceMM = (shape.measureDistance || 0) * cs;

  useEffect(() => {
    setNameValue(shape.name);
    setShowDeleteConfirm(false);
  }, [shape.id, shape.name]);

  const formatDistance = (mm: number): string => {
    if (mm >= 1000) return `${(mm / 1000).toFixed(3)} m`;
    return `${mm.toFixed(2)} mm`;
  };

  const handleNameSubmit = () => {
    const trimmed = nameValue.trim();
    if (trimmed !== shape.name) {
      onRename(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit();
      nameInputRef.current?.blur();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="absolute top-20 left-4 bg-white shadow-xl border-2 border-orange-400 rounded-lg p-4 z-50 w-72">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <FaRulerHorizontal className="text-orange-500" size={14} />
          Edycja Wymiaru
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          title="Zamknij (Esc)"
        >
          ✕
        </button>
      </h3>

      {/* Distance */}
      <div className="mb-4 p-3 bg-orange-50 rounded-md border border-orange-200 text-center">
        <div className="text-[10px] text-orange-600 font-semibold uppercase mb-1">
          Odległość
        </div>
        <div className="text-2xl font-mono font-bold text-orange-800">
          {formatDistance(distanceMM)}
        </div>
        {canvasScale !== 1 && (
          <div className="text-[10px] text-gray-400 mt-1">
            Scene units: {(shape.measureDistance || 0).toFixed(2)} · Skala: 1u=
            {cs}mm
          </div>
        )}
      </div>

      {/* Name */}
      <div className="mb-3">
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
          Nazwa
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-800 focus:border-orange-400 focus:outline-none"
          placeholder="Nazwa wymiaru..."
        />
      </div>

      {/* Coordinates */}
      <div className="mb-4 p-2 bg-gray-50 rounded-md border border-gray-200">
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
          Współrzędne (mm)
        </label>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-gray-400 font-semibold">Start:</span>
            <div className="font-mono text-gray-600">
              ({(start[0] * cs).toFixed(1)}, {(start[1] * cs).toFixed(1)},{" "}
              {(start[2] * cs).toFixed(1)})
            </div>
          </div>
          <div>
            <span className="text-gray-400 font-semibold">Koniec:</span>
            <div className="font-mono text-gray-600">
              ({(end[0] * cs).toFixed(1)}, {(end[1] * cs).toFixed(1)},{" "}
              {(end[2] * cs).toFixed(1)})
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-[9px] text-red-400 font-bold">ΔX</div>
            <div className="font-mono text-[10px] text-gray-600">
              {(Math.abs(start[0] - end[0]) * cs).toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-blue-400 font-bold">ΔY</div>
            <div className="font-mono text-[10px] text-gray-600">
              {(Math.abs(start[1] - end[1]) * cs).toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-green-400 font-bold">ΔZ</div>
            <div className="font-mono text-[10px] text-gray-600">
              {(Math.abs(start[2] - end[2]) * cs).toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 pt-3">
        {showDeleteConfirm ? (
          <div className="p-3 bg-red-50 rounded-md border border-red-300">
            <p className="text-xs text-red-700 font-semibold mb-2 text-center">
              Na pewno usunąć ten wymiar?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 text-xs text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded font-semibold"
              >
                Nie
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-2 text-xs text-white bg-red-600 hover:bg-red-700 rounded font-bold"
              >
                Tak, usuń
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <FaTrash size={12} />
            Usuń wymiar
          </button>
        )}
      </div>
    </div>
  );
}
