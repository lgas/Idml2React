import type { ResolvedPolygon, ResolvedPolygonPoint, ResolvedSubPath } from '@/types/resolved.types';
import type { CSSProperties } from 'react';

const buildSubPath = (points: ResolvedPolygonPoint[], pathOpen: boolean): string => {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const [ax0, ay0] = first.anchor;
  let d = `M ${ax0} ${ay0}`;

  const segments = pathOpen ? rest : [...rest, first];
  let prev = first;
  for (const curr of segments) {
    const [rx, ry] = prev.rightDirection;
    const [lx, ly] = curr.leftDirection;
    const [ax, ay] = curr.anchor;
    d += ` C ${rx} ${ry} ${lx} ${ly} ${ax} ${ay}`;
    prev = curr;
  }

  if (!pathOpen) d += ' Z';
  return d;
};

const buildPath = (paths: ResolvedSubPath[]): string =>
  paths.map(({ points, pathOpen }) => buildSubPath(points, pathOpen)).join(' ');

interface Props {
  frame: ResolvedPolygon;
}

export const IdmlPolygonFrame = ({ frame }: Props) => {
  const css: CSSProperties = {
    position:  'absolute',
    left:      `${frame.x}px`,
    top:       `${frame.y}px`,
    width:     `${frame.width}px`,
    height:    `${frame.height}px`,
    overflow:  'visible',
  };

  const d = buildPath(frame.paths);

  return (
    <div style={css} data-self={frame.self}>
      <svg
        width={frame.width}
        height={frame.height}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        style={{
          overflow: 'visible',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity:      frame.opacity,
          mixBlendMode: frame.mixBlendMode as CSSProperties['mixBlendMode'],
          filter:       frame.svgFilter,
        }}
      >
        <path
          d={d}
          fill={frame.fillColor ?? 'none'}
          stroke={frame.strokeColor ?? 'none'}
          strokeWidth={frame.strokeWeight ?? 0}
        />
      </svg>
    </div>
  );
};
