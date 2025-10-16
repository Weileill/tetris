// responsive BoardCanvas.jsx (替換原版)
import React, { useEffect, useRef } from 'react';

export default function BoardCanvas({ board = [], blockSize = 24, width = 10, height = 20 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;

    // logical pixel size
    const logicalW = width * blockSize;
    const logicalH = height * blockSize;

    // set backing store size (for crisp scaling)
    canvas.width = Math.round(logicalW * ratio);
    canvas.height = Math.round(logicalH * ratio);

    // set CSS display size (allow responsive shrink)
    canvas.style.width = Math.min(logicalW, canvas.parentElement.clientWidth) + 'px';
    canvas.style.height = (canvas.style.width.replace('px','') / logicalW * logicalH) + 'px';

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0,0,canvas.width, canvas.height);

    if(!Array.isArray(board)) return;

    board.forEach((row,y) => {
      row.forEach((cell,x) => {
        if(cell){
          ctx.fillStyle = cell;
          ctx.fillRect(x*blockSize, y*blockSize, blockSize-1, blockSize-1);
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.02)';
          ctx.strokeRect(x*blockSize, y*blockSize, blockSize, blockSize);
        }
      });
    });
  }, [board, blockSize, width, height]);

  return <canvas ref={ref} style={{display:'block', maxWidth:'100%'}} />;
}
