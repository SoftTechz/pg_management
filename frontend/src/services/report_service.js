import api from "@/config/axios";

export const getCustomerReport = async (params = {}) => {
  const res = await api.get("/reports/customers", { params });
  return res.data;
};

export const getRoomReport = async () => {
  const res = await api.get("/reports/occupancy");
  return res.data;
};

export const getMonthlyPaymentReport = async (month) => {
  const res = await api.get("/reports/payments", { params: { month } });
  return res.data;
};

export const getPaymentHistoryReport = async (customerId) => {
  const res = await api.get("/reports/payment-history", {
    params: customerId ? { customer_id: customerId } : {},
  });
  return res.data;
};

export const exportReportExcel = async (type, params = {}) => {
  const paths = {
    customers: "/reports/customers/export",
    rooms: "/reports/occupancy/export",
    monthly: "/reports/payments/export",
    history: "/reports/payment-history/export",
  };
  const res = await api.get(paths[type], { params, responseType: "blob" });
  return res.data;
};

export const getAllocationsReport = async (params = {}) => {
  const res = await api.get("/reports/allocations", { params });
  return res.data;
};

export const exportAllocationsReportExcel = async (params = {}) => {
  const res = await api.get("/reports/allocations/export/excel", {
    params,
    responseType: "blob",
  });
  return res.data;
};

export const exportAllocationsReportPdf = async (params = {}) => {
  const res = await api.get("/reports/allocations/export/pdf", {
    params,
    responseType: "blob",
  });
  return res.data;
};
