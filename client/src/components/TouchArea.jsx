// client/src/components/TouchArea.jsx
// client/src/components/TouchArea.jsx
import React, { useRef } from 'react';
import './mobile-controls.css';

export default function TouchArea({ onLeft, onRight, onRotate, onSoft, onHard, children }) {
  const t = useRef({ x:0, y:0, time:0, lastTap:0 });

  function onTouchStart(e) {
    if (e.cancelable) e.preventDefault();
    const p = e.touches ? e.touches[0] : (e.pointerType ? e : e);
    t.current.x = p.clientX;
    t.current.y = p.clientY;
    t.current.time = Date.now();
  }

  function onTouchEnd(e) {
    if (e.cancelable) e.preventDefault();
    const now = Date.now();
    const dt = now - t.current.time;
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

    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (dx > 0) onRight(); else onLeft();
      return;
    }

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
      onPointerDown={onTouchStart}
      onPointerUp={onTouchEnd}
      role="presentation"
    >
      {children}
    </div>
  );
}
