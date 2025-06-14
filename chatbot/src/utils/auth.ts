const AUTH_TOKEN_KEY = 'chatbot_auth_token';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Could not retrieve auth token from local storage:", error);
    return null;
  }
};

export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Could not save auth token to local storage:", error);
  }
};

export const removeAuthToken = (): void => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error("Could not remove auth token from local storage:", error);
    }
  }; 