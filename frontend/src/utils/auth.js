import Cookies from "js-cookie";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export const getToken = () => {
  return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
};

export const setToken = (token) => {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    secure: window.location.protocol === "https:",
    sameSite: "lax",
  });
};

export const clearAuth = () => {
  Cookies.remove(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "{}");
  } catch {
    return {};
  }
};

export const setUser = (user) => {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
