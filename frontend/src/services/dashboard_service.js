import api from "@/config/axios";

export const getDashboardStats = async () => {
  const res = await api.get("/dashboard");
  return res.data;
};

export const getMonthlyPayments = async (month) => {
  const res = await api.get("/payments/monthly", { params: { month } });
  return res.data;
};

export const getDashboardLowStock = async (threshold = 50, limit = 10) => {
  const res = await api.get("/dashboard/low-stock", {
    params: { threshold, limit },
  });
  return res.data;
};
