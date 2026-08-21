import api from "@/config/axios";

// Create room
export const createRoom = async (payload) => {
  const res = await api.post("/rooms/", payload);
  console.log("Create Room Response:", res.data);
  return res.data;
};

// Update room
export const updateRoom = async (roomId, payload) => {
  const res = await api.put(`/rooms/${roomId}`, payload);
  console.log("Update Room Response:", res.data);
  return res.data;
};

// Delete room (soft delete)
export const deleteRoom = async (roomId) => {
  const res = await api.delete(`/rooms/${roomId}`);
  return res.data;
};

// Get all rooms with pagination and optional server-side search
export const getAllRooms = async (params = {}) => {
  const res = await api.get("/rooms/", { params });
  return res.data;
};

// Get room by ID
export const getRoomById = async (roomId) => {
  const res = await api.get(`/rooms/${roomId}`);
  return res.data;
};
