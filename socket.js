// socket.js
import io from 'socket.io-client';

const socket = io('http://172.20.10.9:3000', {
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 2000,
  timeout: 10000,
});

export default socket;