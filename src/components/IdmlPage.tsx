import type { ResolvedPage } from '@/types/resolved.types';
import type { CSSProperties } from 'react';
import { IdmlGraphicFrame } from './IdmlGraphicFrame';
import { IdmlPolygonFrame } from './IdmlPolygonFrame';
import { IdmlTextFrame } from './IdmlTextFrame';

interface Props {
  page: ResolvedPage;
  /** Scale factor to fit the page in the viewport. Default 1 (1px = 1pt). */
  scale?: number;
}

export const IdmlPage = ({ page, scale = 1 }: Props) => {
  // Outer div reserves the scaled layout space — no transform here
  const containerCss: CSSProperties = {
    width:    `${page.width * scale}px`,
    height:   `${page.height * scale}px`,
    overflow: 'hidden',
  };

  // Inner div keeps original px coordinates — transform scales it visually
  const pageCss: CSSProperties = {
    position:        'relative',
    width:           `${page.width}px`,
    height:          `${page.height}px`,
    transformOrigin: 'top left',
    transform:       scale !== 1 ? `scale(${scale})` : undefined,
    background:      '#ffffff',
    boxShadow:       '0 2px 12px rgba(0,0,0,0.18)',
  };

  return (
    <div style={containerCss}>
      <div style={pageCss} data-page={page.name ?? page.self}>
        {/* Graphic frames first — they sit behind text */}
        {page.graphicFrames.map(frame => (
          <IdmlGraphicFrame key={frame.self} frame={frame} />
        ))}
        {page.polygons.map(frame => (
          <IdmlPolygonFrame key={frame.self} frame={frame} />
        ))}
        {/* Text frames on top */}
        {page.textFrames.map(frame => (
          <IdmlTextFrame key={frame.self} frame={frame} />
        ))}
      </div>
    </div>
  );
};
