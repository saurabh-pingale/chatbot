import { getAuthToken, setAuthToken } from "./auth";

export const fetchWithTokenRefresh = async (
  url: string,
  options: RequestInit = {}
) => {
  const token = getAuthToken();

  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, options);
    
    const refreshedToken = response.headers.get("X-Token-Refreshed");

    if (refreshedToken) {
      setAuthToken(refreshedToken);
    }
  
    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}; 