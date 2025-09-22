import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, MoreVertical, Edit3, Trash2, Reply, X, Check, Smile } from 'lucide-react';
import { sendMessage, sendReplyMessage, subscribeToMessages, deleteMessage, editMessage, getMessageById, ChatMessage } from "../chatService";
import StudentAvatar from './StudentAvatar';
import { useStudentProfiles } from '../hooks/useStudentProfiles';
import { useAvatarPreloader } from '../hooks/useAvatarPreloader';
import { getStudentsByClass } from '../lib/api';

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
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Загружаем студентов класса для аватарок
  useEffect(() => {
    const loadClassStudents = async () => {
      try {
        const students = await getStudentsByClass(classId);
        setClassStudents(students);
      } catch (error) {
        console.error('Error loading class students:', error);
      }
    };
    
    loadClassStudents();
  }, [classId]);

  // Загружаем профили студентов
  const studentIds = classStudents.map(s => s.id);
  const { profiles } = useStudentProfiles(studentIds);
  
  // Используем предзагрузчик аватарок
  const { getAvatar, preloadAvatars } = useAvatarPreloader();

  // Предзагружаем аватарки при загрузке студентов
  useEffect(() => {
    if (studentIds.length > 0) {
      preloadAvatars(studentIds).catch(console.error);
    }
  }, [studentIds.length]);

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

  // Функция для получения студента по userId
  const getStudentByUserId = (userId: string) => {
    return classStudents.find(student => student.id === userId);
  };

  // Функция для получения аватарки студента
  const getStudentAvatar = (userId: string) => {
    const student = getStudentByUserId(userId);
    if (!student) return null;
    
    return getAvatar(student.id) || profiles.get(student.id)?.avatar_url || null;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Чат класса</h3>
            <p className="text-sm text-gray-500">{className} • {messages.length} сообщений</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">Чат пуст</h3>
            <p className="text-gray-500 text-lg">Станьте первым, кто напишет сообщение!</p>
          </motion.div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.userId === userId;
            const showAvatar = index === 0 || messages[index - 1].userId !== message.userId || 
                              (index > 0 && new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000); // 5 минут
            const showName = showAvatar;
            const replyMessage = message.replyTo ? getReplyMessage(message.replyTo) : null;
            const isEditing = editingMessage === message.id;
            const student = getStudentByUserId(message.userId);
            const avatarUrl = getStudentAvatar(message.userId);

            return (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`flex items-end space-x-3 max-w-[85%] ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {/* Avatar */}
                  {showAvatar && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0"
                    >
                      {student ? (
                        <StudentAvatar 
                          student={student} 
                          avatarUrl={avatarUrl}
                          size="sm"
                          className="w-10 h-10 shadow-md"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-sm">
                            {getStudentInitials(message.user)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {/* Spacer when no avatar */}
                  {!showAvatar && !isOwnMessage && (
                    <div className="w-10 h-10 flex-shrink-0" />
                  )}
                  
                  {/* Message Bubble */}
                  <div className={`relative group/message max-w-full ${
                    isOwnMessage 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-3xl rounded-br-lg px-5 py-3 shadow-lg' 
                      : 'bg-white text-gray-900 shadow-md border border-gray-100 rounded-3xl rounded-bl-lg px-5 py-3'
                  }`}>
                    {/* Reply Quote */}
                    {replyMessage && (
                      <div className={`mb-3 p-3 rounded-2xl border-l-4 text-xs ${
                        isOwnMessage 
                          ? 'bg-indigo-400 bg-opacity-50 border-indigo-200 text-indigo-100' 
                          : 'bg-gray-50 border-indigo-300 text-gray-600'
                      }`}>
                        <div className="font-semibold mb-1 opacity-90">
                          {replyMessage.user}
                        </div>
                        <div className="truncate opacity-80">
                          {replyMessage.text.length > 50 
                            ? `${replyMessage.text.substring(0, 50)}...` 
                            : replyMessage.text
                          }
                        </div>
                      </div>
                    )}

                    {/* Reply Quote for deleted message */}
                    {message.replyTo && !replyMessage && (
                      <div className={`mb-3 p-3 rounded-2xl border-l-4 text-xs ${
                        isOwnMessage 
                          ? 'bg-indigo-400 bg-opacity-50 border-indigo-200 text-indigo-100' 
                          : 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}>
                        <div className="font-semibold mb-1 opacity-90">
                          Сообщение удалено
                        </div>
                        <div className="italic opacity-70">
                          Исходное сообщение больше недоступно
                        </div>
                      </div>
                    )}

                    {/* Name (only for others' messages) */}
                    {showName && (
                      <div className={`text-xs font-semibold mb-2 ${
                        isOwnMessage ? 'text-indigo-100' : 'text-indigo-600'
                      }`}>
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
                          className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(message.id!)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                          >
                            <Check className="w-3 h-3" />
                            <span>Сохранить</span>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                          >
                            <X className="w-3 h-3" />
                            <span>Отмена</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                        {message.text}
                        {message.edited && (
                          <span className={`ml-2 text-xs italic opacity-70 ${
                            isOwnMessage ? 'text-indigo-100' : 'text-gray-500'
                          }`}>
                            (изменено)
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Time */}
                    <div className={`text-xs mt-2 font-medium ${
                      isOwnMessage ? 'text-indigo-100 opacity-80' : 'text-gray-400'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>

                    {/* Message Actions */}
                    {!isEditing && (
                      <div className={`absolute top-2 ${isOwnMessage ? 'left-2' : 'right-2'} opacity-0 group-hover/message:opacity-100 transition-opacity ${
                        messageMenuOpen === message.id ? 'opacity-100' : ''
                      }`}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id!);
                            }}
                            className={`p-1.5 rounded-full transition-colors shadow-sm ${
                              isOwnMessage 
                                ? 'hover:bg-indigo-400 text-indigo-100 hover:text-white bg-indigo-500 bg-opacity-30' 
                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600 bg-white border border-gray-200'
                            }`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Message Menu */}
                          {messageMenuOpen === message.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className={`absolute top-8 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-10 min-w-[140px] ${
                              isOwnMessage ? 'right-0' : 'left-0'
                            }`}>
                              <button
                                onClick={() => handleReply(message)}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center space-x-3 transition-colors"
                              >
                                <Reply className="w-4 h-4" />
                                <span>Ответить</span>
                              </button>
                              
                              {isOwnMessage && (
                                <>
                                  <button
                                    onClick={() => startEdit(message)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Изменить</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(message.id!)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Удалить</span>
                                  </button>
                                </>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Spacer for own messages */}
                  {showAvatar && isOwnMessage && (
                    <div className="w-10 h-10 flex-shrink-0" />
                  )}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-100 p-6 flex-shrink-0 shadow-lg">
        {/* Reply Preview */}
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 text-sm text-indigo-700 font-medium">
                <Reply className="w-4 h-4 text-indigo-500" />
                <span>Ответ на сообщение от {replyingTo.user}</span>
              </div>
              <button
                onClick={cancelReply}
                className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-700 bg-white p-3 rounded-xl border-l-4 border-indigo-400 shadow-sm">
              {replyingTo.text.length > 100 
                ? `${replyingTo.text.substring(0, 100)}...` 
                : replyingTo.text
              }
            </div>
          </motion.div>
        )}

        <div className="flex items-end space-x-4">
          {/* User Avatar */}
          <div className="flex-shrink-0 mb-1">
            {classStudents.find(s => s.id === userId) ? (
              <StudentAvatar 
                student={classStudents.find(s => s.id === userId)!} 
                avatarUrl={getStudentAvatar(userId)}
                size="sm"
                className="w-10 h-10 shadow-md"
              />
            ) : (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">
                  {getStudentInitials(user)}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <textarea
              ref={messageInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={replyingTo ? "Ответить..." : "Напишите сообщение..."}
              className="w-full px-5 py-4 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 min-h-[52px] shadow-sm bg-gray-50 focus:bg-white transition-colors"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '52px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
              disabled={sending}
            />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5 transform translate-x-0.5" />
            )}
          </motion.button>
        </div>
        
        <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
          <span>
            {replyingTo 
              ? 'Enter - ответить, Escape - отмена' 
              : 'Enter - отправить, Shift+Enter - новая строка'
            }
          </span>
          <div className="flex items-center space-x-4">
            <span>{classStudents.length} участников</span>
            <span>•</span>
            <span>{messages.length} сообщений</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassChat;