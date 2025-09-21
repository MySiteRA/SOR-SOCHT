import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, MoreVertical, Edit3, Trash2, Reply, X, Check } from 'lucide-react';
import { sendMessage, sendReplyMessage, subscribeToMessages, deleteMessage, editMessage, getMessageById, ChatMessage } from "../chatService";
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Очищаем сообщения при смене класса
    setMessages([]);
    
    // Подписываемся на изменения сообщений в реальном времени
    const unsubscribe = subscribeToMessages(classId, {
      onMessageAdded: (message) => {
        setMessages(prev => {
          // Проверяем, нет ли уже такого сообщения
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          
          // Добавляем новое сообщение и сортируем по времени
          const newMessages = [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
          return newMessages;
        });
      },
      
      onMessageChanged: (updatedMessage) => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          )
        );
      },
      
      onMessageRemoved: (messageId) => {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        
        // Если удаляется сообщение, на которое мы отвечаем, очищаем ответ
        if (replyingTo?.id === messageId) {
          setReplyingTo(null);
        }
        
        // Если удаляется сообщение, которое мы редактируем, очищаем редактирование
        if (editingMessage === messageId) {
          setEditingMessage(null);
          setEditText("");
        }
      }
    });

    return unsubscribe;
  }, [classId, replyingTo?.id, editingMessage]);

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
      
      if (replyingTo) {
        await sendReplyMessage(classId, text.trim(), user, userId, replyingTo.id!);
        setReplyingTo(null);
      } else {
        await sendMessage(classId, text.trim(), user, userId);
      }
      
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

  const handleEdit = async (messageId: string) => {
    if (editText.trim() === "" || editText.trim() === messages.find(m => m.id === messageId)?.text) {
      setEditingMessage(null);
      setEditText("");
      return;
    }

    try {
      await editMessage(classId, messageId, editText.trim());
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Удалить это сообщение?')) return;

    try {
      await deleteMessage(classId, messageId);
      setMessageMenuOpen(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
    setMessageMenuOpen(null);
    messageInputRef.current?.focus();
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessage(message.id!);
    setEditText(message.text);
    setMessageMenuOpen(null);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 100);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEdit(editingMessage);
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
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
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return '??';
    }
    return name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  const getReplyMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  };

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = () => {
      setMessageMenuOpen(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
            const replyMessage = message.replyTo ? getReplyMessage(message.replyTo) : null;
            const isEditing = editingMessage === message.id;

            return (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
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
                  <div className={`rounded-2xl px-4 py-3 relative group/message ${
                    isOwnMessage 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}>
                    {/* Reply Quote */}
                    {replyMessage && (
                      <div className={`mb-2 p-2 rounded-lg border-l-2 text-xs ${
                        isOwnMessage 
                          ? 'bg-indigo-500 border-indigo-300 text-indigo-100' 
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}>
                        <div className="font-medium mb-1">
                          {replyMessage.user}
                        </div>
                        <div className="truncate">
                          {replyMessage.text.length > 50 
                            ? `${replyMessage.text.substring(0, 50)}...` 
                            : replyMessage.text
                          }
                        </div>
                      </div>
                    )}

                    {/* Reply Quote for deleted message */}
                    {message.replyTo && !replyMessage && (
                      <div className={`mb-2 p-2 rounded-lg border-l-2 text-xs ${
                        isOwnMessage 
                          ? 'bg-indigo-500 border-indigo-300 text-indigo-100' 
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}>
                        <div className="font-medium mb-1">
                          Сообщение удалено
                        </div>
                        <div className="italic opacity-75">
                          Исходное сообщение больше недоступно
                        </div>
                      </div>
                    )}

                    {/* Name (only for others' messages) */}
                    {showName && (
                      <div className="text-xs font-medium text-indigo-600 mb-1">
                        {message.user}
                      </div>
                    )}
                    
                    {/* Message Text */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          ref={editInputRef}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleEditKeyPress}
                          className="w-full px-2 py-1 text-sm bg-white text-gray-900 border border-gray-300 rounded resize-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(message.id!)}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Сохранить</span>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            <span>Отмена</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.text}
                        {message.edited && (
                          <span className={`ml-2 text-xs italic ${
                            isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                          }`}>
                            (изменено)
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Time */}
                    <div className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>

                    {/* Message Actions */}
                    {!isEditing && (
                      <div className={`absolute top-1 ${isOwnMessage ? 'left-1' : 'right-1'} opacity-0 group-hover/message:opacity-100 transition-opacity ${
                        messageMenuOpen === message.id ? 'opacity-100' : ''
                      }`}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id!);
                            }}
                            className={`p-1 rounded-full transition-colors ${
                              isOwnMessage 
                                ? 'hover:bg-indigo-500 text-indigo-200 hover:text-white' 
                                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>

                          {/* Message Menu */}
                          {messageMenuOpen === message.id && (
                            <div className={`absolute top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px] ${
                              isOwnMessage ? 'right-0' : 'left-0'
                            }`}>
                              <button
                                onClick={() => handleReply(message)}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                              >
                                <Reply className="w-3 h-3" />
                                <span>Ответить</span>
                              </button>
                              
                              {isOwnMessage && (
                                <>
                                  <button
                                    onClick={() => startEdit(message)}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Изменить</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(message.id!)}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Удалить</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Reply className="w-4 h-4" />
                <span>Ответ на сообщение от {replyingTo.user}</span>
              </div>
              <button
                onClick={cancelReply}
                className="p-1 text-gray-500 hover:text-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-700 bg-white p-2 rounded border-l-2 border-indigo-500">
              {replyingTo.text.length > 100 
                ? `${replyingTo.text.substring(0, 100)}...` 
                : replyingTo.text
              }
            </div>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={messageInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={replyingTo ? "Ответить..." : "Напишите сообщение..."}
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
          <span>
            {replyingTo 
              ? 'Enter - ответить, Escape - отмена' 
              : 'Enter - отправить, Shift+Enter - новая строка'
            }
          </span>
          <span>{messages.length} сообщений</span>
        </div>
      </div>
    </div>
  );
};

export default ClassChat;