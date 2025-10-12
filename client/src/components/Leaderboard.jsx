// client/src/components/Leaderboard.jsx
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SERVER = (import.meta.env.VITE_SERVER_URL) || 'http://localhost:4000';
const socket = io(SERVER);

export default function Leaderboard(){
  const [list, setList] = useState([]);

  useEffect(()=>{
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`${SERVER}/api/leaderboard`);
        const data = await res.json();
        console.log('Leaderboard fetch response:', data);

        if (!mounted) return;

        if (Array.isArray(data)) {
          setList(data);
        } else if (data && Array.isArray(data.data)) {
          // fallback if your API wraps result in { data: [...] }
          setList(data.data);
        } else if (data && typeof data === 'object') {
          // if it's a single object, convert to array
          setList([data]);
        } else {
          setList([]);
        }
      } catch (err) {
        console.error('Failed to load leaderboard', err);
        if (mounted) setList([]);
      }
    }

    load();

    // socket handler: always keep list as an array
    function onNewScore(s) {
      console.log('socket new-score payload:', s);
      setList(prev => {
        const prevArr = Array.isArray(prev) ? prev : [];
        // prepend new score and keep top 50
        return [s, ...prevArr].slice(0, 50);
      });
    }

    socket.on('new-score', onNewScore);

    return () => {
      mounted = false;
      socket.off('new-score', onNewScore);
    };
  }, []);

  // Ensure we always iterate an array
  const rows = Array.isArray(list) ? list : [];

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <ul>
        {rows.length === 0 ? (
          <li>No scores yet</li>
        ) : (
          rows.map((r, i) => (
            <li key={r._id ?? r.name ?? i}>
              <strong>{r.name ?? 'Anonymous'}</strong> — {r.score ?? 0} pts ({r.lines ?? 0} lines)
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
