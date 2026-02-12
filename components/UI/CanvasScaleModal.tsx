import React, { useState, useEffect } from "react";

interface CanvasScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pixels: number, realWorldUnits: number) => void;
  initialPixels?: number;
  title?: string;
}

export default function CanvasScaleModal({
  isOpen,
  onClose,
  onConfirm,
  initialPixels = 1,
  title = "Skala płótna",
}: CanvasScaleModalProps) {
  const [pixels, setPixels] = useState(initialPixels);
  const [units, setUnits] = useState(1);

  // --- TUTAJ JEST ZMIANA ---
  useEffect(() => {
    if (isOpen) {
      // Używamy .toFixed(2), żeby skrócić liczbę do dwóch miejsc po przecinku
      // Funkcja Number() zamienia ten tekst z powrotem na liczbę dla inputa
      setPixels(Number(initialPixels.toFixed(2)));
    }
  }, [isOpen, initialPixels]);
  // -------------------------

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(pixels, units);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-80">
        <h2 className="text-lg font-bold mb-4 text-gray-800">{title}</h2>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 mb-6 text-gray-700">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase">Piksele</label>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={pixels}
                onChange={(e) => setPixels(parseFloat(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 w-24 text-center bg-gray-50"
              />
            </div>

            <span className="mt-5 font-bold">=</span>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase">
                Rzeczywistość
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={units}
                  onChange={(e) => setUnits(parseFloat(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 w-24 text-center"
                  autoFocus
                />
                <span className="text-sm">mm</span>
              </div>
            </div>
          </div>

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
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              Zatwierdź
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
