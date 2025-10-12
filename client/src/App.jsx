import React from 'react'
import TetrisGame from './components/TetrisGame'
import Leaderboard from './components/Leaderboard'
import './styles.css'

export default function App() {
  return (
    <div className="app-bg">
      <header className="site-header">
        <div className="brand">
          <div className="brand-title">TETRIS</div>
          <div className="brand-sub">play • score • compete</div>
        </div>

        <div className="header-right">
          <div className="made-by">made by Liang</div>
        </div>
      </header>

      <main className="app-root container">
        <div className="layout">
          <section className="left card">
            <div className="card-header">
              <h2>Play</h2>
            </div>
            <div className="card-body">
              <TetrisGame />
            </div>
          </section>

          <aside className="right card">
            <div className="card-header">
              <h2>Leaderboard</h2>
            </div>
            <div className="card-body">
              <Leaderboard />
            </div>
          </aside>
        </div>

        <footer className="footer-note">
          Tip: Controls — ← → move • ↑ rotate • ↓ soft drop • Space hard drop
        </footer>
      </main>
    </div>
  )
}
