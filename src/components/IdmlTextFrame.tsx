import type { ResolvedTextFrame } from '@/types/resolved.types';
import type { CSSProperties } from 'react';
import { IdmlParagraph } from './IdmlParagraph';

interface Props {
  frame: ResolvedTextFrame;
}

export const IdmlTextFrame = ({ frame }: Props) => {
  const css: CSSProperties = {
    position: 'absolute',
    left:     `${frame.x}px`,
    top:      `${frame.y}px`,
    width:    `${frame.width}px`,
    height:   `${frame.height}px`,
    overflow: 'hidden',
    // Multi-column support (CSS columns mirrors InDesign columns exactly)
    columnCount: frame.columns > 1 ? frame.columns    : undefined,
    columnGap:   frame.columns > 1 ? `${frame.columnGutter}px` : undefined,
    zIndex: 1,
  };

  return (
    <div style={css} data-self={frame.self}>
      {frame.paragraphs.map((para, i) => (
        <IdmlParagraph key={i} paragraph={para} />
      ))}
    </div>
  );
};
