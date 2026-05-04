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
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

function connect(event) {
    username = document.querySelector('#name').value.trim();

    if (username) {
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        // Use the absolute URL if frontend is not served by Spring Boot
        const socket = new SockJS('http://localhost:8082/ws');
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
    console.error('Could not connect to WebSocket server. Please refresh this page to try again!');
    alert('Could not connect to WebSocket server. Is the backend running on port 8082?');
    // revert to login page
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
            messageInfo.innerHTML = `<span>${message.sender}</span><span>${timestamp}</span>`;
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
    onlineUsersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        if (user === username) {
            li.textContent += ' (You)';
        }
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
