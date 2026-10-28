import React, { memo } from 'react';
import { RoadFeature } from '../../types';
import { ROAD_TYPE_COLORS } from '../../lib/roadTypes';

interface Props {
  road: RoadFeature;
  isFound: boolean;
  isHovered: boolean;
  projectedPoints: [number, number][];
  onHover: (road: RoadFeature | null) => void;
}

export const RoadPolyline = memo(({ road, isFound, isHovered, projectedPoints, onHover }: Props) => {
  const pointsStr = projectedPoints.map(p => `${p[0]},${p[1]}`).join(' ');

  let strokeColor = 'var(--road-unfound)';
  let filter = 'none';

  if (isFound) {
    strokeColor = ROAD_TYPE_COLORS[road.type] ?? ROAD_TYPE_COLORS.Other;
    filter = strokeColor === 'var(--road-underpass)' ? 'none'
      : strokeColor === 'var(--road-bridge)' ? 'url(#glow-amber)'
      : ['var(--road-road)', 'var(--road-street)'].includes(strokeColor) ? 'url(#glow-cyan)'
      : 'url(#glow-magenta)';
  } else if (isHovered) {
    strokeColor = '#2a3d5a';
  }

  const strokeWidth = isHovered && isFound ? 3.5 : isFound ? 2 : 0.8;

  return (
    <g
      onMouseEnter={() => isFound && onHover(road)}
      onMouseLeave={() => isFound && onHover(null)}
      className={isFound ? "cursor-pointer" : ""}
    >
      {/* Invisible thicker hit area */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="transparent"
        strokeWidth="12"
      />
      {/* Visible line */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={filter}
        className="transition-all duration-300 pointer-events-none"
      />
    </g>
  );
});
RoadPolyline.displayName = 'RoadPolyline';
