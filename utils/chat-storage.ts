import { ChatMessage } from '../types';

export interface StoredChat {
  id: string;
  timestamp: number;
  title: string;
  messages: ChatMessage[];
}

const DB_NAME = 'NovaChatDB';
const STORE_NAME = 'chats';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveChat = async (messages: ChatMessage[]): Promise<void> => {
  if (messages.length === 0) return;

  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Generate a title based on the first user message, or date
  const firstUserMsg = messages.find(m => m.role === 'user');
  const title = firstUserMsg 
    ? (firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : ''))
    : `Conversation ${new Date().toLocaleString()}`;

  const chat: StoredChat = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    title,
    messages
  };
  
  store.add(chat);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getChats = async (): Promise<StoredChat[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const results = request.result as StoredChat[];
      resolve(results.sort((a, b) => b.timestamp - a.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteChat = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearAllChats = async (): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
