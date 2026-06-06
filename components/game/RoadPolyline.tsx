import React, { memo } from 'react';
import { RoadFeature } from '../../types';

interface Props {
  road: RoadFeature;
  isFound: boolean;
  isHovered: boolean;
  projectedPoints: [number, number][];
  onHover: (road: RoadFeature | null) => void;
}

export const RoadPolyline = memo(({ road, isFound, isHovered, projectedPoints, onHover }: Props) => {
  const pointsStr = projectedPoints.map(p => `${p[0]},${p[1]}`).join(' ');

  let strokeColor = 'var(--color-border)';
  let filter = 'none';

  if (isFound) {
    if (road.type === '大道' || road.type === '大路') {
      strokeColor = 'var(--color-magenta)';
      filter = 'url(#glow-magenta)';
    } else if (road.type === '街') {
      strokeColor = 'var(--color-amber)';
      filter = 'url(#glow-amber)';
    } else if (road.type === '路') {
      strokeColor = 'var(--color-cyan)';
      filter = 'url(#glow-cyan)';
    } else {
      strokeColor = 'var(--color-cyan)'; // defaults to cyan
      filter = 'url(#glow-cyan)';
    }
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
