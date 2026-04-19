import Cookies from "js-cookie";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const TOKEN_TIMESTAMP_KEY = "token_timestamp";
const TOKEN_VALIDITY_MS = 29 * 24 * 60 * 60 * 1000; // 29 days (tokens valid for 30 days)

/**
 * Get the auth token if it exists and hasn't expired
 */
export const getToken = () => {
  const token = Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  if (!token) return "";

  // Check token expiration
  const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
  if (timestamp) {
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > TOKEN_VALIDITY_MS) {
      // Token expired, clear auth
      clearAuth();
      return "";
    }
  }

  return token;
};

/**
 * Set the auth token and store the timestamp for expiration tracking
 */
export const setToken = (token) => {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    secure: window.location.protocol === "https:",
    sameSite: "lax",
  });
};

/**
 * Clear all auth data
 */
export const clearAuth = () => {
  Cookies.remove(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
};

/**
 * Get the current user from localStorage
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY) || "{}";
    return JSON.parse(userStr);
  } catch {
    return {};
  }
};

/**
 * Set the current user in localStorage
 */
export const setUser = (user) => {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Check if the user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};
