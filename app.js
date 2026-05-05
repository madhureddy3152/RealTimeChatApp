'use strict';

const loginPage = document.querySelector('#login-page');
const chatPage = document.querySelector('#chat-page');
const loginForm = document.querySelector('#login-form');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#message-area');
const onlineUsersList = document.querySelector('#online-users-list');
const leaveBtn = document.querySelector('#leave-btn');

let stompClient = null;
let username = null;

const colors = [
    '#10b981', '#059669', '#0d9488', '#0f766e',
    '#22d3ee', '#0891b2', '#fbbf24', '#f59e0b',
    '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'
];

function getAvatarColor(messageSender) {
    let hash = 0;
    for (let i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}



function connect(event) {
    username = document.querySelector('#name').value.trim();

    if (username) {
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        const isGitHubPages = window.location.hostname.includes('github.io');
        // Updated Bridge URL (Serveo)
        const publicTunnelUrl = 'https://017b1b9e5004b8d3-103-80-162-171.serveousercontent.com';
        const socketUrl = isGitHubPages ? `${publicTunnelUrl}/ws` : `http://localhost:8082/ws`;

        if (isGitHubPages) {
            console.log("Connected via public bridge: " + publicTunnelUrl);
        }

        const socket = new SockJS(socketUrl);
        stompClient = Stomp.over(socket);

        // Disable debug logging to keep console clean
        stompClient.debug = null;

        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Tell your username to the server
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    );
}

function onError(error) {
    console.error('Could not connect to WebSocket server.', error);
    // Show error message on login page
    let errorMsg = loginForm.querySelector('.error-msg');
    if (!errorMsg) {
        errorMsg = document.createElement('p');
        errorMsg.classList.add('error-msg');
        errorMsg.style.color = '#ff4444';
        errorMsg.style.marginTop = '10px';
        loginForm.appendChild(errorMsg);
    }
    if (window.location.hostname.includes('github.io')) {
        errorMsg.textContent = 'GitHub Pages cannot connect to a local backend. Please run the project locally in VS Code (F5) to use the chat!';
    } else {
        errorMsg.textContent = 'Connection failed. Please ensure the backend is running and try again.';
    }
    
    loginPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
}

function sendMessage(event) {
    const messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        const chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    const messageElement = document.createElement('li');

    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined the chat';
        messageElement.textContent = message.content;
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left the chat';
        messageElement.textContent = message.content;
    } else {
        messageElement.classList.add('chat-message');
        
        // Determine if message is from the current user or someone else
        if (message.sender === username) {
            messageElement.classList.add('sender');
        } else {
            messageElement.classList.add('receiver');
        }

        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box');
        messageBox.textContent = message.content;

        const messageInfo = document.createElement('div');
        messageInfo.classList.add('message-info');
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (message.sender === username) {
            messageInfo.innerHTML = `<span>${timestamp}</span>`;
        } else {
            const userColor = getAvatarColor(message.sender);
            messageInfo.innerHTML = `<span style="color: ${userColor}; font-weight: 600;">${message.sender}</span><span>${timestamp}</span>`;
        }

        messageElement.appendChild(messageBox);
        messageElement.appendChild(messageInfo);
    }

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;

    // Update Online Users List
    if (message.onlineUsers) {
        updateOnlineUsers(message.onlineUsers);
    }
}

function updateOnlineUsers(users) {
    if (!users || !Array.isArray(users)) return;
    
    onlineUsersList.innerHTML = '';
    users.sort().forEach(user => {
        const li = document.createElement('li');
        
        const dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.marginRight = '10px';
        dot.style.backgroundColor = getAvatarColor(user);
        
        li.appendChild(dot);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = user;
        if (user === username) {
            nameSpan.textContent += ' (You)';
        }
        li.appendChild(nameSpan);
        
        onlineUsersList.appendChild(li);
    });
}

function leaveChat() {
    if (stompClient) {
        // We disconnect, which triggers the SessionDisconnectEvent on the server
        stompClient.disconnect();
    }
    loginPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
    messageArea.innerHTML = '';
    username = null;
}

loginForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
leaveBtn.addEventListener('click', leaveChat);
