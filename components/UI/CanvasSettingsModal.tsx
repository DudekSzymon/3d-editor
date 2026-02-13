"use client";

import React, { useState, useEffect, useRef } from "react";

interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (canvasScale: number) => void;
  currentCanvasScale: number; // mm per 1 scene unit
}

export default function CanvasSettingsModal({
  isOpen,
  onClose,
  onApply,
  currentCanvasScale,
}: CanvasSettingsModalProps) {
  // Tryb wprowadzania: "direct" = bezpośrednio mm/unit, "ratio" = X px = Y mm
  const [inputMode, setInputMode] = useState<"direct" | "ratio">("direct");
  const [scaleValue, setScaleValue] = useState(currentCanvasScale.toString());
  const [ratioPixels, setRatioPixels] = useState("1");
  const [ratioMM, setRatioMM] = useState(currentCanvasScale.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScaleValue(currentCanvasScale.toString());
      setRatioMM(currentCanvasScale.toString());
      setRatioPixels("1");
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, currentCanvasScale]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let newScale: number;
    if (inputMode === "direct") {
      newScale = parseFloat(scaleValue);
    } else {
      const px = parseFloat(ratioPixels);
      const mm = parseFloat(ratioMM);
      if (!px || !mm || px <= 0) return;
      newScale = mm / px;
    }

    if (!isNaN(newScale) && newScale > 0) {
      onApply(newScale);
    }
  };

  const presets = [
    { label: "1:1", value: 1, desc: "1 unit = 1 mm" },
    { label: "1:2", value: 2, desc: "1 unit = 2 mm" },
    { label: "1:5", value: 5, desc: "1 unit = 5 mm" },
    { label: "1:10", value: 10, desc: "1 unit = 10 mm" },
    { label: "1:100", value: 100, desc: "1 unit = 100 mm" },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-lg font-bold mb-1 text-gray-800">
          Ustawienia Płótna
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Określ ile milimetrów odpowiada 1 jednostce w scenie 3D
        </p>

        {/* Aktualna skala */}
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="text-xs text-blue-600 font-semibold uppercase mb-1">
            Aktualna skala
          </div>
          <div className="text-lg font-mono font-bold text-blue-800">
            1 unit = {currentCanvasScale} mm
          </div>
        </div>

        {/* Presety */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
            Szybkie ustawienia
          </label>
          <div className="flex gap-2 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setScaleValue(preset.value.toString());
                  setRatioMM(preset.value.toString());
                  setRatioPixels("1");
                }}
                className={`px-3 py-1.5 text-xs rounded border transition-all ${
                  parseFloat(scaleValue) === preset.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tryb wprowadzania */}
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode("direct")}
            className={`flex-1 py-1.5 text-xs rounded border transition-all ${
              inputMode === "direct"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Bezpośrednio
          </button>
          <button
            type="button"
            onClick={() => setInputMode("ratio")}
            className={`flex-1 py-1.5 text-xs rounded border transition-all ${
              inputMode === "ratio"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Proporcja px → mm
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {inputMode === "direct" ? (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                1 jednostka sceny =
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="number"
                  min="0.001"
                  step="any"
                  value={scaleValue}
                  onChange={(e) => setScaleValue(e.target.value)}
                  className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-center text-base font-mono font-bold focus:border-blue-500 focus:outline-none text-black"
                />
                <span className="text-sm font-semibold text-gray-600">mm</span>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Piksele
                  </label>
                  <input
                    ref={inputRef}
                    type="number"
                    min="0.001"
                    step="any"
                    value={ratioPixels}
                    onChange={(e) => setRatioPixels(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded px-2 py-2 text-center font-mono font-bold focus:border-blue-500 focus:outline-none text-black"
                  />
                </div>
                <span className="mt-5 font-bold text-gray-500">=</span>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Milimetry
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={ratioMM}
                    onChange={(e) => setRatioMM(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded px-2 py-2 text-center font-mono font-bold focus:border-blue-500 focus:outline-none text-black"
                  />
                </div>
              </div>
              {parseFloat(ratioPixels) > 0 && parseFloat(ratioMM) > 0 && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                  → 1 unit ={" "}
                  {(parseFloat(ratioMM) / parseFloat(ratioPixels)).toFixed(4)}{" "}
                  mm
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded font-semibold"
            >
              Zastosuj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
