import api from "@/config/axios";

export const getAllPGs = async () => {
  const response = await api.get("/pgs");
  return response.data;
};

export const createPG = async (payload) => {
  const response = await api.post("/pgs", payload);
  return response.data;
};
