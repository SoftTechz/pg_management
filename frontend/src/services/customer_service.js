import api from "@/config/axios";

export const createCustomer = async (payload) => {
  const res = await api.post("/customers", payload);
  return res.data;
};

export const getAllCustomers = async (params = {}) => {
  const res = await api.get("/customers", { params });
  return res.data;
};

export const getCustomerById = async (customerId) => {
  const res = await api.get(`/customers/${customerId}`);
  return res.data;
};

export const updateCustomer = async (customerId, payload) => {
  const res = await api.put(`/customers/${customerId}`, payload);
  return res.data;
};

export const deleteCustomer = async (customerId) => {
  const res = await api.delete(`/customers/${customerId}`);
  return res.data;
};
