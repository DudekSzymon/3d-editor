import { useState } from "react";
import { BackgroundImageData, EditorMode } from "../components/Editor/types";

export default function useImageScale(
  canvasScale: number,
  setMode: (mode: EditorMode) => void,
) {
  const [backgroundImage, setBackgroundImage] =
    useState<BackgroundImageData | null>(null);
  const [canvasScaleState, setCanvasScaleState] = useState<number>(canvasScale);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isCalibratingRuler, setIsCalibratingRuler] = useState(false);
  const [measuredPixels, setMeasuredPixels] = useState<number>(0);

  const [tempImage, setTempImage] = useState<{
    file: File;
    url: string;
    width: number;
    height: number;
  } | null>(null);

  const handleImageSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setTempImage({
        file,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setIsScaleModalOpen(true);
    };
    img.src = url;
  };

  const handleMeasureFromInteraction = (distSceneUnits: number) => {
    if (distSceneUnits < 0.1) return;
    setMeasuredPixels(distSceneUnits);
    setIsCalibratingRuler(true);
    setIsScaleModalOpen(true);
  };

  const handleScaleConfirm = (pixels: number, realWorldMM: number) => {
    if (isCalibratingRuler && backgroundImage) {
      const currentMM = pixels * canvasScaleState;
      const correctionFactor = realWorldMM / currentMM;

      setBackgroundImage({
        ...backgroundImage,
        scale: backgroundImage.scale * correctionFactor,
        width: backgroundImage.width * correctionFactor,
        height: backgroundImage.height * correctionFactor,
      });

      setIsScaleModalOpen(false);
      setIsCalibratingRuler(false);
      setMode("VIEW");
      return;
    }

    if (!tempImage) return;

    const mmPerPixel = realWorldMM / pixels;
    const sceneUnitsPerPixel = mmPerPixel / canvasScaleState;

    setBackgroundImage({
      url: tempImage.url,
      width: tempImage.width * sceneUnitsPerPixel,
      height: tempImage.height * sceneUnitsPerPixel,
      originalWidth: tempImage.width,
      originalHeight: tempImage.height,
      scale: sceneUnitsPerPixel,
    });
    setIsScaleModalOpen(false);
    setTempImage(null);
    setMode("VIEW");
  };

  const handleModalClose = () => {
    setIsScaleModalOpen(false);
    setIsCalibratingRuler(false);
    if (tempImage) {
      URL.revokeObjectURL(tempImage.url);
      setTempImage(null);
    }
  };

  /** Zmiana skali płótna — przelicza obrazek. Shapes przelicza osobno shapesManager. */
  const handleCanvasScaleChange = (
    newScale: number,
    onRescaleShapes: (oldScale: number, newScale: number) => void,
  ) => {
    if (backgroundImage && canvasScaleState !== newScale) {
      const ratio = canvasScaleState / newScale;
      setBackgroundImage({
        ...backgroundImage,
        width: backgroundImage.width * ratio,
        height: backgroundImage.height * ratio,
        scale: backgroundImage.scale * ratio,
      });
    }

    onRescaleShapes(canvasScaleState, newScale);
    setCanvasScaleState(newScale);
    setIsCanvasSettingsOpen(false);
  };

  return {
    backgroundImage,
    canvasScale: canvasScaleState,
    isCanvasSettingsOpen,
    setIsCanvasSettingsOpen,
    isScaleModalOpen,
    isCalibratingRuler,
    measuredPixels,
    handleImageSelect,
    handleMeasureFromInteraction,
    handleScaleConfirm,
    handleModalClose,
    handleCanvasScaleChange,
  };
}
