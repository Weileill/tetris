import React, { useState, useEffect, useRef } from 'react'
import BoardCanvas from './BoardCanvas'
import io from 'socket.io-client'

const SERVER = (import.meta.env.VITE_SERVER_URL) || 'http://localhost:4000'
const socket = io(SERVER)

const WIDTH = 10
const HEIGHT = 20
const EMPTY = null

const COLORS = {
  I: '#00e5ff', J: '#2233ff', L: '#ff9700', O: '#ffd400', S: '#00d944', T: '#b13cff', Z: '#ff3b3b'
}

const TETROMINOS = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]]
}
const PIECES = Object.keys(TETROMINOS)

function createBoard(){
  return Array.from({length:HEIGHT}, () => Array(WIDTH).fill(EMPTY))
}

function cloneMatrix(m){ return m.map(r => r.slice()) }

function randomPiece(){
  const type = PIECES[Math.floor(Math.random()*PIECES.length)]
  return { type, matrix: TETROMINOS[type].map(r=>r.slice()), x: Math.floor(WIDTH/2)-1, y: 0 }
}

function rotateMatrix(m){
  const N = m.length
  const res = Array.from({length:N},()=>Array(N).fill(0))
  for(let y=0;y<N;y++) for(let x=0;x<N;x++) res[x][N-1-y] = m[y][x]
  return res
}

