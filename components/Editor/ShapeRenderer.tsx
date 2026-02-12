"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { DrawnShape, getShapeBoxParams, isOutwardExtrusion } from "./types";

interface ShapeRendererProps {
  shapes: DrawnShape[];
  hoveredShapeId?: string | null;
  activeExtrudeId?: string | null;
}

const CSG_OVERLAP = 2.0;

function createBrushFromShape(shape: DrawnShape, isHole: boolean): Brush {
  const { boxArgs, center } = getShapeBoxParams(shape);
  const orient = shape.orientation || "xz";
  const faceDir = shape.faceDirection ?? 1;

  let [bx, by, bz] = boxArgs;
  let { x, y, z } = center;

  if (isHole) {
    const m = 0.5;
    if (orient === "xz") {
      bx += m * 2;
      bz += m * 2;
    } else if (orient === "xy") {
      bx += m * 2;
      by += m * 2;
    } else {
      by += m * 2;
      bz += m * 2;
    }

    if (orient === "xz") {
      by += CSG_OVERLAP;
      y += (CSG_OVERLAP / 2) * faceDir;
    } else if (orient === "xy") {
      bz += CSG_OVERLAP;
      z += (CSG_OVERLAP / 2) * faceDir;
    } else {
      bx += CSG_OVERLAP;
      x += (CSG_OVERLAP / 2) * faceDir;
    }
  }

  const geo = new THREE.BoxGeometry(bx, by, bz);
  const brush = new Brush(geo);
  brush.position.set(x, y, z);
  brush.updateMatrixWorld();
  return brush;
}

function ShapeOutline({
  shape,
  color,
  lineWidth = 2,
}: {
  shape: DrawnShape;
  color: string;
  lineWidth?: number;
}) {
  if (shape.type === "sphere") {
    // Dla sfery nie rysujemy outline
    return null;
  }

  const orientation = shape.orientation || "xz";
  const baseY = shape.baseY || 0;
  const points = shape.points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));

  if (orientation === "xz") points.forEach((p) => (p.y = baseY));
  else if (orientation === "xy")
    points.forEach((p) => (p.z = shape.faceOffset || 0));
  else points.forEach((p) => (p.x = shape.faceOffset || 0));

  return (
    <Line
      points={[...points, points[0]]}
      color={color}
      lineWidth={lineWidth}
      position={orientation === "xz" ? [0, 0.05, 0] : [0, 0, 0]}
    />
  );
}

function SolidBox({
  shape,
  isHovered,
  outlineColor = "black",
}: {
  shape: DrawnShape;
  isHovered: boolean;
  outlineColor?: string;
}) {
  const { boxArgs, center } = getShapeBoxParams(shape);
  const is3D = Math.abs(shape.height) > 0.01;
  const color = isHovered ? "#cbd5e1" : "#e5e7eb";

  return (
    <group>
      <ShapeOutline shape={shape} color={outlineColor} />
      <mesh position={[center.x, center.y, center.z]}>
        <boxGeometry args={boxArgs} />
        <meshStandardMaterial
          color={color}
          transparent={!is3D}
          opacity={is3D ? 1 : 0.15}
          side={THREE.DoubleSide}
          depthWrite={is3D}
        />
      </mesh>
      {is3D && (
        <lineSegments position={[center.x, center.y, center.z]}>
          <edgesGeometry args={[new THREE.BoxGeometry(...boxArgs)]} />
          <lineBasicMaterial color="#000000" />
        </lineSegments>
      )}
    </group>
  );
}

/** Komponent renderujący sferę */
function SphereShape({
  shape,
  hoveredShapeId,
}: {
  shape: DrawnShape;
  hoveredShapeId?: string | null;
}) {
  const isHovered = hoveredShapeId === shape.id;
  const radius = shape.radius || 10;
  const center = shape.center || [0, radius, 0];
  const color = isHovered ? "#ff6b6b" : "#ff0000";

  return (
    <mesh position={[center[0], center[1], center[2]]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Główny komponent renderujący bryłę z wycięciami CSG */
function CSGShape({
  rootShape,
  holeChildren,
  hoveredShapeId,
  outlineColor = "black",
}: {
  rootShape: DrawnShape;
  holeChildren: DrawnShape[];
  hoveredShapeId?: string | null;
  outlineColor?: string;
}) {
  const isRootHovered = hoveredShapeId === rootShape.id;

  const is3D = Math.abs(rootShape.height) > 0.01;
  const activeCuts = holeChildren.filter((c) => Math.abs(c.height) > 0.01);

  const csgGeometry = useMemo(() => {
    if (activeCuts.length === 0 || !is3D) return null;
    try {
      const evaluator = new Evaluator();
      let resultBrush = createBrushFromShape(rootShape, false);
      for (const child of activeCuts) {
        const childBrush = createBrushFromShape(child, true);
        resultBrush = evaluator.evaluate(resultBrush, childBrush, SUBTRACTION);
      }
      return resultBrush.geometry;
    } catch (e) {
      return null;
    }
  }, [rootShape, activeCuts, is3D]);

  const color = isRootHovered ? "#cbd5e1" : "#e5e7eb";

  return (
    <group>
      <ShapeOutline shape={rootShape} color={outlineColor} />

      {holeChildren.map((child) => {
        const isChildHovered = hoveredShapeId === child.id;
        return (
          <ShapeOutline
            key={`outline-${child.id}`}
            shape={child}
            color={isChildHovered ? "#fbbf24" : "#ff4444"}
            lineWidth={isChildHovered ? 4 : 2}
          />
        );
      })}

      {csgGeometry && is3D ? (
        <group>
          <mesh geometry={csgGeometry}>
            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[csgGeometry]} />
            <lineBasicMaterial color="#000000" />
          </lineSegments>
        </group>
      ) : (
        <SolidBox
          shape={rootShape}
          isHovered={isRootHovered}
          outlineColor={outlineColor}
        />
      )}
    </group>
  );
}

export default function ShapeRenderer({
  shapes,
  hoveredShapeId,
  activeExtrudeId,
}: ShapeRendererProps) {
  const rootShapes = shapes.filter((s) => !s.parentId);

  const getDescendantHoles = (parent: DrawnShape) => {
    const holes: DrawnShape[] = [];
    const findHoles = (pid: string) => {
      const children = shapes.filter((s) => s.parentId === pid);
      for (const child of children) {
        const isHole =
          Math.abs(child.height) < 0.01 || !isOutwardExtrusion(child);
        if (isHole) {
          holes.push(child);
        }
        findHoles(child.id);
      }
    };
    findHoles(parent.id);
    return holes;
  };

  const additionChildren = shapes.filter(
    (s) => s.parentId && Math.abs(s.height) >= 0.01 && isOutwardExtrusion(s),
  );

  // Osobna grupa dla sfer
  const sphereShapes = shapes.filter((s) => s.type === "sphere");

  return (
    <group>
      {/* Renderowanie brył bazowych (nie-sfery) */}
      {rootShapes
        .filter((s) => s.type !== "sphere")
        .map((root) => (
          <CSGShape
            key={root.id}
            rootShape={root}
            holeChildren={getDescendantHoles(root)}
            hoveredShapeId={hoveredShapeId}
          />
        ))}

      {/* Renderowanie brył dobudowanych (niebieski obrys) */}
      {additionChildren.map((child) => (
        <CSGShape
          key={child.id}
          rootShape={child}
          holeChildren={getDescendantHoles(child)}
          hoveredShapeId={hoveredShapeId}
          outlineColor="#2266ff"
        />
      ))}

      {/* Renderowanie wszystkich sfer */}
      {sphereShapes.map((sphere) => (
        <SphereShape
          key={sphere.id}
          shape={sphere}
          hoveredShapeId={hoveredShapeId}
        />
      ))}
    </group>
  );
}
