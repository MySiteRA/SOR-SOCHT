import { ref, push, onChildAdded, off, query, orderByChild, limitToLast } from "firebase/database";
import { db } from "./firebase";

export interface ChatMessage {
  id?: string;
  user: string;
  text: string;
  timestamp: number;
  userId: string;
}

export function sendMessage(classId: string, text: string, user: string, userId: string) {
  const chatRef = ref(db, `chats/${classId}`);
  return push(chatRef, {
    user,
    text,
    timestamp: Date.now(),
    userId
  });
}

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