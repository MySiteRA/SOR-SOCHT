import { ref, push, onChildAdded, onChildChanged, onChildRemoved, off, query, orderByChild, limitToLast, remove, update, onValue } from "firebase/database";
import { db } from "./firebase";

export interface ChatMessage {
  id?: string;
  user: string;
  text: string;
  timestamp: number;
  userId: string;
  edited?: boolean;
  replyTo?: string;
}

export function sendMessage(classId: string, text: string, user: string, userId: string) {
  const chatRef = ref(db, `chats/${classId}`);
  return push(chatRef, {
    user,
    text,
    timestamp: Date.now(),
    userId,
    edited: false
  });
}

export function sendReplyMessage(classId: string, text: string, user: string, userId: string, replyToId: string) {
  const chatRef = ref(db, `chats/${classId}`);
  return push(chatRef, {
    user,
    text,
    timestamp: Date.now(),
    userId,
    edited: false,
    replyTo: replyToId
  });
}

export function deleteMessage(classId: string, messageId: string) {
  const messageRef = ref(db, `chats/${classId}/${messageId}`);
  return remove(messageRef);
}

export function editMessage(classId: string, messageId: string, newText: string) {
  const messageRef = ref(db, `chats/${classId}/${messageId}`);
  return update(messageRef, {
    text: newText,
    edited: true
  });
}

export function getMessageById(classId: string, messageId: string): Promise<ChatMessage | null> {
  return new Promise((resolve) => {
    const messageRef = ref(db, `chats/${classId}/${messageId}`);
    onValue(messageRef, (snapshot) => {
      const message = snapshot.val();
      if (message) {
        resolve({
          id: snapshot.key || '',
          ...message
        });
      } else {
        resolve(null);
      }
    }, { onlyOnce: true });
  });
}

export function subscribeToMessages(
  classId: string, 
  callbacks: {
    onMessageAdded: (message: ChatMessage) => void;
    onMessageChanged: (message: ChatMessage) => void;
    onMessageRemoved: (messageId: string) => void;
  }
) {
  const chatRef = ref(db, `chats/${classId}`);
  const messagesQuery = query(chatRef, orderByChild('timestamp'), limitToLast(100));
  
  // Подписываемся на добавление новых сообщений
  const unsubscribeAdded = onChildAdded(messagesQuery, (snapshot) => {
    const message = snapshot.val();
    if (message) {
      callbacks.onMessageAdded({
        id: snapshot.key || '',
        ...message
      });
    }
  });

  // Подписываемся на изменение сообщений (редактирование)
  const unsubscribeChanged = onChildChanged(messagesQuery, (snapshot) => {
    const message = snapshot.val();
    if (message) {
      callbacks.onMessageChanged({
        id: snapshot.key || '',
        ...message
      });
    }
  });

  // Подписываемся на удаление сообщений
  const unsubscribeRemoved = onChildRemoved(messagesQuery, (snapshot) => {
    const messageId = snapshot.key;
    if (messageId) {
      callbacks.onMessageRemoved(messageId);
    }
  });

  // Возвращаем функцию для отписки от всех событий
  return () => {
    off(messagesQuery, 'child_added', unsubscribeAdded);
    off(messagesQuery, 'child_changed', unsubscribeChanged);
    off(messagesQuery, 'child_removed', unsubscribeRemoved);
  };
}

// Оставляем старую функцию для обратной совместимости
export function subscribeMessages(classId: string, callback: (msg: ChatMessage) => void) {
  const chatRef = ref(db, `chats/${classId}`);
  const messagesQuery = query(chatRef, orderByChild('timestamp'), limitToLast(100));
  
  const unsubscribe = onChildAdded(messagesQuery, (snapshot) => {
    const message = snapshot.val();
    if (message) {
      callback({
        id: snapshot.key || '',
        ...message
      });
    }
  });

  return () => off(messagesQuery, 'child_added', unsubscribe);
}