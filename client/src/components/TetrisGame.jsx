// client/src/components/TetrisGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import BoardCanvas from './BoardCanvas';
import MobileControls from './MobileControls';
import TouchArea from './TouchArea';
import useWindowSize from '../hooks/useWindowSize';
import { io } from 'socket.io-client';

const SERVER = (import.meta.env.VITE_SERVER_URL) || 'http://localhost:4000';
const socket = io(SERVER, { autoConnect: true });

const WIDTH = 10;
const HEIGHT = 20;
const EMPTY = null;

const COLORS = { I:'#00e5ff', J:'#2233ff', L:'#ff9700', O:'#ffd400', S:'#00d944', T:'#b13cff', Z:'#ff3b3b' };
const TETROMINOS = { I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], J:[[1,0,0],[1,1,1],[0,0,0]], L:[[0,0,1],[1,1,1],[0,0,0]], O:[[1,1],[1,1]], S:[[0,1,1],[1,1,0],[0,0,0]], T:[[0,1,0],[1,1,1],[0,0,0]], Z:[[1,1,0],[0,1,1],[0,0,0]] };
const PIECES = Object.keys(TETROMINOS);

function createBoard(){ return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(EMPTY)); }
function cloneMatrix(m){ return m.map(r=>r.slice()); }
function randomPiece(){ const type = PIECES[Math.floor(Math.random()*PIECES.length)]; const matrix = TETROMINOS[type].map(r=>r.slice()); const x = Math.floor(WIDTH/2) - Math.ceil(matrix[0].length/2); const y = -(matrix.length-1); return { type, matrix, x, y }; }
function rotateMatrix(m){ const N = m.length; const res = Array.from({ length: N }, () => Array(N).fill(0)); for(let y=0;y<N;y++){ for(let x=0;x<N;x++){ res[x][N-1-y] = m[y][x]; } } return res; }

export default function TetrisGame(){
  const { width: winW } = useWindowSize();
  const DESKTOP_BREAK = 1200;
  const desktopMax = 48;
  const mobileMax = 28;
  const maxBlock = (winW && winW >= DESKTOP_BREAK) ? desktopMax : mobileMax;

  const [board, setBoard] = useState(createBoard());
  const [piece, setPiece] = useState(randomPiece());
  const [nextPiece, setNextPiece] = useState(randomPiece());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [dropInterval, setDropInterval] = useState(800);
  const [isRunning, setIsRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [skills, setSkills] = useState({ slow: { cooldown:30000, readyAt:0, duration:10000 }, clearRandom:{ cooldown:20000, readyAt:0 }, swapNext:{ cooldown:15000, readyAt:0 } });

  const dropRef = useRef(dropInterval);
  dropRef.current = dropInterval;
  const gameRef = useRef(null);

  // dynamic available height for portrait phones
  useEffect(() => {
    function updateAvailableHeight(){
      try{
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const header = document.querySelector('.site-header');
        const controls = document.querySelector('.mobile-controls');
        const headerH = header ? header.getBoundingClientRect().height : 80;
        const controlsH = controls ? controls.getBoundingClientRect().height : 140;
        const reserved = Math.round(headerH + controlsH + 24);
        const avail = Math.max(220, vh - reserved);
        document.documentElement.style.setProperty('--available-game-height', `${avail}px`);
      }catch(e){
        console.warn('updateAvailableHeight failed', e);
      }
    }
    updateAvailableHeight();
    window.addEventListener('resize', updateAvailableHeight);
    window.addEventListener('orientationchange', updateAvailableHeight);
    setTimeout(updateAvailableHeight, 600);
    return () => { window.removeEventListener('resize', updateAvailableHeight); window.removeEventListener('orientationchange', updateAvailableHeight); };
  }, []);

  function collide(m,posX,posY){
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(!m[y][x]) continue;
        const nx = posX + x, ny = posY + y;
        if(nx < 0 || nx >= WIDTH || ny >= HEIGHT) return true;
        if(ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function getBoardWithPiece(){
    const b = cloneMatrix(board);
    const m = piece.matrix;
    for(let y=0;y<m.length;y++){ for(let x=0;x<m[y].length;x++){ if(m[y][x]){ const bx = piece.x + x; const by = piece.y + y; if(by >= 0 && by < HEIGHT && bx >=0 && bx < WIDTH){ b[by][bx] = COLORS[piece.type]; } } } }
    return b;
  }

  function lockPiece(){
    try{
      const b = cloneMatrix(board);
      const m = piece.matrix;
      for(let y=0;y<m.length;y++){ for(let x=0;x<m[y].length;x++){ if(m[y][x]){ const bx = piece.x + x; const by = piece.y + y; if(by < 0){ setGameOver(true); setIsRunning(false); submitScore(); return; } b[by][bx] = COLORS[piece.type]; } } }
      let cleared = 0;
      const newBoard = b.filter(row => { if(row.every(cell=>cell)){ cleared++; return false; } return true; });
      while(newBoard.length < HEIGHT) newBoard.unshift(Array(WIDTH).fill(EMPTY));
      setBoard(newBoard);
      if(cleared > 0){ const lineScores = [0,40,100,300,1200]; setScore(s => s + (lineScores[cleared] || cleared * 100)); setLines(l => l + cleared); setDropInterval(d => Math.max(80, Math.round(d * 0.98))); }
      setPiece(nextPiece);
      setNextPiece(randomPiece());
    }catch(err){ console.error('lockPiece error', err); }
  }

  function movePiece(dx){
    setPiece(p => { const nx = p.x + dx; if(!collide(p.matrix, nx, p.y)) return { ...p, x: nx }; return p; });
  }
  function hardDrop(){ setPiece(p => { let ny = p.y; while(!collide(p.matrix, p.x, ny+1)) ny++; const newPiece = { ...p, y: ny }; setTimeout(()=>{ lockPiece(); }, 0); return newPiece; }); }
  function softDrop(){ setPiece(p => { if(!collide(p.matrix, p.x, p.y + 1)) return { ...p, y: p.y + 1 }; else { setTimeout(lockPiece, 0); return p; } }); }
  function rotatePiece(){ setPiece(p => { const rotated = rotateMatrix(p.matrix); const kicks = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]]; for(const [kx,ky] of kicks){ if(!collide(rotated, p.x + kx, p.y + ky)) return { ...p, matrix: rotated, x: p.x + kx, y: p.y + ky }; } return p; }); }

  // improved keyboard
  useEffect(() => {
    function isTypingTarget(target){ if(!target) return false; const tag = target.tagName; if(tag === 'INPUT' || tag === 'TEXTAREA') return true; if(target.isContentEditable) return true; return false; }
    function onKeyDown(e){
      const key = e.key;
      const handledKeys = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Spacebar']);
      if(!handledKeys.has(key)) return;
      if(isTypingTarget(document.activeElement)) return;
      const gameHasFocus = (document.activeElement === gameRef.current);
      if(!isRunning && !gameHasFocus) return;
      if(e.cancelable) e.preventDefault();
      if(key === 'ArrowLeft') movePiece(-1);
      else if(key === 'ArrowRight') movePiece(1);
      else if(key === 'ArrowUp') rotatePiece();
      else if(key === 'ArrowDown') softDrop();
      else if(key === ' ' || key === 'Spacebar') { hardDrop(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, board, piece]);
    

  useEffect(()=>{
    if(!isRunning) return;
    const id = setInterval(()=>{ setPiece(p => { if(!collide(p.matrix, p.x, p.y + 1)) return { ...p, y: p.y + 1 }; else { setTimeout(lockPiece, 0); return p; } }); }, dropRef.current);
    return ()=>clearInterval(id);
  }, [isRunning, board, piece]);

  function resetGame(){ setBoard(createBoard()); setPiece(randomPiece()); setNextPiece(randomPiece()); setScore(0); setLines(0); setDropInterval(800); setGameOver(false); setIsRunning(true); }
  async function submitScore(){ try{ await fetch(`${SERVER}/api/score`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ name:'Player', score, lines }) }); }catch(e){ console.warn('submit failed', e); } }

  function canUse(skillKey){ return Date.now() >= (skills[skillKey]?.readyAt || 0); }
  function useSkillSlow(){ if(!canUse('slow')) return; const dur = skills.slow.duration; const prevInterval = dropRef.current; const slowed = Math.max(80, Math.round(prevInterval * 0.35)); setDropInterval(slowed); setTimeout(()=>setDropInterval(prevInterval), dur); setSkills(s=>({ ...s, slow:{ ...s.slow, readyAt: Date.now() + s.slow.cooldown } })); }
  function useSkillClearRandom(){ if(!canUse('clearRandom')) return; setBoard(b=>{ const filled=[]; b.forEach((row,i)=>{ if(row.some(c=>c)) filled.push(i); }); if(filled.length===0) return b; const idx = filled[Math.floor(Math.random()*filled.length)]; const copy = cloneMatrix(b); copy.splice(idx,1); copy.unshift(Array(WIDTH).fill(EMPTY)); return copy; }); setSkills(s=>({ ...s, clearRandom:{ ...s.clearRandom, readyAt: Date.now() + s.clearRandom.cooldown } })); }
  function useSkillSwapNext(){ if(!canUse('swapNext')) return; setPiece(p=>({ ...p, matrix: nextPiece.matrix, type: nextPiece.type })); setNextPiece(randomPiece()); setSkills(s=>({ ...s, swapNext:{ ...s.swapNext, readyAt: Date.now() + s.swapNext.cooldown } })); }

  useEffect(()=>{ socket.on('connect', ()=>console.log('socket connected', socket.id)); socket.on('connect_error', (err)=>console.warn('socket connect_error', err)); socket.on('disconnect', (r)=>console.log('socket disconnected', r)); return ()=>{ socket.off('connect'); socket.off('connect_error'); socket.off('disconnect'); }; }, []);

  function moveLeft(){ movePiece(-1); }
  function moveRight(){ movePiece(1); }
  function rotate(){ rotatePiece(); }
  function soft(){ softDrop(); }
  function hard(){ hardDrop(); }

  const renderBoard = getBoardWithPiece();

  useEffect(()=>{ try{ gameRef.current && gameRef.current.focus(); }catch(e){} }, []);

  return (
    <div ref={gameRef} tabIndex={0} onClick={()=>{ try{ gameRef.current && gameRef.current.focus(); }catch(e){} }} style={{ outline:'none' }} className="game-container">
      <div className="site-header card">
        <div className="brand">
          <div className="brand-title">TETRIS</div>
          <div className="brand-sub">play • score • compete</div>
        </div>
        <div className="header-right">
          <div className="made-by">made by Liang</div>
        </div>
      </div>

      <div className="container">
        <div className="layout">
          <section className="left card">
            <div className="card-header"><h2>Play</h2></div>
            <div className="card-body">
              <TouchArea onLeft={moveLeft} onRight={moveRight} onRotate={rotate} onSoft={soft} onHard={hard}>
                <BoardCanvas board={renderBoard} width={WIDTH} height={HEIGHT} maxBlockSize={maxBlock} />
              </TouchArea>

              <div className="controls desktop-controls" style={{ marginTop:8, justifyContent:'center' }}>
                <button onClick={()=>setIsRunning(r=>!r)} className="skill-btn">{isRunning ? 'Pause' : 'Resume'}</button>
                <button onClick={resetGame} className="skill-btn">Reset</button>
                <button onClick={hardDrop} className="skill-btn">Hard Drop</button>
              </div>

              <div className="controls" style={{ marginTop:8 }}>
                <button className="skill-btn" disabled={!canUse('slow')} onClick={useSkillSlow}>Slow ({canUse('slow') ? 'Ready' : 'CD'})</button>
                <button className="skill-btn" disabled={!canUse('clearRandom')} onClick={useSkillClearRandom}>Clear Random Row</button>
                <button className="skill-btn" disabled={!canUse('swapNext')} onClick={useSkillSwapNext}>Swap Next</button>
              </div>

              <div style={{ marginTop:8 }}>
                <MobileControls onLeft={moveLeft} onRight={moveRight} onRotate={rotate} onSoft={soft} onHard={hard} />
              </div>
            </div>
          </section>

          <aside className="right card">
            <div className="card-header"><h2>Leaderboard</h2></div>
            <div className="card-body">
              <div style={{ marginBottom:8 }}>
                <strong>Next</strong>
                <div style={{ height:90 }}>
                  <BoardCanvas board={(() => {
                    const b = Array.from({ length: 4 }, () => Array(4).fill(EMPTY));
                    nextPiece.matrix.forEach((r, ry) => r.forEach((c, rx) => { if (c) b[ry + 0][rx + 0] = COLORS[nextPiece.type]; }));
                    return b;
                  })()} width={4} height={4} maxBlockSize={maxBlock} />
                </div>
              </div>

              <div style={{ marginBottom:8 }}>
                <div>Score: {score}</div>
                <div>Lines: {lines}</div>
                <div>Game Over: {gameOver ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="footer-note card" style={{ marginTop:12 }}>
          Tip: Controls — ← → move • ↑ rotate • ↓ soft drop • Space hard drop
        </footer>
      </div>
    </div>
  );
}
