
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

export const saveChat = async (id: string, messages: ChatMessage[]): Promise<void> => {
  if (messages.length === 0) return;

  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const getReq = store.get(id);
        
        getReq.onsuccess = () => {
            const existing = getReq.result as StoredChat | undefined;
            
            let title = existing?.title;
            
            // Generate title if new or if existing title was default/empty and we have user messages now
            if (!title) {
               const firstUserMsg = messages.find(m => m.role === 'user');
               title = firstUserMsg 
                  ? (firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : ''))
                  : `Conversation ${new Date().toLocaleString()}`;
            }
            
            // We explicitly map the messages to ensure all media fields are preserved.
            // IndexedDB handles structured cloning, so base64 strings in attachments/video/image are stored correctly.
            const cleanMessages: ChatMessage[] = messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                text: msg.text,
                timestamp: msg.timestamp,
                isFinal: msg.isFinal,
                // Explicitly preserve media fields to ensure attachments and generations are saved
                attachments: msg.attachments, // User uploaded images/docs (Base64)
                image: msg.image,             // AI Generated Image (Base64)
                video: msg.video,             // AI Generated Video (Base64/URI)
                groundingMetadata: msg.groundingMetadata
            }));
      
            const chat: StoredChat = {
              id,
              timestamp: Date.now(),
              title,
              messages: cleanMessages
            };
            
            const putReq = store.put(chat);
            putReq.onsuccess = () => resolve();
            putReq.onerror = (e) => {
                console.error("Failed to save chat history (likely quota exceeded due to media size):", putReq.error);
                reject(putReq.error);
            };
        };
        
        getReq.onerror = () => reject(getReq.error);
    });
  } catch (error) {
    console.error("Database error in saveChat:", error);
    throw error;
  }
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
