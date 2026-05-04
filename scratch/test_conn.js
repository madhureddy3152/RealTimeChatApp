
const SockJS = require('sockjs-client');
const Stomp = require('stompjs');

const socket = new SockJS('http://localhost:8082/ws');
const stompClient = Stomp.over(socket);

stompClient.connect({}, (frame) => {
    console.log('Connected: ' + frame);
    process.exit(0);
}, (error) => {
    console.error('STOMP error: ' + error);
    process.exit(1);
});
