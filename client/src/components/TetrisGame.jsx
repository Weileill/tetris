// client/src/components/TetrisGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import BoardCanvas from './BoardCanvas';
import MobileControls from './MobileControls';
import TouchArea from './TouchArea';
import { io } from 'socket.io-client';

const SERVER = (import.meta.env.VITE_SERVER_URL) || 'http://localhost:4000';
const socket = io(SERVER, { autoConnect: true });

const WIDTH = 10;
const HEIGHT = 20;
const EMPTY = null;

const COLORS = {
  I: '#00e5ff',
  J: '#2233ff',
  L: '#ff9700',
  O: '#ffd400',
  S: '#00d944',
  T: '#b13cff',
  Z: '#ff3b3b'
};

const TETROMINOS = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
};
const PIECES = Object.keys(TETROMINOS);

function createBoard() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(EMPTY));
}
function cloneMatrix(m) {
  return m.map(r => r.slice());
}
function randomPiece() {
  const type = PIECES[Math.floor(Math.random() * PIECES.length)];
  // center x so piece appears near middle; adjust spawn y for tall pieces (I)
  const matrix = TETROMINOS[type].map(r => r.slice());
  const x = Math.floor(WIDTH / 2) - Math.ceil(matrix[0].length / 2);
  const y = - (matrix.length - 1); // spawn slightly above visible board (works with collision check)
  return { type, matrix, x, y };
}
function rotateMatrix(m) {
  const N = m.length;
  const res = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      res[x][N - 1 - y] = m[y][x];
    }
  }
  return res;
}

