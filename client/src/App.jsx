import React from 'react'
import TetrisGame from './components/Leaderboard'
import Leaderboard from './components/TetrisGame'


export default function App() {
return (
<div className="app-root">
<h1>My Tetris</h1>
<div className="layout">
<div className="left">
<TetrisGame />
</div>
<div className="right">
<Leaderboard />
</div>
</div>
</div>
)
}