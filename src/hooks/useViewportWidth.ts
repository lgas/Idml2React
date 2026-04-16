import { useState, useEffect } from 'react';

/**
 * Returns the current viewport width in px, updated on every resize.
 */
export const useViewportWidth = (): number => {
  const [width, setWidth] = useState(() => document.documentElement.clientWidth);

  useEffect(() => {
    const observer = new ResizeObserver(() => setWidth(document.documentElement.clientWidth));
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  return width;
};
