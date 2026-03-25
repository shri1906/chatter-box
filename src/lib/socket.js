import { io } from 'socket.io-client';

let socket = null;

export const getSocket = (token) => {
  // If token changed or socket doesn't exist, create fresh
  if (!socket || (token && socket._authToken !== token)) {
    if (socket) { socket.disconnect(); socket = null; }
    socket = io({
      path: '/api/socket',
      autoConnect: false,
      auth: { token },   // sent in handshake → verified by server middleware
    });
    socket._authToken = token;
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
