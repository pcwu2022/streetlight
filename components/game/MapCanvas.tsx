'use client';

import React, { useState, useRef, useEffect, MouseEvent, TouchEvent, WheelEvent } from 'react';
import { RoadFeature } from '../../types';
import { ProjectionParams, projectToSVG, getBoundingBox } from '../../lib/geo';
import { RoadPolyline } from './RoadPolyline';

interface Props {
  roads: RoadFeature[];
  foundRoads: Set<string>;
  onRoadHover: (road: RoadFeature | null) => void;
  resetZoomTrigger: number;
}

export function MapCanvas({ roads, foundRoads, onRoadHover, resetZoomTrigger }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  const [pointsMap, setPointsMap] = useState<Map<number, [number,number][]>>(new Map());

  // Handle SVG Projection
  useEffect(() => {
    if (roads.length === 0 || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    
    // Some arbitrary large SVG base size to preserve detail
    const svgW = 2000;
    const svgH = 1600;
    
    // Scale container ratio to base SVG
    const bbox = getBoundingBox(roads);
    const newPointsMap = new Map<number, [number,number][]>();
    
    // Project all roads
    for (const road of roads) {
      const p = projectToSVG(road.coordinates, bbox, svgW, svgH, 50);
      newPointsMap.set(road.id, p);
    }
    setPointsMap(newPointsMap);
  }, [roads]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [resetZoomTrigger]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
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
        className="w-full h-full transform origin-center transition-transform duration-75"
        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
      >
        <svg 
          viewBox="0 0 2000 1600" 
          className="w-full h-full drop-shadow-2xl"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* First render unfound roads so they are in background */}
          {roads.filter(road => !foundRoads.has(road.name)).map(road => (
            <RoadPolyline 
              key={road.id}
              road={road}
              isFound={false}
              isHovered={false} // Tooltip hovering adds complexity for not-found things, let's keep it simple
              projectedPoints={pointsMap.get(road.id) || []}
              onHover={onRoadHover}
            />
          ))}

          {/* Then render found roads on top */}
          {roads.filter(road => foundRoads.has(road.name)).map(road => (
            <RoadPolyline 
              key={road.id}
              road={road}
              isFound={true}
              isHovered={false}
              projectedPoints={pointsMap.get(road.id) || []}
              onHover={onRoadHover}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
