// responsive BoardCanvas.jsx (替換原版)
// client/src/components/BoardCanvas.jsx
// client/src/components/BoardCanvas.jsx
import React, { useEffect, useRef } from 'react';

export default function BoardCanvas({
  board = [],
  width = 10,
  height = 20,
  maxBlockSize = 28,
  minBlockSize = 8,
  containerClass = 'board-canvas-wrap'
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if(!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;

    function computeAndDraw() {
      const rect = wrap.getBoundingClientRect();
      const availW = Math.max(24, rect.width);
      const availH = Math.max(24, rect.height);

      const blockSizeByW = Math.floor(availW / width);
      const blockSizeByH = Math.floor(availH / height);
      let blockSize = Math.min(blockSizeByW, blockSizeByH);
      blockSize = Math.max(minBlockSize, Math.min(maxBlockSize, blockSize));

      const cssW = blockSize * width;
      const cssH = blockSize * height;

      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);

      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,cssW,cssH);

      // draw grid + cells if board provided (board[y][x] should be color string or null)
      for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
          const cell = (board[y] && board[y][x]) ? board[y][x] : null;
          if(cell){
            ctx.fillStyle = cell;
            ctx.fillRect(x*blockSize, y*blockSize, blockSize-1, blockSize-1);
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.strokeRect(x*blockSize+0.5, y*blockSize+0.5, blockSize-1, blockSize-1);
          }
        }
      }
    }

    computeAndDraw();
    const ro = new ResizeObserver(computeAndDraw);
    ro.observe(wrap);
    window.addEventListener('resize', computeAndDraw);
    window.addEventListener('orientationchange', computeAndDraw);
    return () => {
      try { ro.disconnect(); } catch(e) {}
      window.removeEventListener('resize', computeAndDraw);
      window.removeEventListener('orientationchange', computeAndDraw);
    };
  }, [board, width, height, maxBlockSize, minBlockSize]);

  return (
    <div ref={wrapRef} className={containerClass} style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
      <canvas ref={canvasRef} />
    </div>
  );
}
