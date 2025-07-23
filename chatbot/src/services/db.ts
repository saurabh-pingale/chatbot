import { openDB, type IDBPDatabase } from 'idb';
import type { Message } from '../types';

const DB_NAME = 'chatbot-db';
const CONVERSATIONS_STORE = 'conversations';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
          db.createObjectStore(CONVERSATIONS_STORE);
        }
      },
    });
  }
  return dbPromise;
};

export const saveConversation = async (userId: string, messages: Message[]): Promise<void> => {
  try {
    const db = await getDb();
    await db.put(CONVERSATIONS_STORE, messages, userId);
  } catch (error) {
    console.error('Failed to save conversation to IndexedDB:', error);
  }
};

export const getConversation = async (userId: string): Promise<Message[] | undefined> => {
  try {
    const db = await getDb();
    const storedMessages = await db.get(CONVERSATIONS_STORE, userId);
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
    await db.delete(CONVERSATIONS_STORE, userId);
  } catch (error) {
    console.error('Failed to clear conversation from IndexedDB:', error);
  }
};