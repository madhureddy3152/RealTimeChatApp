'use strict';

const loginPage = document.querySelector('#login-page');
const chatPage = document.querySelector('#chat-page');
const loginForm = document.querySelector('#login-form');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#message-area');
const onlineUsersList = document.querySelector('#online-users-list');
const leaveBtn = document.querySelector('#leave-btn');
const menuToggle = document.querySelector('#menu-toggle');
const chatDropdown = document.querySelector('#chat-dropdown');
const profileToggle = document.querySelector('#profile-toggle');
const profileDropdown = document.querySelector('#profile-dropdown');
const profileLeaveBtn = document.querySelector('#profile-leave-btn');
const settingsBtn = document.querySelector('#settings-btn');
const settingsBtnRoom = document.querySelector('#settings-btn-room');
const settingsModal = document.querySelector('#settings-modal');
const closeSettings = document.querySelector('#close-settings');
const saveSettings = document.querySelector('#save-settings');
const themeSelect = document.querySelector('#theme-select');
const currentUserInitial = document.querySelector('#current-user-initial');

let stompClient = null;
let username = null;

// Color palette for avatars
const avatarColors = [
    '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e',
    '#fb923c', '#facc15', '#4ade80', '#2dd4bf',
    '#22d3ee', '#3b82f6', '#6366f1', '#4338ca'
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = 31 * hash + name.charCodeAt(i);
    }
    return avatarColors[Math.abs(hash % avatarColors.length)];
}

function getSocketUrl() {
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
        return null;
    }
    // Use relative path when served from the same origin
    return `/ws`;
}

function connect(event) {
    username = document.querySelector('#name').value.trim();

    if (username) {
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        currentUserInitial.textContent = username.charAt(0).toUpperCase();

        const socketUrl = getSocketUrl();
        if (!socketUrl) {
            alert('GitHub Pages connection logic not implemented.');
            return;
        }

        const socket = new SockJS(socketUrl);
        stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

async function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Fetch chat history
    try {
        const response = await fetch('/api/messages');
        const history = await response.json();
        history.forEach(msg => {
            displayMessage(msg);
        });
    } catch (err) {
        console.error('Error fetching chat history:', err);
    }

    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({ sender: username, type: 'JOIN' })
    );
}

function onError(error) {
    console.error('Could not connect to WebSocket server.', error);
    loginPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
    alert('Connection failed. Please ensure the backend is running.');
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
    displayMessage(message);
}

function displayMessage(message) {
    // Clear welcome notice on first message
    const welcome = messageArea.querySelector('.welcome-notice');
    if (welcome) welcome.remove();

    const messageElement = document.createElement('div');

    if (message.type === 'JOIN' || message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        const text = message.type === 'JOIN' ? ' joined the chat' : ' left the chat';
        messageElement.textContent = message.sender + text;
    } else {
        messageElement.classList.add('chat-message');
        messageElement.classList.add(message.sender === username ? 'sender' : 'receiver');

        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box');
        messageBox.textContent = message.content;

        const messageInfo = document.createElement('div');
        messageInfo.classList.add('message-info');

        let timestamp;
        if (message.timestamp) {
            // For historical messages from server
            timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // For real-time messages
            timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        if (message.sender === username) {
            messageInfo.innerHTML = `<span>${timestamp}</span>`;
        } else {
            messageInfo.innerHTML = `<span style="color: ${getAvatarColor(message.sender)}; font-weight: 600;">${message.sender}</span><span>${timestamp}</span>`;
        }

        messageElement.appendChild(messageBox);
        messageElement.appendChild(messageInfo);
    }

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;

    if (message.onlineUsers) {
        updateOnlineUsers(message.onlineUsers);
    }
}

function updateOnlineUsers(users) {
    if (!users || !Array.isArray(users)) return;

    onlineUsersList.innerHTML = '';
    users.sort().forEach(user => {
        const li = document.createElement('li');
        li.classList.add('user-item');
        if (user === username) li.classList.add('active');

        const avatar = document.createElement('div');
        avatar.classList.add('user-avatar');
        avatar.style.backgroundColor = getAvatarColor(user);
        avatar.style.color = '#fff';
        avatar.textContent = user.charAt(0).toUpperCase();

        const info = document.createElement('div');
        info.classList.add('user-info-brief');

        const name = document.createElement('h4');
        name.textContent = user === username ? `${user} (You)` : user;

        const status = document.createElement('p');
        status.textContent = 'Active now';

        info.appendChild(name);
        info.appendChild(status);
        li.appendChild(avatar);
        li.appendChild(info);

        onlineUsersList.appendChild(li);
    });
}

function leaveChat() {
    if (stompClient) {
        stompClient.disconnect();
    }
    loginPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
    messageArea.innerHTML = '<div class="welcome-notice"><i data-lucide="message-square"></i><p>Welcome to the Public Room! Start a conversation.</p></div>';
    username = null;
    lucide.createIcons();
}

// UI Helpers
menuToggle.addEventListener('click', (e) => {
    chatDropdown.classList.toggle('hidden');
    e.stopPropagation();
});

profileToggle.addEventListener('click', (e) => {
    profileDropdown.classList.toggle('hidden');
    e.stopPropagation();
});

document.addEventListener('click', () => {
    chatDropdown.classList.add('hidden');
    profileDropdown.classList.add('hidden');
});

loginForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
leaveBtn.addEventListener('click', leaveChat);
profileLeaveBtn.addEventListener('click', leaveChat);

// Settings logic
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    profileDropdown.classList.add('hidden');
});

settingsBtnRoom.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    chatDropdown.classList.add('hidden');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

saveSettings.addEventListener('click', () => {
    const theme = themeSelect.value;
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
    settingsModal.classList.add('hidden');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeSelect.value = 'dark';
}

window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

