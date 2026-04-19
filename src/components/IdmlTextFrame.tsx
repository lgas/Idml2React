import type { ResolvedTextFrame } from '@/types/resolved.types';
import type { CSSProperties } from 'react';
import { IdmlParagraph } from './IdmlParagraph';

interface Props {
  frame: ResolvedTextFrame;
}

export const IdmlTextFrame = ({ frame }: Props) => {
  // Vertical justification uses flexbox; incompatible with CSS multi-column
  const vj = frame.columns === 1 ? frame.verticalJustification : undefined;

  const css: CSSProperties = {
    position: 'absolute',
    left:     `${frame.x}px`,
    top:      `${frame.y}px`,
    width:    `${frame.width}px`,
    height:   `${frame.height}px`,
    overflow:     'hidden',
    borderRadius: frame.borderRadius,
    opacity:      frame.opacity,
    mixBlendMode: frame.mixBlendMode as CSSProperties['mixBlendMode'],
    boxShadow:    frame.boxShadow,
    // Inset spacing → padding
    paddingTop:    frame.insetSpacing ? `${frame.insetSpacing[0]}px` : undefined,
    paddingRight:  frame.insetSpacing ? `${frame.insetSpacing[1]}px` : undefined,
    paddingBottom: frame.insetSpacing ? `${frame.insetSpacing[2]}px` : undefined,
    paddingLeft:   frame.insetSpacing ? `${frame.insetSpacing[3]}px` : undefined,
    // Multi-column support (CSS columns mirrors InDesign columns exactly)
    columnCount: frame.columns > 1 ? frame.columns    : undefined,
    columnGap:   frame.columns > 1 ? `${frame.columnGutter}px` : undefined,
    columnWidth: frame.columnFixedWidth ? `${frame.columnFixedWidth}px` : undefined,
    // Vertical justification via flexbox (single-column only)
    display:        vj ? 'flex'   : undefined,
    flexDirection:  vj ? 'column' : undefined,
    justifyContent: vj === 'center'  ? 'center'
                  : vj === 'bottom'  ? 'flex-end'
                  : vj === 'justify' ? 'space-between'
                  : undefined,
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
