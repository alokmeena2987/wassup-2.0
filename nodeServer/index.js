const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

const PORT = process.env.PORT || 8000;


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected users
const users = new Map();

// Store chat messages
const chatMessages = [];
const MAX_MESSAGES = 50;

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    users.set(socket.id, username);
    io.emit('user-joined', username);
    
    // Send recent chat history to the new user
    socket.emit('chat-history', chatMessages);
    
    // Update online users count
    io.emit('update-online-count', users.size);
    
    console.log(`${username} joined the chat`);
  });

  // Handle incoming messages
  socket.on('send-message', (message) => {
    const username = users.get(socket.id);
    const messageData = {
      id: Date.now(),
      username,
      text: message,
      timestamp: new Date().toISOString()
    };

    // Store the message
    chatMessages.push(messageData);
    if (chatMessages.length > MAX_MESSAGES) {
      chatMessages.shift();
    }

    // Broadcast the message to all connected clients
    io.emit('new-message', messageData);
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      io.emit('user-left', username);
      
      // Update online users count
      io.emit('update-online-count', users.size);
      
      console.log(`${username} left the chat`);
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const username = users.get(socket.id);
    socket.broadcast.emit('user-typing', { username, isTyping });
  });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });