import type { ResolvedGraphicFrame } from '@/types/resolved.types';
import type { CSSProperties } from 'react';

interface Props {
  frame: ResolvedGraphicFrame;
}

export const IdmlGraphicFrame = ({ frame }: Props) => {
  const containerCss: CSSProperties = {
    position:   'absolute',
    left:       `${frame.x}px`,
    top:        `${frame.y}px`,
    width:      `${frame.width}px`,
    height:     `${frame.height}px`,
    background: frame.fillColor ?? 'transparent',
    border:     frame.strokeColor && frame.strokeWeight
      ? `${frame.strokeWeight}px solid ${frame.strokeColor}`
      : undefined,
    // overflow:hidden is the crop — image can be larger than the frame
    overflow:   frame.image ? 'hidden' : undefined,
    zIndex:     0,
  };

  return (
    <div style={containerCss} data-self={frame.self}>
      {frame.image && (
        <img
          src={frame.image.src}
          alt=""
          style={{
            position: 'absolute',
            left:     `${frame.image.offsetX}px`,
            top:      `${frame.image.offsetY}px`,
            width:    frame.image.width  > 0 ? `${frame.image.width}px`  : '100%',
            height:   frame.image.height > 0 ? `${frame.image.height}px` : '100%',
            // No object-fit — position and scale are controlled by the IDML transform
            display:  'block',
          }}
        />
      )}
    </div>
  );
};