export default function TetrisGame() {
  const [board, setBoard] = useState(createBoard());
  const [piece, setPiece] = useState(randomPiece());
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [dropInterval, setDropInterval] = useState(800);
  const [isRunning, setIsRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);

  // Skills (simple cooldown based)
  const [skills, setSkills] = useState({
    slow: { cooldown: 30000, readyAt: 0, duration: 10000 },
    clearRandom: { cooldown: 20000, readyAt: 0 },
    swapNext: { cooldown: 15000, readyAt: 0 }
  });

  // Refs for stable interval access
  const dropRef = useRef(dropInterval);
  dropRef.current = dropInterval;

  // Helper: check collision of matrix at pos
  function collide(m, posX, posY) {
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const nx = posX + x;
        const ny = posY + y;
        if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  // Place piece (for rendering)
  function getBoardWithPiece() {
    const b = cloneMatrix(board);
    const m = piece.matrix;
    for (let y = 0; y < m.length; y++) {
      for (let x = 0; x < m[y].length; x++) {
        if (m[y][x]) {
          const bx = piece.x + x;
          const by = piece.y + y;
          if (by >= 0 && by < HEIGHT && bx >= 0 && bx < WIDTH) {
            b[by][bx] = COLORS[piece.type];
          }
        }
      }
    }
    return b;
  }

  // Lock piece into board and spawn next
  function lockPiece() {
    try {
      const b = cloneMatrix(board);
      const m = piece.matrix;
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (m[y][x]) {
            const bx = piece.x + x;
            const by = piece.y + y;
            if (by < 0) {
              // Piece locked above the board: game over
              setGameOver(true);
              setIsRunning(false);
              submitScore();
              return;
            }
            b[by][bx] = COLORS[piece.type];
          }
        }
      }

      // clear lines
      let cleared = 0;
      const newBoard = b.filter(row => {
        if (row.every(cell => cell)) { cleared++; return false; }
        return true;
      });
      while (newBoard.length < HEIGHT) newBoard.unshift(Array(WIDTH).fill(EMPTY));

      setBoard(newBoard);
      if (cleared > 0) {
        const lineScores = [0, 40, 100, 300, 1200];
        setScore(s => s + (lineScores[cleared] || cleared * 100));
        setLines(l => l + cleared);
        // optionally speed up drop a bit per lines cleared
        setDropInterval(d => Math.max(80, Math.round(d * 0.98)));
      }

      setPiece(nextPiece);
      setNextPiece(randomPiece());
    } catch (err) {
      console.error('lockPiece error', err);
    }
  }

  // Movement helpers used by desktop and mobile
  function movePiece(dx) {
    setPiece(p => {
      const nx = p.x + dx;
      if (!collide(p.matrix, nx, p.y)) {
        return { ...p, x: nx };
      }
      return p;
    });
  }

  function hardDrop() {
    setPiece(p => {
      let ny = p.y;
      while (!collide(p.matrix, p.x, ny + 1)) ny++;
      // lock immediately after setting y
      const newPiece = { ...p, y: ny };
      // Because lockPiece uses current piece & board states, we call lock after setPiece completes.
      // We'll perform lock after a tiny tick to ensure state updated.
      setTimeout(() => {
        // If piece hasn't changed (simple guard), call lockPiece using latest piece state
        lockPiece();
      }, 0);
      return newPiece;
    });
  }

  function softDrop() {
    setPiece(p => {
      if (!collide(p.matrix, p.x, p.y + 1)) {
        return { ...p, y: p.y + 1 };
      } else {
        // can't move down -> lock
        // call lockPiece on next tick to allow state flush
        setTimeout(lockPiece, 0);
        return p;
      }
    });
  }

  function rotatePiece() {
    setPiece(p => {
      const rotated = rotateMatrix(p.matrix);
      const kicks = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]];
      for (const [kx, ky] of kicks) {
        if (!collide(rotated, p.x + kx, p.y + ky)) {
          return { ...p, matrix: rotated, x: p.x + kx, y: p.y + ky };
        }
      }
      return p;
    });
  }

  // Keyboard controls (desktop)
  useEffect(() => {
    function onKey(e) {
      if (!isRunning) return;
      if (e.key === 'ArrowLeft') movePiece(-1);
      if (e.key === 'ArrowRight') movePiece(1);
      if (e.key === 'ArrowUp') rotatePiece();
      if (e.key === 'ArrowDown') softDrop();
      if (e.key === ' ') { e.preventDefault(); hardDrop(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning, board, piece]);

  // Auto-drop loop
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      // prefer direct mutation via setPiece to avoid stale closures
      setPiece(p => {
        if (!collide(p.matrix, p.x, p.y + 1)) {
          return { ...p, y: p.y + 1 };
        } else {
          // lock
          setTimeout(lockPiece, 0);
          return p;
        }
      });
    }, dropRef.current);
    return () => clearInterval(id);
  }, [isRunning, board, piece]); // dependencies ensure re-evaluation

  // Reset game
  function resetGame() {
    setBoard(createBoard());
    setPiece(randomPiece());
    setNextPiece(randomPiece());
    setScore(0);
    setLines(0);
    setDropInterval(800);
    setGameOver(false);
    setIsRunning(true);
  }

  // Submit score to server
  async function submitScore() {
    try {
      await fetch(`${SERVER}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Player', score, lines })
      });
    } catch (e) {
      console.warn('submit failed', e);
    }
  }

  // Skills usage
  function canUse(skillKey) {
    return Date.now() >= (skills[skillKey]?.readyAt || 0);
  }

  function useSkillSlow() {
    if (!canUse('slow')) return;
    const dur = skills.slow.duration;
    const prevInterval = dropRef.current;
    const slowed = Math.max(80, Math.round(prevInterval * 0.35));
    setDropInterval(slowed);
    setTimeout(() => setDropInterval(prevInterval), dur);
    setSkills(s => ({ ...s, slow: { ...s.slow, readyAt: Date.now() + s.slow.cooldown } }));
  }

  function useSkillClearRandom() {
    if (!canUse('clearRandom')) return;
    setBoard(b => {
      const filled = [];
      b.forEach((row, i) => { if (row.some(c => c)) filled.push(i); });
      if (filled.length === 0) return b;
      const idx = filled[Math.floor(Math.random() * filled.length)];
      const copy = cloneMatrix(b);
      copy.splice(idx, 1);
      copy.unshift(Array(WIDTH).fill(EMPTY));
      return copy;
    });
    setSkills(s => ({ ...s, clearRandom: { ...s.clearRandom, readyAt: Date.now() + s.clearRandom.cooldown } }));
  }

  function useSkillSwapNext() {
    if (!canUse('swapNext')) return;
    setPiece(p => ({ ...p, matrix: nextPiece.matrix, type: nextPiece.type }));
    setNextPiece(randomPiece());
    setSkills(s => ({ ...s, swapNext: { ...s.swapNext, readyAt: Date.now() + s.swapNext.cooldown } }));
  }

  // Small debug effect for monitoring
  useEffect(() => {
    // console.log('state', { score, lines, isRunning, dropInterval });
  }, [score, lines, isRunning, dropInterval]);

  // Exposed wrapper functions for mobile controls
  function moveLeft() { movePiece(-1); }
  function moveRight() { movePiece(1); }
  function rotate() { rotatePiece(); }
  function soft() { softDrop(); }
  function hard() { hardDrop(); }

  // Rendered board includes current piece
  const renderBoard = getBoardWithPiece();

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* TouchArea wraps the canvas to capture gestures */}
          <TouchArea onLeft={moveLeft} onRight={moveRight} onRotate={rotate} onSoft={soft} onHard={hard}>
            <BoardCanvas board={renderBoard} width={WIDTH} height={HEIGHT} />
          </TouchArea>

          <div className="controls" style={{ marginTop: 8, justifyContent: 'center' }}>
            <button onClick={() => setIsRunning(r => !r)} className="skill-btn">{isRunning ? 'Pause' : 'Resume'}</button>
            <button onClick={resetGame} className="skill-btn">Reset</button>
            <button onClick={hardDrop} className="skill-btn">Hard Drop</button>
          </div>

          <div className="controls" style={{ marginTop: 8 }}>
            <button className="skill-btn" disabled={!canUse('slow')} onClick={useSkillSlow}>Slow ({canUse('slow') ? 'Ready' : 'CD'})</button>
            <button className="skill-btn" disabled={!canUse('clearRandom')} onClick={useSkillClearRandom}>Clear Random Row</button>
            <button className="skill-btn" disabled={!canUse('swapNext')} onClick={useSkillSwapNext}>Swap Next</button>
          </div>

          {/* Mobile virtual controls (always present but CSS can hide on desktop if needed) */}
          <div style={{ marginTop: 8 }}>
            <MobileControls onLeft={moveLeft} onRight={moveRight} onRotate={rotate} onSoft={soft} onHard={hard} />
          </div>
        </div>

        <div style={{ width: 220 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Next</strong>
            <div style={{ height: 90 }}>
              <BoardCanvas board={(() => {
                const b = Array.from({ length: 4 }, () => Array(4).fill(EMPTY));
                nextPiece.matrix.forEach((r, ry) => r.forEach((c, rx) => { if (c) b[ry + 0][rx + 0] = COLORS[nextPiece.type]; }));
                return b;
              })()} width={4} height={4} blockSize={18} />
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div>Score: {score}</div>
            <div>Lines: {lines}</div>
            <div>Game Over: {gameOver ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
