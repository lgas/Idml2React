import type { ResolvedParagraph } from '@/types/resolved.types';
import type { CSSProperties } from 'react';
import { IdmlTextRun } from './IdmlTextRun';

interface Props {
  paragraph: ResolvedParagraph;
}

export const IdmlParagraph = ({ paragraph }: Props) => {
  const { style, ranges } = paragraph;

  const css: CSSProperties = {
    textAlign:    style.textAlign,
    direction:    style.direction,
    marginTop:    style.marginTop    != null ? `${style.marginTop}px`    : undefined,
    marginBottom: style.marginBottom != null ? `${style.marginBottom}px` : undefined,
    textIndent:   style.textIndent   != null ? `${style.textIndent}px`   : undefined,
    // Reset browser defaults
    padding: 0,
  };

  return (
    <p style={css}>
      {ranges.map((range, i) => (
        <IdmlTextRun key={i} range={range} />
      ))}
    </p>
  );
};
