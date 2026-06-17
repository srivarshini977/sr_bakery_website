// Simple Socket.IO client to listen for order events (run from frontend folder so node_modules resolve)
try {
  const { io } = require('socket.io-client');
  const url = process.env.API_BASE || 'http://localhost:5000';
  console.log('Connecting socket client to', url);
  const socket = io(url, { reconnectionAttempts: 5 });

  socket.on('connect', () => {
    console.log('Socket connected', socket.id);
    // try to join kds room
    try { socket.emit('join_kds'); } catch (e) {}
  });

  socket.on('order:new', (data) => {
    console.log('order:new', JSON.stringify(data));
  });

  socket.on('order:statusUpdated', (data) => {
    console.log('order:statusUpdated', JSON.stringify(data));
  });

  socket.on('connect_error', (err) => {
    console.warn('connect_error', err.message);
  });
} catch (err) {
  console.error('Socket listener failed to start:', err.message);
}
