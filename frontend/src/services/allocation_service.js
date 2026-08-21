import api from "@/config/axios";

// Create allocation
export const createAllocation = async (payload) => {
  const res = await api.post("/allocations", payload);
  return res.data;
};

// Get allocations
export const getAllAllocations = async (params = {}) => {
  const res = await api.get("/allocations", { params });
  return res.data;
};

// Get allocation by ID
export const getAllocationById = async (allocationId) => {
  const res = await api.get(`/allocations/${allocationId}`);
  return res.data;
};

// Update allocation
export const updateAllocation = async (allocationId, payload) => {
  const res = await api.put(`/allocations/${allocationId}`, payload);
  return res.data;
};

// Delete allocation
export const deleteAllocation = async (allocationId) => {
  const res = await api.delete(`/allocations/${allocationId}`);
  return res.data;
};

export const getAllocationPDF = async (allocationId) => {
  const res = await api.get(`/allocations/${allocationId}/pdf`, {
    responseType: "blob",
  });
  return res.data;
};
