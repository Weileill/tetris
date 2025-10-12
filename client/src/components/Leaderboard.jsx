import React, { useEffect, useState } from 'react'
import io from 'socket.io-client'
const SERVER = (import.meta.env.VITE_SERVER_URL) || 'http://localhost:4000'
const socket = io(SERVER)

export default function Leaderboard(){
  const [list, setList] = useState([])

  useEffect(()=>{
    fetch(SERVER + '/api/leaderboard').then(r=>r.json()).then(setList).catch(()=>setList([]))

    socket.on('new-score', s => {
      // naive: prepend then refetch top list
      setList(prev => {
        const copy = [s, ...prev].slice(0,50)
        return copy
      })
    })

    return () => socket.off('new-score')
  }, [])

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <ul>
        {list.map((r,i)=> (
          <li key={i}><strong>{r.name}</strong> — {r.score} pts ({r.lines} lines)</li>
        ))}
      </ul>
    </div>
  )
}