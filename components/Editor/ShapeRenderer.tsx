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
        const is3D = Math.abs(height) > 0.01;
        const isNegative = height < 0;
        const centerY = height / 2;
        const isHovered = hoveredShapeId === shape.id;

        // --- STYLIZACJA: CZYSTA ARCHITEKTURA ---

        // Wypełnienie: Jasny szary (jak papier/model gipsowy)
        // Przy najechaniu: Lekko ciemniejszy szary
        const baseColor = "#e5e7eb"; // Tailwind Gray 200
        const hoverColor = "#cbd5e1"; // Tailwind Slate 300
        const finalColor = isHovered ? hoverColor : baseColor;

        // Krawędzie: Zawsze czarne, ostre i wyraźne
        const edgeColor = "#000000";
        const edgeOpacity = 1.0; // Pełna widoczność

        const materialProps = {
          color: finalColor,
          transparent: !is3D,
          opacity: is3D ? 1.0 : 0.2, // Płaskie są półprzezroczyste, 3D pełne
          side: THREE.DoubleSide,
          roughness: 1.0,
          metalness: 0.0,
        };

        return (
          <group key={shape.id}>
            {/* OBRYS PODSTAWY (Na poziomie 0) */}
            <Line
              points={[
                ...shape.points.map((p) => new THREE.Vector3(...p)),
                new THREE.Vector3(...shape.points[0]),
              ]}
              color="black"
              lineWidth={2}
              position={[0, 0.05, 0]}
            />

            {/* BRYŁA */}
            <mesh position={[centerX, centerY, centerZ]}>
              <boxGeometry args={[width, Math.abs(height) || 0.01, depth]} />

              {/* Ścianki */}
              <meshStandardMaterial attach="material-0" {...materialProps} />
              <meshStandardMaterial attach="material-1" {...materialProps} />

              {/* Góra - ukryta jeśli to dziura (isNegative) */}
              <meshStandardMaterial
                attach="material-2"
                {...materialProps}
                visible={!isNegative}
              />

              {/* Dół, Przód, Tył */}
              <meshStandardMaterial attach="material-3" {...materialProps} />
              <meshStandardMaterial attach="material-4" {...materialProps} />
              <meshStandardMaterial attach="material-5" {...materialProps} />
            </mesh>

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
