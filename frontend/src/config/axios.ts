/// <reference types="vite/client" />
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const selectedPgId = localStorage.getItem("selectedPgId");
  if (selectedPgId) {
    config.headers["X-PG-ID"] = selectedPgId;
  }
  return config;
});

export default api;
