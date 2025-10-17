import { useState, useEffect } from 'react';

export default function useWindowSize() {
  const isClient = typeof window !== 'undefined';
  const [size, setSize] = useState({
    width: isClient ? window.innerWidth : 0,
    height: isClient ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (!isClient) return undefined;
    function onResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [isClient]);

  return size;
}