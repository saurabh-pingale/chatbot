import { openDB, type IDBPDatabase } from 'idb';
import { DB } from '../constants/db';
import type { Message } from '../types';

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB.NAME, DB.VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DB.CONVERSATIONS_STORE)) {
          db.createObjectStore(DB.CONVERSATIONS_STORE);
        }
      },
    });
  }
  return dbPromise;
};

export const saveConversation = async (userId: string, messages: Message[]): Promise<void> => {
  try {
    const db = await getDb();
    await db.put(DB.CONVERSATIONS_STORE, messages, userId);
  } catch (error) {
    console.error('Failed to save conversation to IndexedDB:', error);
  }
};

export const getConversation = async (userId: string): Promise<Message[] | undefined> => {
  try {
    const db = await getDb();
    const storedMessages = await db.get(DB.CONVERSATIONS_STORE, userId);
    if (storedMessages && Array.isArray(storedMessages)) {
      return storedMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
    return undefined;
  } catch (error) {
    console.error('Failed to retrieve conversation from IndexedDB:', error);
    return undefined;
  }
};

export const clearDBConversation = async (userId: string): Promise<void> => {
  try {
    const db = await getDb();
    await db.delete(DB.CONVERSATIONS_STORE, userId);
  } catch (error) {
    console.error('Failed to clear conversation from IndexedDB:', error);
  }
};