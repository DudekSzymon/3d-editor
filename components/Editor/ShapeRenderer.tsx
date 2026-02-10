"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { DrawnShape, getShapeBoxParams, isOutwardExtrusion } from "./types";

interface ShapeRendererProps {
  shapes: DrawnShape[];
  hoveredShapeId?: string | null;
}

/**
 * Tworzy Brush CSG z kształtu.
 * @param margin - dodatkowy margines (używany dla wycięć, żeby brush
 *   wystawał poza rodzica i nie zostawiał cienkiego plasterka)
 */
function createBrushFromShape(shape: DrawnShape, margin = 0): Brush {
  const { boxArgs, center } = getShapeBoxParams(shape);

  // Powiększ wymiary prostopadłe do kierunku wyciągania o margines.
  // Kierunek wyciągania zależy od orientacji:
  //   xz → wyciąga wzdłuż Y, więc powiększamy X i Z
  //   xy → wyciąga wzdłuż Z, więc powiększamy X i Y
  //   yz → wyciąga wzdłuż X, więc powiększamy Y i Z
  const orient = shape.orientation || "xz";
  let [bx, by, bz] = boxArgs;

  if (margin > 0) {
    if (orient === "xz") {
      bx += margin * 2;
      bz += margin * 2;
    } else if (orient === "xy") {
      bx += margin * 2;
      by += margin * 2;
    } else {
      by += margin * 2;
      bz += margin * 2;
    }
  }

  const geo = new THREE.BoxGeometry(bx, by, bz);
  const brush = new Brush(geo);
  brush.position.set(center.x, center.y, center.z);
  brush.updateMatrixWorld();
  return brush;
}

/** Obrys 2D na płaszczyźnie kształtu */
function ShapeOutline({ shape, color }: { shape: DrawnShape; color: string }) {
  const orientation = shape.orientation || "xz";
  const baseY = shape.baseY || 0;

  if (orientation === "xz") {
    return (
      <Line
        points={[
          ...shape.points.map((p) => new THREE.Vector3(p[0], baseY, p[2])),
          new THREE.Vector3(shape.points[0][0], baseY, shape.points[0][2]),
        ]}
        color={color}
        lineWidth={2}
        position={[0, 0.05, 0]}
      />
    );
  }
  if (orientation === "xy") {
    const fz = shape.faceOffset || 0;
    return (
      <Line
        points={[
          ...shape.points.map((p) => new THREE.Vector3(p[0], p[1], fz)),
          new THREE.Vector3(shape.points[0][0], shape.points[0][1], fz),
        ]}
        color={color}
        lineWidth={2}
      />
    );
  }
  const fx = shape.faceOffset || 0;
  return (
    <Line
      points={[
        ...shape.points.map((p) => new THREE.Vector3(fx, p[1], p[2])),
        new THREE.Vector3(fx, shape.points[0][1], shape.points[0][2]),
      ]}
      color={color}
      lineWidth={2}
    />
  );
}

