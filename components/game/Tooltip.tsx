'use client';
import { useEffect, useState } from 'react';
import { RoadFeature } from '../../types';

interface Props {
  road: RoadFeature | null;
}

export function Tooltip({ road }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  if (!road) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none bg-surface/90 backdrop-blur border border-border px-3 py-2 rounded-lg shadow-xl text-sm"
      style={{ left: pos.x + 15, top: pos.y + 15 }}
    >
      <div className="font-bold text-cyan">{road.name}</div>
      <div className="text-text-muted mt-1 font-mono">{road.lengthKm.toFixed(2)} km</div>
    </div>
  );
}
