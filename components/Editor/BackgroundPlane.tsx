"use client";

import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { SUBTRACTION, Brush, Evaluator } from "three-bvh-csg";
import { BackgroundImageData, DrawnShape, getShapeBoxParams } from "./types";

interface BackgroundPlaneProps {
  data: BackgroundImageData;
  shapes: DrawnShape[];
}

export default function BackgroundPlane({
  data,
  shapes,
}: BackgroundPlaneProps) {
  const texture = useLoader(THREE.TextureLoader, data.url);

  const clippedGeometry = useMemo(() => {
    const baseGeo = new THREE.PlaneGeometry(data.width, data.height);
    baseGeo.rotateX(-Math.PI / 2);

    const holes = shapes.filter(
      (s) => !s.parentId && (s.orientation || "xz") === "xz" && s.height < 0,
    );

    if (holes.length === 0) return baseGeo;

    const evaluator = new Evaluator();
    let resultBrush = new Brush(baseGeo);

    for (const hole of holes) {
      const { boxArgs, center } = getShapeBoxParams(hole);
      const holeGeo = new THREE.BoxGeometry(boxArgs[0], 10, boxArgs[2]);
      const holeBrush = new Brush(holeGeo);
      holeBrush.position.set(center.x, 0, center.z);
      holeBrush.updateMatrixWorld();
      resultBrush.updateMatrixWorld();
      resultBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
    }

    return resultBrush.geometry;
  }, [data.width, data.height, shapes]);

  return (
    <mesh position={[0, -0.2, 0]} renderOrder={-1} geometry={clippedGeometry}>
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
