import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SilkProps {
  speed?: number;
  scale?: number;
  color?: string;
  noiseIntensity?: number;
  rotation?: number;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform vec3 uColor;
  uniform float uNoiseIntensity;
  uniform float uRotation;

  varying vec2 vUv;

  // Simplex-like noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float cosR = cos(uRotation);
    float sinR = sin(uRotation);
    vec2 uv = vUv - 0.5;
    uv = vec2(uv.x * cosR - uv.y * sinR, uv.x * sinR + uv.y * cosR);
    uv += 0.5;

    float t = uTime * uSpeed * 0.08;
    vec2 p = uv * uScale;

    float n1 = snoise(p + vec2(t * 0.4, t * 0.3)) * uNoiseIntensity;
    float n2 = snoise(p * 1.5 + vec2(-t * 0.3, t * 0.5)) * uNoiseIntensity * 0.6;
    float n3 = snoise(p * 2.5 + vec2(t * 0.2, -t * 0.4)) * uNoiseIntensity * 0.3;

    float wave1 = sin(uv.x * 6.0 + t + n1 * 3.0) * 0.5 + 0.5;
    float wave2 = sin(uv.y * 4.0 - t * 0.7 + n2 * 2.0) * 0.5 + 0.5;
    float wave3 = sin((uv.x + uv.y) * 5.0 + t * 0.5 + n3 * 2.5) * 0.5 + 0.5;

    float combined = wave1 * 0.4 + wave2 * 0.35 + wave3 * 0.25;
    combined = smoothstep(0.2, 0.8, combined);

    vec3 lightColor = uColor * 2.2;
    vec3 darkColor = uColor * 0.6;
    vec3 color = mix(darkColor, lightColor, combined);

    float alpha = combined * 0.45 + 0.05;
    gl_FragColor = vec4(color, alpha);
  }
`;

function SilkMesh({ speed, scale, color, noiseIntensity, rotation }: Required<SilkProps>) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uColor: { value: new THREE.Color(color) },
      uNoiseIntensity: { value: noiseIntensity },
      uRotation: { value: rotation },
    }),
    []
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}

export default function Silk({
  speed = 3,
  scale = 1,
  color = "#2A2318",
  noiseIntensity = 1.5,
  rotation = 0,
}: SilkProps) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, opacity: 0.6 }}>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 90 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: false, alpha: true }}
      >
        <SilkMesh
          speed={speed}
          scale={scale}
          color={color}
          noiseIntensity={noiseIntensity}
          rotation={rotation}
        />
      </Canvas>
    </div>
  );
}
