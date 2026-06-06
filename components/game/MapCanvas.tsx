'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { RoadFeature } from '../../types';
import { getBoundingBox, projectToSVG } from '../../lib/geo';
import { RoadPolyline } from './RoadPolyline';

interface Props {
  roads: RoadFeature[];
  foundRoads: Set<string>;
  onRoadHover: (road: RoadFeature | null) => void;
  resetZoomTrigger: number;
}

export function MapCanvas({ roads, foundRoads, onRoadHover, resetZoomTrigger }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  // Base SVG dimensions (large enough for detail)
  const SVG_WIDTH = 2000;
  const SVG_HEIGHT = 1600;

  const bbox = useMemo(() => getBoundingBox(roads), [roads]);
  
  // Project all roads once
  const allProjectedPoints = useMemo(() => {
    if (roads.length === 0) return new Map<number, [number, number][]>();
    const pointsMap = new Map<number, [number, number][]>();
    for (const road of roads) {
      pointsMap.set(road.id, projectToSVG(road.coordinates, bbox, SVG_WIDTH, SVG_HEIGHT, 50));
    }
    return pointsMap;
  }, [roads, bbox]);

  const unfoundRoads = useMemo(() => roads.filter(r => !foundRoads.has(r.name)), [roads, foundRoads]);
  const foundRoadsData = useMemo(() => roads.filter(r => foundRoads.has(r.name)), [roads, foundRoads]);

  // Render static background once to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || roads.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, SVG_WIDTH, SVG_HEIGHT);
    
    // Setup styles for unfound roads
    ctx.strokeStyle = '#2a3d5a'; // Slightly brighter than background
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw all unfound roads
    for (const road of unfoundRoads) {
      const points = allProjectedPoints.get(road.id);
      if (!points || points.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }
  }, [unfoundRoads, allProjectedPoints, roads.length]);

  useEffect(() => {
    if (!containerRef.current || roads.length === 0) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const fitScale = Math.min(clientWidth / SVG_WIDTH, clientHeight / SVG_HEIGHT);
    
    setScale(fitScale * 0.9); // fitting with a small margin
    setPosition({ x: 0, y: 0 });
  }, [resetZoomTrigger, roads.length]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    
    setScale(prev => {
      const newScale = direction > 0 ? prev * zoomFactor : prev / zoomFactor;
      return Math.max(0.5, Math.min(newScale, 20));
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-bg overflow-hidden cursor-grab active:cursor-grabbing touch-none relative select-none"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div 
        className="w-full h-full relative"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center',
          transition: isDragging ? 'none' : 'transform 100ms ease-out'
        }}
      >
        <div style={{ width: SVG_WIDTH, height: SVG_HEIGHT, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <canvas 
            ref={canvasRef}
            width={SVG_WIDTH} 
            height={SVG_HEIGHT}
            className="absolute inset-0 pointer-events-none opacity-40 shadow-2xl"
          />
          <svg 
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="glow-magenta" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Render ONLY found roads as SVG for performance */}
            {foundRoadsData.map(road => (
              <RoadPolyline 
                key={road.id}
                road={road}
                isFound={true}
                isHovered={false}
                projectedPoints={allProjectedPoints.get(road.id) || []}
                onHover={onRoadHover}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
