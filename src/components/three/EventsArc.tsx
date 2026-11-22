import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EVENT_TRACKS } from '../../data/festivalData';
import type { EventTrack } from '../../types/festival';
import { createEventCardTexture } from '../../utils/proceduralTextures';
import { nexusAudio } from '../../utils/audioEngine';

interface EventsArcProps {
  selectedEventId: string | null;
  onSelectEvent: (eventTrack: EventTrack) => void;
  reducedMotion: boolean;
  isSoftwareGl: boolean;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function EventsArc({
  selectedEventId,
  onSelectEvent,
  reducedMotion,
  isSoftwareGl,
  pointerRef,
}: EventsArcProps) {
  const { gl } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const cardRefs = useRef<(THREE.Group | null)[]>([]);
  const emblemRefs = useRef<(THREE.Mesh | null)[]>([]);

  const cardTextures = useMemo(() => {
    const maxAniso = isSoftwareGl ? 1 : Math.min(gl.capabilities.getMaxAnisotropy(), 8);
    return EVENT_TRACKS.map((track) => createEventCardTexture(track, maxAniso));
  }, [gl, isSoftwareGl]);

  useEffect(() => {
    return () => {
      cardTextures.forEach((t) => t.dispose());
    };
  }, [cardTextures]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    EVENT_TRACKS.forEach((track, idx) => {
      const card = cardRefs.current[idx];
      const emblem = emblemRefs.current[idx];
      const isHovered = hoveredId === track.id;
      const isSelected = selectedEventId === track.id;

      if (card) {
        const baseY = track.position[1];
        const targetY = reducedMotion
          ? baseY
          : baseY + Math.sin(t * 1.2 + idx * 0.9) * 0.09 + (isHovered || isSelected ? 0.16 : 0);
        card.position.y = THREE.MathUtils.damp(card.position.y, targetY, 5, dt);

        const targetScale = isHovered || isSelected ? 1.08 : 1.0;
        const nextScale = THREE.MathUtils.damp(card.scale.x, targetScale, 7, dt);
        card.scale.setScalar(nextScale);

        // Subtle pointer-responsive tilt around base Y rotation
        const tiltY = track.rotationY + pointerRef.current.x * 0.09;
        const tiltX = -pointerRef.current.y * 0.07;
        card.rotation.y = THREE.MathUtils.damp(card.rotation.y, tiltY, 5, dt);
        card.rotation.x = THREE.MathUtils.damp(card.rotation.x, tiltX, 5, dt);
      }

      if (emblem && !reducedMotion) {
        emblem.rotation.y += dt * (isHovered ? 1.6 : 0.7);
        emblem.rotation.x = Math.sin(t + idx) * 0.2;
      }
    });
  });

  return (
    <group>
      {/* Subtle Amphitheater Arc Floor Platform */}
      <mesh position={[0, 0.03, -38.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[3.5, 7.6, 48, 1, Math.PI * 0.05, Math.PI * 0.9]} />
        <meshStandardMaterial color="#0b142e" metalness={0.82} roughness={0.35} />
      </mesh>

      {EVENT_TRACKS.map((track, idx) => {
        const isHovered = hoveredId === track.id;
        const isSelected = selectedEventId === track.id;
        const active = isHovered || isSelected;

        return (
          <group
            key={track.id}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            position={track.position}
            rotation={[0, track.rotationY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              nexusAudio.playChime(440 + idx * 55);
              onSelectEvent(track);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(track.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredId((prev) => (prev === track.id ? null : prev));
              document.body.style.cursor = 'default';
            }}
          >
            {/* Beveled Titanium Monolith Backing Chassis */}
            <mesh position={[0, 0, -0.06]} castShadow>
              <boxGeometry args={[1.82, 2.28, 0.1]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.24} />
            </mesh>

            {/* Accent Edge Rail */}
            <mesh position={[0, 0, -0.03]}>
              <boxGeometry args={[1.87, 2.33, 0.04]} />
              <meshStandardMaterial
                color={track.accentColor}
                emissive={track.accentColor}
                emissiveIntensity={active ? 1.95 : 0.6}
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>

            {/* High-Res Procedural Holographic Screen */}
            <mesh position={[0, 0, 0.015]}>
              <planeGeometry args={[1.7, 2.14]} />
              <meshStandardMaterial
                map={cardTextures[idx]}
                emissive="#ffffff"
                emissiveMap={cardTextures[idx]}
                emissiveIntensity={active ? 1.15 : 0.72}
                roughness={0.22}
                metalness={0.15}
              />
            </mesh>

            {/* Floating 3D Geometric Emblem Above Card */}
            <mesh
              ref={(el) => {
                emblemRefs.current[idx] = el;
              }}
              position={[0, 1.48, 0.05]}
            >
              {track.emblem === 'robotics' && <torusKnotGeometry args={[0.18, 0.055, 48, 8]} />}
              {track.emblem === 'ai' && <octahedronGeometry args={[0.24, 0]} />}
              {track.emblem === 'hackathon' && <boxGeometry args={[0.3, 0.3, 0.3]} />}
              {track.emblem === 'gaming' && <icosahedronGeometry args={[0.24, 0]} />}
              {track.emblem === 'arvr' && <torusGeometry args={[0.2, 0.065, 14, 32]} />}
              {track.emblem === 'talks' && <dodecahedronGeometry args={[0.22, 0]} />}
              <meshStandardMaterial
                color={track.accentColor}
                emissive={track.accentColor}
                emissiveIntensity={active ? 1.9 : 0.95}
                metalness={0.85}
                roughness={0.18}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