export default function TetrisGame(){
  const [board, setBoard] = useState(createBoard())
  const [piece, setPiece] = useState(randomPiece())
  const [nextPiece, setNextPiece] = useState(randomPiece())
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [dropInterval, setDropInterval] = useState(800)
  const [isRunning, setIsRunning] = useState(true)
  const [gameOver, setGameOver] = useState(false)

  // Skills state
  const [skills, setSkills] = useState({
    slow: { cooldown: 30000, readyAt: 0, duration: 10000 },
    clearRandom: { cooldown: 20000, readyAt: 0 },
    swapNext: { cooldown: 15000, readyAt: 0 }
  })

  // helper refs
  const dropRef = useRef()
  dropRef.current = dropInterval

  // place piece on board copy (for rendering)
  function getBoardWithPiece(){
    const b = cloneMatrix(board)
    const m = piece.matrix
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]){
          const bx = piece.x + x
          const by = piece.y + y
          if(by>=0 && by<HEIGHT && bx>=0 && bx<WIDTH) b[by][bx] = COLORS[piece.type]
        }
      }
    }
    return b
  }

  function collide(m, posX, posY){
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(!m[y][x]) continue
        const nx = posX + x
        const ny = posY + y
        if(nx<0 || nx>=WIDTH || ny>=HEIGHT) return true
        if(ny>=0 && board[ny][nx]) return true
      }
    }
    return false
  }

  function lockPiece(){
    const b = cloneMatrix(board)
    const m = piece.matrix
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x]){
          const bx = piece.x + x
          const by = piece.y + y
          if(by<0){ // game over
            setGameOver(true)
            setIsRunning(false)
            submitScore()
            return
          }
          b[by][bx] = COLORS[piece.type]
        }
      }
    }

    // clear lines
    let cleared = 0
    const newBoard = b.filter(row => {
      if(row.every(cell => cell)) { cleared++; return false }
      return true
    })
    while(newBoard.length < HEIGHT) newBoard.unshift(Array(WIDTH).fill(EMPTY))

    setBoard(newBoard)
    if(cleared>0){
      // scoring: classic 40/100/300/1200 for 1/2/3/4
      const lineScores = [0,40,100,300,1200]
      setScore(s => s + (lineScores[cleared] || cleared*100))
      setLines(l => l + cleared)
    }

    // next piece
    setPiece(nextPiece)
    setNextPiece(randomPiece())
  }

  function movePiece(dx){
    const nx = piece.x + dx
    if(!collide(piece.matrix, nx, piece.y)) setPiece(p => ({...p, x: nx}))
  }

  function hardDrop(){
    let ny = piece.y
    while(!collide(piece.matrix, piece.x, ny+1)) ny++
    setPiece(p => ({...p, y: ny}))
    lockPiece()
  }

  function softDrop(){
    if(!collide(piece.matrix, piece.x, piece.y+1)) setPiece(p => ({...p, y: p.y+1}))
    else lockPiece()
  }

  function rotatePiece(){
    const rotated = rotateMatrix(piece.matrix)
    // simple wall kicks: try no offset, left, right, up
    const kicks = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]]
    for(const [kx,ky] of kicks){
      if(!collide(rotated, piece.x + kx, piece.y + ky)){
        setPiece(p => ({...p, matrix: rotated, x: p.x + kx, y: p.y + ky}))
        return
      }
    }
    // fail rotate if all kicks blocked
  }

  // keyboard
  useEffect(() => {
    function onKey(e){
      if(!isRunning) return
      if(e.key === 'ArrowLeft') movePiece(-1)
      if(e.key === 'ArrowRight') movePiece(1)
      if(e.key === 'ArrowUp') rotatePiece()
      if(e.key === 'ArrowDown') softDrop()
      if(e.key === ' ') { e.preventDefault(); hardDrop() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [piece, board, isRunning])

  // auto-drop loop
  useEffect(() => {
    if(!isRunning) return
    const id = setInterval(() => {
      if(!collide(piece.matrix, piece.x, piece.y+1)){
        setPiece(p => ({...p, y: p.y+1}))
      } else {
        lockPiece()
      }
    }, dropRef.current)
    return () => clearInterval(id)
  }, [piece, board, isRunning])

  // initialize when game over reset
  function resetGame(){
    setBoard(createBoard())
    setPiece(randomPiece())
    setNextPiece(randomPiece())
    setScore(0)
    setLines(0)
    setDropInterval(800)
    setGameOver(false)
    setIsRunning(true)
  }

  // submit score to server
  async function submitScore(){
    try{
      await fetch(SERVER + '/api/score', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: 'Player', score, lines })
      })
    }catch(e){ console.warn('submit failed', e) }
  }

  // Skills
  function canUse(skillKey){
    return Date.now() >= skills[skillKey].readyAt
  }

  function useSkillSlow(){
    if(!canUse('slow')) return
    const dur = skills.slow.duration
    const old = dropRef.current
    setDropInterval(d => {
      const newInt = Math.max(80, d*0.35)
      setTimeout(() => setDropInterval(old), dur)
      return newInt
    })
    // set cooldown
    setSkills(s => ({...s, slow: {...s.slow, readyAt: Date.now() + s.slow.cooldown}}))
  }

  function useSkillClearRandom(){
    if(!canUse('clearRandom')) return
    // find a random non-empty row and clear it
    const filledRows = []
    board.forEach((row,i) => { if(row.some(c=>c)) filledRows.push(i) })
    if(filledRows.length>0){
      const idx = filledRows[Math.floor(Math.random()*filledRows.length)]
      const b = cloneMatrix(board)
      b.splice(idx,1)
      b.unshift(Array(WIDTH).fill(EMPTY))
      setBoard(b)
    }
    setSkills(s => ({...s, clearRandom: {...s.clearRandom, readyAt: Date.now() + s.clearRandom.cooldown}}))
  }

  function useSkillSwapNext(){
    if(!canUse('swapNext')) return
    setPiece(p => ({...p, matrix: nextPiece.matrix, type: nextPiece.type}))
    setNextPiece(randomPiece())
    setSkills(s => ({...s, swapNext: {...s.swapNext, readyAt: Date.now() + s.swapNext.cooldown}}))
  }

  // render board with piece
  const renderBoard = getBoardWithPiece()

  return (
    <div>
      <div style={{display:'flex', gap:12, alignItems:'flex-start'}}>
        <div>
          <BoardCanvas board={renderBoard} width={WIDTH} height={HEIGHT} />
          <div className="controls">
            <button onClick={()=>setIsRunning(r=>!r)} className="skill-btn">{isRunning? 'Pause' : 'Resume'}</button>
            <button onClick={resetGame} className="skill-btn">Reset</button>
            <button onClick={hardDrop} className="skill-btn">Hard Drop</button>
          </div>
          <div className="controls" style={{marginTop:8}}>
            <button className="skill-btn" disabled={!canUse('slow')} onClick={useSkillSlow}>Slow ({canUse('slow')? 'Ready' : 'CD'})</button>
            <button className="skill-btn" disabled={!canUse('clearRandom')} onClick={useSkillClearRandom}>Clear Random Row</button>
            <button className="skill-btn" disabled={!canUse('swapNext')} onClick={useSkillSwapNext}>Swap Next</button>
          </div>
        </div>

        <div style={{width:220}}>
          <div style={{marginBottom:8}}>
            <strong>Next</strong>
            <div style={{height:90}}>
              <BoardCanvas board={(() => {
                // small 4x4 board to render nextPiece
                const b = Array.from({length:4}, ()=>Array(4).fill(EMPTY))
                nextPiece.matrix.forEach((r,ry)=> r.forEach((c,rx)=> { if(c) b[ry+0][rx+0]=COLORS[nextPiece.type] }))
                return b
              })()} width={4} height={4} blockSize={18} />
            </div>
          </div>

          <div style={{marginBottom:8}}>
            <div>Score: {score}</div>
            <div>Lines: {lines}</div>
            <div>Game Over: {gameOver? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}