import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { sendMessage, subscribeMessages, ChatMessage } from "../chatService";
import StudentAvatar from './StudentAvatar';

interface ChatProps {
  classId: string;
  user: string;
  userId: string;
  className: string;
}

const ClassChat: React.FC<ChatProps> = ({ classId, user, userId, className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Очищаем сообщения при смене класса
    setMessages([]);
    
    // Подписываемся на новые сообщения
    const unsubscribe = subscribeMessages(classId, (msg) => {
      setMessages(prev => {
        // Проверяем, нет ли уже такого сообщения
        const exists = prev.some(m => m.id === msg.id);
        if (exists) return prev;
        
        return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    return unsubscribe;
  }, [classId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (text.trim() === "" || sending) return;

    try {
      setSending(true);
      await sendMessage(classId, text.trim(), user, userId);
      setText("");
      
      // Фокусируемся обратно на поле ввода
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStudentInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Чат класса</h3>
            <p className="text-sm text-gray-600">{className}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">Чат пуст</h3>
            <p className="text-gray-500">Станьте первым, кто напишет сообщение!</p>
          </motion.div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.userId === userId;
            const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;
            const showName = showAvatar && !isOwnMessage;

            return (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2 group`}
              >
                <div className={`flex items-end space-x-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  {showAvatar && !isOwnMessage && (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {getStudentInitials(message.user)}
                      </span>
                    </div>
                  )}
                  
                  {/* Message Bubble */}
                  <div className={`rounded-2xl px-4 py-3 relative ${
                    isOwnMessage 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}>
                    {/* Name (only for others' messages) */}
                    {showName && (
                      <div className="text-xs font-medium text-indigo-600 mb-1">
                        {message.user}
                      </div>
                    )}
                    
                    {/* Message Text */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.text}
                    </div>
                    
                    {/* Time */}
                    <div className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  
                  {/* Spacer for own messages */}
                  {showAvatar && isOwnMessage && (
                    <div className="w-8 h-8 flex-shrink-0" />
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={messageInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Напишите сообщение..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 min-h-[48px]"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '48px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
              disabled={sending}
            />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Enter - отправить, Shift+Enter - новая строка</span>
          <span>{messages.length} сообщений</span>
        </div>
      </div>
    </div>
  );
};

export default ClassChat;