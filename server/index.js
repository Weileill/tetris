const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Score = require('./models/Score');


const app = express();
app.use(cors());
app.use(express.json());


const server = http.createServer(app);
const io = new Server(server, {
cors: { origin: '*' }
});


// Replace with your MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tetrisdb';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('Mongo connected'))
.catch(err => console.error(err));


// API: get leaderboard (top 50)
app.get('/api/leaderboard', async (req, res) => {
try {
const top = await Score.find().sort({ score: -1, date: 1 }).limit(50).lean();
res.json(top);
} catch (err) {
res.status(500).json({ error: 'db error' });
}
});


// API: submit score
app.post('/api/score', async (req, res) => {
try {
const { name = 'Anonymous', score = 0, lines = 0 } = req.body;
const doc = await Score.create({ name, score, lines, date: new Date() });


// broadcast new score to clients
io.emit('new-score', { name: doc.name, score: doc.score, lines: doc.lines });


res.json({ ok: true, id: doc._id });
} catch (err) {
res.status(500).json({ error: 'db error' });
}
});


// Socket.IO connection for real-time updates
io.on('connection', socket => {
console.log('socket connected', socket.id);
socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});


const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server listening on', PORT));