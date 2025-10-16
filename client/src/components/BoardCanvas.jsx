// responsive BoardCanvas.jsx (替換原版)
// client/src/components/BoardCanvas.jsx
import React, { useEffect, useRef } from 'react';

export default function BoardCanvas({
  board = [],
  width = 10,
  height = 20,
  // optional desired max block size; we'll compute best fit
  maxBlockSize = 28,
  minBlockSize = 8,
  containerClass = 'board-canvas-wrap'
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  // compute and draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = window.devicePixelRatio || 1;

    function computeAndDraw() {
      // available CSS pixels for canvas container
      const rect = wrap.getBoundingClientRect();
      const availW = Math.max(20, rect.width);
      const availH = Math.max(20, rect.height);

      // compute best block size to fit WIDTH x HEIGHT into availW x availH
      const blockSizeByW = Math.floor(availW / width);
      const blockSizeByH = Math.floor(availH / height);
      let blockSize = Math.min(blockSizeByW, blockSizeByH);
      blockSize = Math.max(minBlockSize, Math.min(maxBlockSize, blockSize));
      // final canvas css width/height in CSS pixels
      const cssW = blockSize * width;
      const cssH = blockSize * height;

      // set CSS size to canvas element
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      // set actual pixel buffer size for high DPI
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // scale coordinate system for DPR
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // clear
      ctx.clearRect(0, 0, cssW, cssH);

      // draw grid + cells
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const cell = (board[y] && board[y][x]) ? board[y][x] : null;
          if (cell) {
            ctx.fillStyle = cell;
            ctx.fillRect(x * blockSize, y * blockSize, blockSize - 1, blockSize - 1);
          } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
          }
        }
      }
    }

    // initial draw
    computeAndDraw();

    // observe wrapper resize
    const ro = new ResizeObserver(() => computeAndDraw());
    ro.observe(wrap);

    // also listen to orientationchange
    window.addEventListener('orientationchange', computeAndDraw);
    window.addEventListener('resize', computeAndDraw);

    return () => {
      try { ro.disconnect(); } catch (e) {}
      window.removeEventListener('orientationchange', computeAndDraw);
      window.removeEventListener('resize', computeAndDraw);
    };
  }, [board, width, height, maxBlockSize, minBlockSize]);

  return (
    <div ref={wrapRef} className={containerClass} style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
      <canvas ref={canvasRef} />
    </div>
  );
}