/** Renderuje prostą bryłę (box + krawędzie). */
function SolidBox({
  shape,
  isHovered,
  outlineColor,
}: {
  shape: DrawnShape;
  isHovered: boolean;
  outlineColor: string;
}) {
  const { boxArgs, center } = getShapeBoxParams(shape);
  const height = shape.height || 0;
  const is3D = Math.abs(height) > 0.01;

  const color = isHovered ? "#cbd5e1" : "#e5e7eb";

  return (
    <group>
      <ShapeOutline shape={shape} color={outlineColor} />

      {is3D ? (
        <>
          <mesh position={[center.x, center.y, center.z]}>
            <boxGeometry args={boxArgs} />
            <meshStandardMaterial
              color={color}
              roughness={1}
              metalness={0}
              side={THREE.FrontSide}
            />
          </mesh>
          <lineSegments position={[center.x, center.y, center.z]}>
            <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
            <lineBasicMaterial color="#000000" />
          </lineSegments>
        </>
      ) : (
        <mesh position={[center.x, center.y, center.z]}>
          <boxGeometry args={boxArgs} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Renderuje root shape z ewentualnymi wycięciami CSG */
function CSGShape({
  rootShape,
  holeChildren,
  hoveredShapeId,
}: {
  rootShape: DrawnShape;
  holeChildren: DrawnShape[];
  hoveredShapeId?: string | null;
}) {
  const isHovered =
    hoveredShapeId === rootShape.id ||
    holeChildren.some((c) => c.id === hoveredShapeId);

  const { boxArgs, center } = getShapeBoxParams(rootShape);
  const height = rootShape.height || 0;
  const is3D = Math.abs(height) > 0.01;

  const color = isHovered ? "#cbd5e1" : "#e5e7eb";

  // Filtruj wycięcia z prawdziwą wysokością
  const activeCuts = holeChildren.filter((c) => Math.abs(c.height) > 0.01);

  // Klucz do wymuszenia remount przy zmianie ilości wycięć
  const csgKey = `csg-${rootShape.id}-${activeCuts.length}-${activeCuts.map((c) => `${c.id}:${c.height.toFixed(2)}`).join(",")}`;

  const csgGeometry = useMemo(() => {
    if (activeCuts.length === 0 || !is3D) return null;

    // Margines zapobiega zostawianiu cienkiego plasterka na krawędzi
    const CSG_MARGIN = 0.5;

    try {
      const evaluator = new Evaluator();
      let resultBrush = createBrushFromShape(rootShape);

      for (const child of activeCuts) {
        const childBrush = createBrushFromShape(child, CSG_MARGIN);
        resultBrush = evaluator.evaluate(resultBrush, childBrush, SUBTRACTION);
      }
      return resultBrush.geometry;
    } catch (e) {
      console.warn("CSG evaluation failed:", e);
      return null;
    }
  }, [rootShape, activeCuts, is3D]);

  return (
    <group>
      {/* Obrys podstawy root */}
      <ShapeOutline shape={rootShape} color="black" />

      {/* Obrysy wycięć (z height > 0.01) */}
      {holeChildren.map((child) => (
        <ShapeOutline
          key={`outline-${child.id}`}
          shape={child}
          color="#ff4444"
        />
      ))}

      {/* Renderuj z CSG lub normalnie */}
      {csgGeometry && is3D ? (
        <group key={csgKey}>
          <mesh geometry={csgGeometry}>
            <meshStandardMaterial
              color={color}
              roughness={1}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[csgGeometry]} />
            <lineBasicMaterial color="#000000" />
          </lineSegments>
        </group>
      ) : is3D ? (
        <group key={`box-${rootShape.id}`}>
          <mesh position={[center.x, center.y, center.z]}>
            <boxGeometry args={boxArgs} />
            <meshStandardMaterial
              color={color}
              roughness={1}
              metalness={0}
              side={THREE.FrontSide}
            />
          </mesh>
          <lineSegments position={[center.x, center.y, center.z]}>
            <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
            <lineBasicMaterial color="#000000" />
          </lineSegments>
        </group>
      ) : (
        <group key={`flat-${rootShape.id}`}>
          <mesh position={[center.x, center.y, center.z]}>
            <boxGeometry args={boxArgs} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
              roughness={1}
              metalness={0}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function ShapeRenderer({
  shapes,
  hoveredShapeId,
}: ShapeRendererProps) {
  const rootShapes = shapes.filter((s) => !s.parentId);
  const childShapes = shapes.filter((s) => !!s.parentId);

  // Rozdziel dzieci na: wycięcia (inward / nie wyciągnięte) vs bryły (outward)
  const holeChildren: DrawnShape[] = [];
  const additionChildren: DrawnShape[] = [];

  for (const child of childShapes) {
    if (Math.abs(child.height) < 0.01) {
      // Jeszcze nie wyciągnięty — jest tylko obrysem na rodzicu
      holeChildren.push(child);
    } else if (isOutwardExtrusion(child)) {
      // Na zewnątrz = nowa niezależna bryła
      additionChildren.push(child);
    } else {
      // Do wewnątrz = wycięcie CSG
      holeChildren.push(child);
    }
  }

  return (
    <group>
      {/* Root shapes z wycięciami CSG */}
      {rootShapes.map((root) => {
        const myHoles = holeChildren.filter((c) => c.parentId === root.id);
        return (
          <CSGShape
            key={root.id}
            rootShape={root}
            holeChildren={myHoles}
            hoveredShapeId={hoveredShapeId}
          />
        );
      })}

      {/* Addition children = niezależne bryły */}
      {additionChildren.map((child) => (
        <SolidBox
          key={child.id}
          shape={child}
          isHovered={hoveredShapeId === child.id}
          outlineColor="#2266ff"
        />
      ))}
    </group>
  );
}
