"use client";

import * as THREE from "three";
import { Line } from "@react-three/drei";
import { DrawnShape } from "./types";

interface ShapeRendererProps {
  shapes: DrawnShape[];
  hoveredShapeId?: string | null;
}

export default function ShapeRenderer({
  shapes,
  hoveredShapeId,
}: ShapeRendererProps) {
  return (
    <group>
      {shapes.map((shape) => {
        const x1 = shape.points[0][0];
        const z1 = shape.points[0][2];
        const x2 = shape.points[2][0];
        const z2 = shape.points[2][2];

        const width = Math.abs(x1 - x2);
        const depth = Math.abs(z1 - z2);
        const centerX = (x1 + x2) / 2;
        const centerZ = (z1 + z2) / 2;

        const height = shape.height || 0;
        const baseY = shape.baseY || 0; // NOWE: Pozycja podstawy
        const is3D = Math.abs(height) > 0.01;
        const isNegative = height < 0;
        const centerY = baseY + height / 2; // Środek bryły = baseY + połowa wysokości
        const isHovered = hoveredShapeId === shape.id;

        const baseColor = "#e5e7eb";
        const hoverColor = "#cbd5e1";
        const finalColor = isHovered ? hoverColor : baseColor;

        const edgeColor = "#000000";
        const edgeOpacity = 1.0;

        const materialProps = {
          color: finalColor,
          transparent: !is3D,
          opacity: is3D ? 1.0 : 0.2,
          side: THREE.DoubleSide,
          roughness: 1.0,
          metalness: 0.0,
        };

        return (
          <group key={shape.id}>
            {/* OBRYS PODSTAWY (Na poziomie baseY) */}
            <Line
              points={[
                ...shape.points.map(
                  (p) => new THREE.Vector3(p[0], baseY, p[2]),
                ),
                new THREE.Vector3(
                  shape.points[0][0],
                  baseY,
                  shape.points[0][2],
                ),
              ]}
              color="black"
              lineWidth={2}
              position={[0, 0.05, 0]}
            />

            {/* BRYŁA */}
            <mesh position={[centerX, centerY, centerZ]}>
              <boxGeometry args={[width, Math.abs(height) || 0.01, depth]} />

              <meshStandardMaterial attach="material-0" {...materialProps} />
              <meshStandardMaterial attach="material-1" {...materialProps} />

              <meshStandardMaterial
                attach="material-2"
                {...materialProps}
                visible={!isNegative}
              />

              <meshStandardMaterial attach="material-3" {...materialProps} />
              <meshStandardMaterial attach="material-4" {...materialProps} />
              <meshStandardMaterial attach="material-5" {...materialProps} />
            </mesh>

            {/* WYRAŹNE CZARNE KRAWĘDZIE 3D */}
            {is3D && (
              <lineSegments position={[centerX, centerY, centerZ]}>
                <edgesGeometry
                  args={[new THREE.BoxGeometry(width, Math.abs(height), depth)]}
                />
                <lineBasicMaterial
                  color={edgeColor}
                  linewidth={1}
                  opacity={edgeOpacity}
                  transparent={false}
                />
              </lineSegments>
            )}
          </group>
        );
      })}
    </group>
  );
}
