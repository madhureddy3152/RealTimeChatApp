package com.example.chatapp.model;

public class ChatMessage {
    private MessageType type;
    private String content;
    private String sender;
    private java.util.Set<String> onlineUsers;

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public java.util.Set<String> getOnlineUsers() {
        return onlineUsers;
    }

    public void setOnlineUsers(java.util.Set<String> onlineUsers) {
        this.onlineUsers = onlineUsers;
    }
}
