import React, { useEffect, useRef } from 'react';

export default function BoardCanvas({ board = [], blockSize = 24, width = 10, height = 20 }) {
  const ref = useRef(null);

  useEffect(() => {
    try {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) return;

      // Ensure numeric sizes
      const w = Number(width) || 10;
      const h = Number(height) || 20;
      const bs = Number(blockSize) || 24;

      canvas.width = w * bs;
      canvas.height = h * bs;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!Array.isArray(board)) {
        // nothing to draw
        return;
      }

      board.forEach((row = [], y) => {
        row.forEach((cell, x) => {
          try {
            if (cell) {
              ctx.fillStyle = cell;
              ctx.fillRect(x * bs, y * bs, bs - 1, bs - 1);
            } else {
              ctx.strokeStyle = 'rgba(255,255,255,0.02)';
              ctx.strokeRect(x * bs, y * bs, bs, bs);
            }
          } catch (innerErr) {
            // avoid one cell error breaking whole draw
            console.warn('BoardCanvas cell draw error', innerErr);
          }
        });
      });
    } catch (err) {
      console.error('BoardCanvas draw failed', err);
    }
  }, [board, blockSize, width, height]);

  return <canvas ref={ref} style={{ display: 'block' }} />;
}
