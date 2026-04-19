import type { ResolvedTextRange } from '@/types/resolved.types';
import type { CSSProperties } from 'react';

interface Props {
  range: ResolvedTextRange;
}

export const IdmlTextRun = ({ range }: Props) => {
  const { style, text, softReturn } = range;

  const hasScale = style.scaleX != null || style.scaleY != null;
  const scaleX = style.scaleX != null ? style.scaleX / 100 : 1;
  const scaleY = style.scaleY != null ? style.scaleY / 100 : 1;

  const css: CSSProperties = {
    fontFamily:     style.fontFamily,
    fontWeight:     style.fontWeight,
    fontStyle:      style.fontStyle,
    fontSize:       style.fontSize    != null ? `${style.fontSize}px`    : undefined,
    lineHeight:     style.lineHeight  != null ? `${style.lineHeight}px`  : undefined,
    letterSpacing:  style.letterSpacing != null ? `${style.letterSpacing}em` : undefined,
    fontKerning:    style.fontKerning,
    color:          style.color,
    textTransform:  style.textTransform,
    fontVariant:    style.fontVariant,
    textDecoration: style.textDecoration,
    verticalAlign:  style.verticalAlign != null ? `${style.verticalAlign}pt` : undefined,
    display:        hasScale ? 'inline-block' : undefined,
    transform:      hasScale ? `scale(${scaleX}, ${scaleY})` : undefined,
    transformOrigin: hasScale ? 'left center' : undefined,
  };

  return (
    <>
      <span style={css} lang={style.lang}>
        {text}
      </span>
      {softReturn && <br />}
    </>
  );
};
