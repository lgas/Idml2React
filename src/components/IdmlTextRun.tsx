import type { ResolvedTextRange } from '@/types/resolved.types';
import type { CSSProperties } from 'react';

interface Props {
  range: ResolvedTextRange;
}

export const IdmlTextRun = ({ range }: Props) => {
  const { style, text, softReturn } = range;

  const css: CSSProperties = {
    fontFamily:     style.fontFamily,
    fontWeight:     style.fontWeight,
    fontStyle:      style.fontStyle,
    fontSize:       style.fontSize    != null ? `${style.fontSize}px`    : undefined,
    lineHeight:     style.lineHeight  != null ? `${style.lineHeight}px`  : undefined,
    letterSpacing:  style.letterSpacing != null ? `${style.letterSpacing}em` : undefined,
    color:          style.color,
    textTransform:  style.textTransform,
    textDecoration: style.textDecoration,
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
