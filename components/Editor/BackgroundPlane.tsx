"use client";

import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { BackgroundImageData } from "./types";

interface BackgroundPlaneProps {
  data: BackgroundImageData;
}

export default function BackgroundPlane({ data }: BackgroundPlaneProps) {
  const texture = useLoader(THREE.TextureLoader, data.url);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[data.width, data.height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
