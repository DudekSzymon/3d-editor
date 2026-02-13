import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { EditorMode } from "./types";
import { DrawingFaceState } from "./interactionUtils";

interface InteractionOverlaysProps {
  mode: EditorMode;
  snappedPoint: THREE.Vector3 | null;
  isSnapEnabled: boolean;
  heightSnapY: number | null;
  startPoint: THREE.Vector3 | null;
  currentPoint: THREE.Vector3 | null;
  drawingFace: DrawingFaceState | null;
  invisiblePlaneGeo: THREE.PlaneGeometry;
  onPointerMove: () => void;
  onPointerDown: (e: any) => void;
  onPointerUp: (e: any) => void;
}

export default function InteractionOverlays({
  mode,
  snappedPoint,
  isSnapEnabled,
  heightSnapY,
  startPoint,
  currentPoint,
  drawingFace,
  invisiblePlaneGeo,
  onPointerMove,
  onPointerDown,
  onPointerUp,
}: InteractionOverlaysProps) {
  const previewPoints = useMemo(() => {
    if (!startPoint || !currentPoint || mode !== "DRAW_RECT") return null;
    if (drawingFace) {
      const p1 = startPoint;
      const p2 = currentPoint;
      const off = 0.1 * drawingFace.faceDirection;
      if (drawingFace.orientation === "xz") {
        const y = drawingFace.faceOffset + off;
        return [
          [p1.x, y, p1.z],
          [p2.x, y, p1.z],
          [p2.x, y, p2.z],
          [p1.x, y, p2.z],
          [p1.x, y, p1.z],
        ] as [number, number, number][];
      } else if (drawingFace.orientation === "xy") {
        const z = drawingFace.faceOffset + off;
        return [
          [p1.x, p1.y, z],
          [p2.x, p1.y, z],
          [p2.x, p2.y, z],
          [p1.x, p2.y, z],
          [p1.x, p1.y, z],
        ] as [number, number, number][];
      } else {
        const x = drawingFace.faceOffset + off;
        return [
          [x, p1.y, p1.z],
          [x, p1.y, p2.z],
          [x, p2.y, p2.z],
          [x, p2.y, p1.z],
          [x, p1.y, p1.z],
        ] as [number, number, number][];
      }
    }
    return [
      [startPoint.x, 0.5, startPoint.z],
      [currentPoint.x, 0.5, startPoint.z],
      [currentPoint.x, 0.5, currentPoint.z],
      [startPoint.x, 0.5, currentPoint.z],
      [startPoint.x, 0.5, startPoint.z],
    ] as [number, number, number][];
  }, [startPoint, currentPoint, mode, drawingFace]);

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
        visible={false}
        geometry={invisiblePlaneGeo}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <meshBasicMaterial />
      </mesh>

      {mode !== "VIEW" &&
        mode !== "EXTRUDE" &&
        snappedPoint &&
        isSnapEnabled && (
          <mesh position={snappedPoint}>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="magenta" toneMapped={false} />
          </mesh>
        )}

      {mode === "EXTRUDE" && heightSnapY !== null && (
        <group position={[0, heightSnapY, 0]}>
          <gridHelper args={[1000, 10, "magenta", "magenta"]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial
              color="magenta"
              transparent
              opacity={0.05}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Podgląd rysowania PROSTOKĄTA (zostawiamy czerwony/czarny) */}
      {previewPoints && (
        <Line
          points={previewPoints}
          color={drawingFace ? "#ff4444" : "black"}
          lineWidth={3}
        />
      )}

      {/* --- Linia KALIBRACJI (Teraz ŻÓŁTA i GRUBA) --- */}
      {startPoint && currentPoint && mode === "CALIBRATE" && (
        <Line
          points={[startPoint, currentPoint]}
          color="yellow" // Żółty kolor
          lineWidth={8} // Gruba linia (było 2)
          dashed={true}
          dashScale={10}
        />
      )}

      {drawingFace && mode === "DRAW_RECT" && (
        <mesh
          position={
            drawingFace.orientation === "xz"
              ? [
                  0,
                  drawingFace.faceOffset + 0.02 * drawingFace.faceDirection,
                  0,
                ]
              : drawingFace.orientation === "xy"
                ? [
                    0,
                    0,
                    drawingFace.faceOffset + 0.02 * drawingFace.faceDirection,
                  ]
                : [
                    drawingFace.faceOffset + 0.02 * drawingFace.faceDirection,
                    0,
                    0,
                  ]
          }
          rotation={
            drawingFace.orientation === "xz"
              ? [-Math.PI / 2, 0, 0]
              : drawingFace.orientation === "xy"
                ? [0, 0, 0]
                : [0, Math.PI / 2, 0]
          }
        >
          <planeGeometry args={[500, 500]} />
          <meshBasicMaterial
            color="#ff4444"
            transparent
            opacity={0.03}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}
