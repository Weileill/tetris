// client/src/components/MobileControls.jsx
// client/src/components/MobileControls.jsx
import React, { useRef } from 'react';
import './mobile-controls.css';

export default function MobileControls({ onLeft, onRight, onRotate, onSoft, onHard }) {
  const repeatRef = useRef(null);

  function startRepeat(fn, interval = 120, e) {
    if (e && e.cancelable) e.preventDefault();
    if (repeatRef.current) clearInterval(repeatRef.current);
    try { fn(); } catch (err) { console.warn('startRepeat call failed', err); }
    repeatRef.current = setInterval(() => {
      try { fn(); } catch (err) { console.warn('repeat call failed', err); }
    }, interval);
  }
  function stopRepeat(e) {
    if (e && e.cancelable) e.preventDefault();
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }

  // small helper to attach both pointer and touch handlers
  const wrapHandlers = {
    onPointerDown: (e) => startRepeat(onLeft, 120, e),
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onTouchStart: (e) => startRepeat(onLeft, 120, e),
    onTouchEnd: stopRepeat,
  };

  return (
    <div className="mobile-controls" onContextMenu={(e)=>e.preventDefault()}>
      {/* Left */}
      <button
        className="mc-btn mc-left"
        onPointerDown={(e)=>startRepeat(onLeft,120,e)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onTouchStart={(e)=>startRepeat(onLeft,120,e)}
        onTouchEnd={stopRepeat}
        aria-label="left"
      >◀</button>

      {/* Middle column */}
      <div className="mc-mid" style={{display:'flex', gap:8}}>
        <button
          className="mc-btn mc-rotate"
          onPointerDown={(e)=>{ if (e.cancelable) e.preventDefault(); onRotate(); }}
          onTouchStart={(e)=>{ if (e.cancelable) e.preventDefault(); onRotate(); }}
          aria-label="rotate"
        >⟳</button>

        <button
          className="mc-btn mc-soft"
          onPointerDown={(e)=>startRepeat(onSoft,80,e)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onTouchStart={(e)=>startRepeat(onSoft,80,e)}
          onTouchEnd={stopRepeat}
          aria-label="soft"
        >↓</button>
      </div>

      {/* Right */}
      <button
        className="mc-btn mc-right"
        onPointerDown={(e)=>startRepeat(onRight,120,e)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onTouchStart={(e)=>startRepeat(onRight,120,e)}
        onTouchEnd={stopRepeat}
        aria-label="right"
      >▶</button>

      {/* Hard drop - separate small button */}
      <button
        className="mc-btn mc-hard"
        onPointerDown={(e)=>{ if (e.cancelable) e.preventDefault(); onHard(); }}
        onTouchStart={(e)=>{ if (e.cancelable) e.preventDefault(); onHard(); }}
        aria-label="hard-drop"
        style={{marginLeft:12}}
      >⤓</button>
    </div>
  );
}
