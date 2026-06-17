// Socket listener placed inside frontend so it can resolve frontend/node_modules
import { io } from 'socket.io-client';

const url = process.env.API_BASE || 'http://localhost:5000';
console.log('Connecting socket client to', url);
const socket = io(url, { reconnectionAttempts: 5 });

socket.on('connect', () => {
  console.log('Socket connected', socket.id);
  try { socket.emit('join_kds'); } catch (e) { console.warn(e && e.message); }
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
