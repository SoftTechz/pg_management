import api from "@/config/axios";

export const createPayments = async (payload) => {
  const res = await api.post("/payments/", payload);
  return res.data;
};

export const createPayment = async (payload) => {
  const res = await api.post("/payments/", payload);
  return res.data;
};

export const updatePayments = async (paymentsId, payload) => {
  const res = await api.put(`/payments/${paymentsId}`, payload);
  return res.data;
};

export const getAllPayments = async (params = {}) => {
  const res = await api.get("/payments/", { params });
  return res.data;
};

export const getPaymentsById = async (paymentsId) => {
  const res = await api.get(`/payments/${paymentsId}`);
  return res.data;
};

export const deletePayments = async (paymentsId) => {
  const res = await api.delete(`/payments/${paymentsId}`);
  return res.data;
};
