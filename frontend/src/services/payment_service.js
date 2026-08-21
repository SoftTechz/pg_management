import api from "@/config/axios";

export const createPayment = async (payload) => {
  const response = await api.post("/payments", payload);
  return response.data;
};

export const getMonthlyPayments = async (month) => {
  const response = await api.get("/payments/monthly", {
    params: { month },
  });
  return response.data;
};
