// Establish socket connection
const socket = io('http://localhost:8000', {
    reconnectionAttempts: 5,
    timeout: 10000,
})

// DOM Elements
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('messageInput');
const messageArea = document.getElementById('messageArea');
const typingIndicator = document.getElementById('typingIndicator');
const onlineCountElement = document.getElementById('onlineCount');
const usernameElement = document.getElementById('username');
const userAvatar = document.getElementById('userAvatar');

// App State
let username = '';
let typingTimeout;

// Utility Functions
function generateAvatar(name) {
    return `https://api.dicebear.com/6.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// UI Update Functions
function updateOnlineCount(count) {
    onlineCountElement.textContent = count;
}

function updateTypingIndicator(typingUser) {
    typingIndicator.textContent = typingUser ? `${typingUser} is typing...` : '';
}

function addMessageToChat(messageData, isOutgoing = false) {
    const { id, username, text, timestamp } = messageData;
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', isOutgoing ? 'outgoing' : 'incoming');
    messageElement.id = `message-${id}`;
    
    messageElement.innerHTML = `
        <img src="${generateAvatar(username)}" alt="${username}" class="message-avatar">
        <div class="message-content">
            <div class="message-header">
                <span class="message-username">${escapeHtml(username)}</span>
                <span class="message-timestamp">${formatTimestamp(timestamp)}</span>
            </div>
            <div class="message-text">${escapeHtml(text)}</div>
        </div>
    `;
    
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function addSystemMessage(text) {
    const systemMessage = document.createElement('div');
    systemMessage.classList.add('system-message');
    systemMessage.textContent = text;
    messageArea.appendChild(systemMessage);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// User Interaction Functions
function promptForUsername() {
    return new Promise((resolve) => {
        const name = prompt("Enter your name to join the chat:");
        if (name && name.trim()) {
            resolve(name.trim());
        } else {
            resolve(promptForUsername());
        }
    });
}

async function initializeUser() {
    username = await promptForUsername();
    usernameElement.textContent = username;
    userAvatar.src = generateAvatar(username);
    socket.emit('join', username);
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('send-message', message);
        messageInput.value = '';
        socket.emit('typing', false);
    }
}

function handleTyping() {
    socket.emit('typing', true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('typing', false), 1000);
}

// Event Listeners
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage();
});

messageInput.addEventListener('input', handleTyping);

// Socket Event Handlers
socket.on('connect', () => {
    console.log('Connected to server');
    addSystemMessage('Connected to the chat server.');
    initializeUser();
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    addSystemMessage(`Disconnected from the chat server. Reason: ${reason}`);
});


socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber, 'attempts');
    addSystemMessage('Reconnected to the chat server.');
    socket.emit('join', username);
});

socket.on('chat-history', (messages) => {
    messageArea.innerHTML = '';
    messages.forEach(msg => addMessageToChat(msg, msg.username === username));
});

socket.on('new-message', (messageData) => {
    addMessageToChat(messageData, messageData.username === username);
});

socket.on('user-joined', (name) => {
    addSystemMessage(`${name} joined the chat`);
});

socket.on('user-left', (name) => {
    addSystemMessage(`${name} left the chat`);
});

socket.on('update-online-count', (count) => {
    updateOnlineCount(count);
});

socket.on('user-typing', ({ username, isTyping }) => {
    updateTypingIndicator(isTyping ? username : null);
});

// Error handling
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    addSystemMessage(`Error connecting to the server: ${error.message}`);
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
    addSystemMessage('An error occurred. Please try refreshing the page.');
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    addSystemMessage('Welcome to Wassup 2.0! Connecting to the server...');
});