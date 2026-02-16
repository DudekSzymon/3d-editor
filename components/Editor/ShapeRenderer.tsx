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
  if (shape.type === "sphere") return null;

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
  const baseColor = shape.color || "#e5e7eb";
  const color = isHovered
    ? new THREE.Color(baseColor)
        .lerp(new THREE.Color("#ffffff"), 0.3)
        .getHexString()
    : baseColor;

  return (
    <group>
      <ShapeOutline shape={shape} color={outlineColor} />
      <mesh position={[center.x, center.y, center.z]}>
        <boxGeometry args={boxArgs} />
        <meshStandardMaterial
          color={isHovered ? `#${color}` : baseColor}
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
  const baseColor = shape.color || "#ff0000";
  const color = isHovered
    ? new THREE.Color(baseColor)
        .lerp(new THREE.Color("#ffffff"), 0.3)
        .getHexString()
    : baseColor;

  return (
    <mesh position={[center[0], center[1], center[2]]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={isHovered ? `#${color}` : baseColor}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Sześcian-entity BEZ dziur */
function CubeEntitySimple({
  shape,
  hoveredShapeId,
}: {
  shape: DrawnShape;
  hoveredShapeId?: string | null;
}) {
  const isHovered = hoveredShapeId === shape.id;
  const radius = shape.radius || 10;
  const center = shape.center || [0, radius, 0];
  const size = radius * 2;
  const baseColor = shape.color || "#ff0000";
  const color = isHovered
    ? new THREE.Color(baseColor)
        .lerp(new THREE.Color("#ffffff"), 0.3)
        .getHexString()
    : baseColor;

  return (
    <group>
      <mesh position={[center[0], center[1], center[2]]}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={isHovered ? `#${color}` : baseColor}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments position={[center[0], center[1], center[2]]}>
        <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
        <lineBasicMaterial color="#000000" />
      </lineSegments>
    </group>
  );
}

/** Sześcian-entity Z wyciętymi dziurami (CSG) */
function CubeEntityCSG({
  shape,
  holeChildren,
  hoveredShapeId,
}: {
  shape: DrawnShape;
  holeChildren: DrawnShape[];
  hoveredShapeId?: string | null;
}) {
  const isHovered = hoveredShapeId === shape.id;
  const radius = shape.radius || 10;
  const center = shape.center || [0, radius, 0];
  const size = radius * 2;
  const baseColor = shape.color || "#ff0000";

  const activeCuts = holeChildren.filter((c) => Math.abs(c.height) > 0.01);

  const csgGeometry = useMemo(() => {
    if (activeCuts.length === 0) return null;
    try {
      const evaluator = new Evaluator();
      const geo = new THREE.BoxGeometry(size, size, size);
      let resultBrush = new Brush(geo);
      resultBrush.position.set(center[0], center[1], center[2]);
      resultBrush.updateMatrixWorld();

      for (const child of activeCuts) {
        const childBrush = createBrushFromShape(child, true);
        resultBrush = evaluator.evaluate(resultBrush, childBrush, SUBTRACTION);
      }
      return resultBrush.geometry;
    } catch (e) {
      console.error("CSG error for cube entity:", e);
      return null;
    }
  }, [shape, activeCuts, size, center]);

  const color = isHovered
    ? new THREE.Color(baseColor)
        .lerp(new THREE.Color("#ffffff"), 0.3)
        .getHexString()
    : baseColor;

  return (
    <group>
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

      {csgGeometry ? (
        <group>
          <mesh geometry={csgGeometry}>
            <meshStandardMaterial
              color={isHovered ? `#${color}` : baseColor}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[csgGeometry]} />
            <lineBasicMaterial color="#000000" />
          </lineSegments>
        </group>
      ) : (
        <CubeEntitySimple shape={shape} hoveredShapeId={hoveredShapeId} />
      )}
    </group>
  );
}

/** Bryła rect z wycięciami CSG */
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

  const baseColor = rootShape.color || "#e5e7eb";
  const color = isRootHovered
    ? new THREE.Color(baseColor)
        .lerp(new THREE.Color("#ffffff"), 0.3)
        .getHexString()
    : baseColor;

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
            <meshStandardMaterial
              color={isRootHovered ? `#${color}` : baseColor}
              side={THREE.DoubleSide}
            />
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
        if (isHole) holes.push(child);
        findHoles(child.id);
      }
    };
    findHoles(parent.id);
    return holes;
  };

  const getDescendantChildren = (parentId: string) => {
    const result: DrawnShape[] = [];
    const find = (pid: string) => {
      const children = shapes.filter((s) => s.parentId === pid);
      for (const child of children) {
        result.push(child);
        find(child.id);
      }
    };
    find(parentId);
    return result;
  };

  // Dobudówki — dzieci rect (nie na cube entity, bo te obsługujemy osobno)
  const cubeEntityIds = new Set(
    rootShapes
      .filter((s) => s.type === "sphere" && s.entityShape === "cube")
      .map((s) => s.id),
  );

  const additionChildren = shapes.filter(
    (s) =>
      s.parentId &&
      Math.abs(s.height) >= 0.01 &&
      isOutwardExtrusion(s) &&
      !cubeEntityIds.has(s.parentId!),
  );

  const entityShapes = rootShapes.filter((s) => s.type === "sphere");
  const rectRootShapes = rootShapes.filter((s) => s.type === "rect");

  return (
    <group>
      {/* Bryły rect bazowe */}
      {rectRootShapes.map((root) => (
        <CSGShape
          key={root.id}
          rootShape={root}
          holeChildren={getDescendantHoles(root)}
          hoveredShapeId={hoveredShapeId}
        />
      ))}

      {/* Dobudówki na rect */}
      {additionChildren.map((child) => (
        <CSGShape
          key={child.id}
          rootShape={child}
          holeChildren={getDescendantHoles(child)}
          hoveredShapeId={hoveredShapeId}
          outlineColor="#2266ff"
        />
      ))}

      {/* Sfery (kule) */}
      {entityShapes
        .filter((s) => s.entityShape !== "cube")
        .map((entity) => (
          <SphereShape
            key={entity.id}
            shape={entity}
            hoveredShapeId={hoveredShapeId}
          />
        ))}

      {/* Sześciany-entity z obsługą CSG */}
      {entityShapes
        .filter((s) => s.entityShape === "cube")
        .map((entity) => {
          const children = getDescendantChildren(entity.id);
          const holes = children.filter(
            (c) => Math.abs(c.height) < 0.01 || !isOutwardExtrusion(c),
          );
          const additions = children.filter(
            (c) => Math.abs(c.height) >= 0.01 && isOutwardExtrusion(c),
          );

          return (
            <group key={entity.id}>
              {holes.length > 0 ? (
                <CubeEntityCSG
                  shape={entity}
                  holeChildren={holes}
                  hoveredShapeId={hoveredShapeId}
                />
              ) : (
                <CubeEntitySimple
                  shape={entity}
                  hoveredShapeId={hoveredShapeId}
                />
              )}

              {/* Dobudówki na sześcianie */}
              {additions.map((add) => (
                <CSGShape
                  key={add.id}
                  rootShape={add}
                  holeChildren={getDescendantHoles(add)}
                  hoveredShapeId={hoveredShapeId}
                  outlineColor="#2266ff"
                />
              ))}
            </group>
          );
        })}
    </group>
  );
}
