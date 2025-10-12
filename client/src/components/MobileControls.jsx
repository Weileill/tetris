// client/src/components/MobileControls.jsx
import React, { useRef } from 'react';
import './mobile-controls.css';

export default function MobileControls({ onLeft, onRight, onRotate, onSoft, onHard }) {
  const repeatRef = useRef(null);

  function startRepeat(fn, interval = 120) {
    if (repeatRef.current) clearInterval(repeatRef.current);
    fn();
    repeatRef.current = setInterval(fn, interval);
  }
  function stopRepeat() {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }

  // pointerDown events work for both mouse and touch
  return (
    <div className="mobile-controls">
      <button
        className="mc-btn mc-left"
        onPointerDown={() => startRepeat(onLeft)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
      >◀</button>

      <div className="mc-mid">
        <button className="mc-btn mc-rotate" onPointerDown={() => onRotate()}>⟳</button>
        <button
          className="mc-btn mc-soft"
          onPointerDown={() => startRepeat(onSoft, 80)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
        >↓</button>
      </div>

      <button
        className="mc-btn mc-right"
        onPointerDown={() => startRepeat(onRight)}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
      >▶</button>

      <button className="mc-btn mc-hard" onClick={onHard}>⤓</button>
    </div>
  );
}
