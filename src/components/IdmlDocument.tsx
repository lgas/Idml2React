import type { ResolvedDocument } from '@/types/resolved.types';
import type { CSSProperties } from 'react';
import { IdmlPage } from './IdmlPage';

interface Props {
  document: ResolvedDocument;
  /** Target width in px to fit each page into. Drives the scale factor. */
  targetWidth?: number;
}

export const IdmlDocument = ({ document, targetWidth }: Props) => {
  const scale = targetWidth ? targetWidth / document.pageWidth : 1;

  const wrapperCss: CSSProperties = {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    /* gap:            '32px', */
   /*  padding:        '32px', */
  };

  return (
    <div style={wrapperCss}>
      {document.pages.map(page => (
        <IdmlPage key={page.self} page={page} scale={scale} />
      ))}
    </div>
  );
};
