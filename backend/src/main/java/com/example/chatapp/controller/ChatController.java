package com.example.chatapp.controller;

import com.example.chatapp.model.ChatMessage;
import com.example.chatapp.model.Message;
import com.example.chatapp.model.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {
    @Autowired
    private MessageRepository messageRepository;

    private static final Set<String> onlineUsers = ConcurrentHashMap.newKeySet();

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage) {
        // Save to DB
        Message message = new Message(chatMessage.getSender(), chatMessage.getContent(), chatMessage.getType());
        messageRepository.save(message);

        chatMessage.setOnlineUsers(onlineUsers);
        return chatMessage;
    }

    @MessageMapping("/chat.addUser")
    @SendTo("/topic/public")
    public ChatMessage addUser(@Payload ChatMessage chatMessage,
                               SimpMessageHeaderAccessor headerAccessor) {
        // Add username in web socket session
        headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
        onlineUsers.add(chatMessage.getSender());
        
        // Save JOIN event to DB
        Message message = new Message(chatMessage.getSender(), null, chatMessage.getType());
        messageRepository.save(message);

        chatMessage.setOnlineUsers(onlineUsers);
        return chatMessage;
    }

    @GetMapping("/api/messages")
    @ResponseBody
    public List<Message> getChatHistory() {
        return messageRepository.findAllByOrderByTimestampAsc();
    }

    public static Set<String> getOnlineUsers() {
        return onlineUsers;
    }
}
