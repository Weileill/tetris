// client/src/components/TouchArea.jsx
import React, { useRef } from 'react';
import './mobile-controls.css';

export default function TouchArea({ onLeft, onRight, onRotate, onSoft, onHard, children }) {
  const t = useRef({ x:0, y:0, time:0, lastTap:0 });

  function onTouchStart(e) {
    const p = e.touches ? e.touches[0] : e;
    t.current.x = p.clientX;
    t.current.y = p.clientY;
    t.current.time = Date.now();
  }

  function onTouchEnd(e) {
    const now = Date.now();
    const dt = now - t.current.time;
    // if touches available use changedTouches
    const p = (e.changedTouches && e.changedTouches[0]) || e;
    const dx = (p.clientX || 0) - t.current.x;
    const dy = (p.clientY || 0) - t.current.y;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const TAP_THRESHOLD = 12; // px
    const SWIPE_THRESHOLD = 40; // px

    if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD && dt < 300) {
      // tap -> rotate; double-tap -> hard drop
      if (now - t.current.lastTap < 350) {
        onHard();
        t.current.lastTap = 0;
      } else {
        onRotate();
        t.current.lastTap = now;
      }
      return;
    }

    // horizontal swipe
    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (dx > 0) onRight(); else onLeft();
      return;
    }

    // vertical swipe down = soft drop
    if (absY > absX && dy > SWIPE_THRESHOLD) {
      onSoft();
      return;
    }
  }

  return (
    <div
      className="touch-area"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={(e) => onTouchStart(e)}
      onMouseUp={(e) => onTouchEnd(e)}
      role="presentation"
    >
      {children}
    </div>
  );
}
