import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const ChatWindow = ({ rideId, socket, userId, userType }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!socket || !rideId) return;

        // Join a room specific to the ride
        socket.emit('join-ride-chat', rideId);

        // Listen for incoming messages
        socket.on('receive-message', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
            // Mark message as read
            socket.emit('mark-message-read', { messageId: message._id, rideId });
        });

        // Listen for message history
        socket.on('message-history', (history) => {
            setMessages(history);
            // Mark all messages as read
            history.forEach(msg => {
                if (msg.senderId !== userId) {
                    socket.emit('mark-message-read', { messageId: msg._id, rideId });
                }
            });
        });

        // Listen for typing indicators
        socket.on('user-typing', ({ userId: typingUserId, isTyping }) => {
            setTypingUsers(prev => ({
                ...prev,
                [typingUserId]: isTyping
            }));
        });

        // Listen for message status updates
        socket.on('message-delivered', ({ messageId }) => {
            setMessages(prev => prev.map(msg => 
                msg._id === messageId ? { ...msg, status: 'delivered' } : msg
            ));
        });

        socket.on('message-read', ({ messageId }) => {
            setMessages(prev => prev.map(msg => 
                msg._id === messageId ? { ...msg, status: 'read' } : msg
            ));
        });

        // Error handling
        socket.on('message-error', ({ error }) => {
            toast.error(error);
        });

        return () => {
            socket.emit('leave-ride-chat', rideId);
            socket.off('receive-message');
            socket.off('message-history');
            socket.off('user-typing');
            socket.off('message-delivered');
            socket.off('message-read');
            socket.off('message-error');
        };
    }, [socket, rideId, userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', { rideId, isTyping: true });
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('typing', { rideId, isTyping: false });
        }, 2000);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && socket) {
            const messageData = {
                rideId,
                text: newMessage,
                sender: userType,
                senderId: userId,
            };
            socket.emit('send-message', messageData);
            setNewMessage('');
            setIsTyping(false);
            socket.emit('typing', { rideId, isTyping: false });
        }
    };

    const getMessageStatus = (message) => {
        if (message.senderId !== userId) return null;
        switch (message.status) {
            case 'sent': return '✓';
            case 'delivered': return '✓✓';
            case 'read': return '✓✓';
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`mb-2 ${msg.sender === userType ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block p-2 rounded-lg ${
                            msg.sender === userType ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'
                        }`}>
                            <div>{msg.text}</div>
                            {getMessageStatus(msg) && (
                                <span className="text-xs opacity-75 ml-1">{getMessageStatus(msg)}</span>
                            )}
                        </div>
                    </div>
                ))}
                {Object.values(typingUsers).some(Boolean) && (
                    <div className="text-sm text-gray-500 italic">
                        Someone is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t flex">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                    }}
                    className="flex-1 rounded-lg border p-2 mr-2"
                    placeholder="Type a message..."
                />
                <button 
                    type="submit" 
                    className="bg-green-500 text-white p-2 rounded-lg disabled:opacity-50"
                    disabled={!newMessage.trim()}
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatWindow; 