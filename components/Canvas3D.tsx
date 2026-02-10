"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  Line,
  PerspectiveCamera,
} from "@react-three/drei";
import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import ResetViewButton from "./UI/ResetViewButton";
import ImportImageButton from "./UI/ImportImageButton";
import CanvasScaleModal from "./UI/CanvasScaleModal";
import ImageInfoPanel, { ImageInfoPanelData } from "./UI/ImageInfoPanel";

interface BackgroundImageData extends ImageInfoPanelData {
  url: string;
}

function SketchUpAxes() {
  const length = 5000;
  const mainLineWidth = 6;
  const dashedLineWidth = 3;

  const dashProps = {
    dashed: true,
    dashScale: 1,
    dashSize: 60,
    gapSize: 30,
  };

  return (
    <group>
      {/* OŚ X (Czerwona) */}
      <Line
        points={[
          [0, 0, 0],
          [length, 0, 0],
        ]}
        color="#ff0000"
        lineWidth={mainLineWidth}
      />
      <group rotation={[0, Math.PI, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [length, 0, 0],
          ]}
          color="#ff0000"
          lineWidth={dashedLineWidth}
          {...dashProps}
        />
      </group>

      {/* OŚ Y (Zielona) */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, -length],
        ]}
        color="#00ff00"
        lineWidth={mainLineWidth}
      />
      <Line
        points={[
          [0, 0, 0],
          [0, 0, length],
        ]}
        color="#00ff00"
        lineWidth={dashedLineWidth}
        {...dashProps}
      />

      {/* OŚ Z (Niebieska) */}
      <Line
        points={[
          [0, 0, 0],
          [0, length, 0],
        ]}
        color="#0000ff"
        lineWidth={mainLineWidth}
      />
      <group rotation={[Math.PI, 0, 0]}>
        <Line
          points={[
            [0, 0, 0],
            [0, length, 0],
          ]}
          color="#0000ff"
          lineWidth={dashedLineWidth}
          {...dashProps}
        />
      </group>
    </group>
  );
}

// --- Komponent tła (Blueprint) ---
function BackgroundImage({ data }: { data: BackgroundImageData }) {
  const texture = useLoader(THREE.TextureLoader, data.url);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[data.width, data.height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneContent({
  onResetReady,
  backgroundImage,
}: {
  onResetReady: (fn: () => void) => void;
  backgroundImage: BackgroundImageData | null;
}) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const resetView = () => {
      camera.position.set(100, 150, 100);
      if (controls) {
        // @ts-ignore
        controls.target.set(0, 0, 0);
        // @ts-ignore
        controls.update();
      }
    };
    onResetReady(resetView);
  }, [controls, camera, onResetReady]);

  return (
    <>
      <color attach="background" args={["#ffffff"]} />

      <PerspectiveCamera
        makeDefault
        position={[100, 150, 100]}
        fov={45}
        near={0.1}
        far={100000}
      />
      <ambientLight intensity={0.8} />
      <directionalLight position={[50, 100, 50]} intensity={1} />

      <Grid
        infiniteGrid
        cellSize={10}
        cellColor="#e5e5e5"
        sectionSize={100}
        sectionColor="#d1d1d1"
        fadeDistance={2000}
        fadeStrength={1}
        cellThickness={0.5}
        sectionThickness={1}
        position={[0, -0.01, 0]}
      />

      <SketchUpAxes />

      {backgroundImage && <BackgroundImage data={backgroundImage} />}

      <OrbitControls
        makeDefault
        zoomToCursor={true}
        enableDamping={true}
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2}
      />

      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube
          color="white"
          strokeColor="gray"
          textColor="black"
          opacity={0.8}
        />
      </GizmoHelper>
    </>
  );
}

// --- Główny Komponent ---
export default function Canvas3D() {
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const [tempImage, setTempImage] = useState<{
    file: File;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] =
    useState<BackgroundImageData | null>(null);

  const handleResetReady = useCallback((fn: () => void) => {
    resetFunctionRef.current = fn;
  }, []);

  const handleReset = () => {
    if (resetFunctionRef.current) resetFunctionRef.current();
  };

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

  const handleScaleConfirm = (pixels: number, realWorldUnits: number) => {
    if (!tempImage) return;
    const scaleFactor = realWorldUnits / pixels;

    setBackgroundImage({
      url: tempImage.url,
      width: tempImage.width * scaleFactor,
      height: tempImage.height * scaleFactor,
      originalWidth: tempImage.width,
      originalHeight: tempImage.height,
      scale: scaleFactor,
    });

    setIsScaleModalOpen(false);
    setTempImage(null);
  };

  const handleModalClose = () => {
    setIsScaleModalOpen(false);
    if (tempImage) {
      URL.revokeObjectURL(tempImage.url);
      setTempImage(null);
    }
  };

  return (
    <div className="w-screen h-screen bg-white relative">
      <Canvas gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <SceneContent
          onResetReady={handleResetReady}
          backgroundImage={backgroundImage}
        />
      </Canvas>

      <ResetViewButton onReset={handleReset} />
      <ImportImageButton onImageSelect={handleImageSelect} />

      {backgroundImage && <ImageInfoPanel data={backgroundImage} />}

      <CanvasScaleModal
        isOpen={isScaleModalOpen}
        onClose={handleModalClose}
        onConfirm={handleScaleConfirm}
      />
    </div>
  );
}
