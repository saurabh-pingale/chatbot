import { v4 as uuidv4 } from 'uuid';

const GUEST_ID_KEY = 'chatbot_guest_id';

export const getOrCreateGuestId = (): string => {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
};

export const getGuestId = (): string | null => {
  return localStorage.getItem(GUEST_ID_KEY);
};

export const clearGuestId = (): void => {
  localStorage.removeItem(GUEST_ID_KEY);
}; 