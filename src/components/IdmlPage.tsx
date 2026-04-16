import type { ResolvedPage } from '@/types/resolved.types';
import type { CSSProperties } from 'react';
import { IdmlGraphicFrame } from './IdmlGraphicFrame';
import { IdmlTextFrame } from './IdmlTextFrame';

interface Props {
  page: ResolvedPage;
  /** Scale factor to fit the page in the viewport. Default 1 (1px = 1pt). */
  scale?: number;
}

export const IdmlPage = ({ page, scale = 1 }: Props) => {
  const containerCss: CSSProperties = {
    transformOrigin: 'top left',
    transform:       scale !== 1 ? `scale(${scale})` : undefined,
    // Reserve layout space so the scaled page doesn't collapse its parent
    width:  `${page.width * scale}px`,
    height: `${page.height * scale}px`,
  };

  const pageCss: CSSProperties = {
    position:   'relative',
    width:      `${page.width}px`,
    height:     `${page.height}px`,
    background: '#ffffff',
    overflow:   'hidden',
    boxShadow:  '0 2px 12px rgba(0,0,0,0.18)',
  };

  return (
    <div style={containerCss}>
      <div style={pageCss} data-page={page.name ?? page.self}>
        {/* Graphic frames first — they sit behind text */}
        {page.graphicFrames.map(frame => (
          <IdmlGraphicFrame key={frame.self} frame={frame} />
        ))}
        {/* Text frames on top */}
        {page.textFrames.map(frame => (
          <IdmlTextFrame key={frame.self} frame={frame} />
        ))}
      </div>
    </div>
  );
};
