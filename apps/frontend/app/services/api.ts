import axios from "axios";
import { useAuth } from "@/store/useAuth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

api.interceptors.request.use((cfg) => {
  const token = useAuth.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auth API
export const register = (email: string, password: string) => 
  api.post("/auth/register", { email, password });

export const login = (email: string, password: string) => 
  api.post("/auth/login", { email, password });

export const refreshToken = (refreshToken: string) => 
  api.post("/auth/refresh", { refreshToken });

export const logout = () => api.post("/auth/logout");

export const getCurrentUser = () => api.get("/auth/me");

// Sources API
export const getSources = () => api.get("/sources/list");
export const connectSource = (provider: string, data?: any) =>
  api.post(`/sources/${provider}/connect`, data);
export const connectNotionWithKey = (apiKey: string) =>
  api.post("/sources/notion/connect", { apiKey });
export const connectSlackBot = (apiKey: string, channelName: string) =>
  api.post("/sources/slack-bot/connect", { apiKey, channelName });
export const disconnectSource = (provider: string) =>
  api.post(`/sources/${provider}/disconnect`);

// Docs API
export const uploadFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/docs/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const importGoogleDoc = (url: string) => 
  api.post('/docs/fetch-gdoc', { url });

export const crawlSite = (url: string) =>
  api.post('/docs/crawl-site', { url });

// Chat API
export const askQuestion = (data: { question: string; filters?: any }) =>
  api.post('/chat/ask', data);

export const streamChat = (chatId: string) => {
  const token = useAuth.getState().token;
  return new EventSource(`${api.defaults.baseURL}/chat/stream/${chatId}?token=${token}`);
};

export const getSnippet = (docId: string, chunkId: string) =>
  api.get(`/docs/${docId}/snippet`, { params: { chunkId } });

// Add other API wrappers later
export default api;
