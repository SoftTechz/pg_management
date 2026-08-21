import { useState, useEffect } from "react";
import ModuleHeader from "@/components/ui/ModuleHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { Users, DollarSign, CreditCard, ArrowUpRight } from "lucide-react";
import {
  getDashboardStats,
  getMonthlyPayments,
} from "@/services/dashboard_service";
import { createPayment } from "@/services/payment_service";
import DashboardLayout from "../../app/layout/DashboardLayout";

export default function HospitalDashboard() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [monthlyPayments, setMonthlyPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentSaving, setPaymentSaving] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  useEffect(() => {
    async function loadDashboard() {
      setStatsLoading(true);
      setError(null);

      try {
        const statsResponse = await getDashboardStats();
        if (statsResponse) {
          const s = statsResponse.data || statsResponse;
          setStats([
            {
              title: "Total Rooms",
              value: s.total_rooms,
              icon: Users,
              trend: `${s.available_beds || 0} beds available`,
              trendColor: "text-sky-600",
            },
            {
              title: "Total Customers",
              value: s.total_customers,
              icon: Users,
              trend: `${s.occupied_beds || 0} beds occupied`,
              trendColor: "text-sky-600",
            },
            {
              title: "Pending Rent",
              value: `INR ${Number(s.pending_monthly_rent || 0).toLocaleString("en-IN")}`,
              icon: CreditCard,
              trend: `${s.unpaid_customers || 0} unpaid customers`,
              trendColor: "text-red-600",
            },
            {
              title: `${s.month_label || "Monthly"} Collected`,
              value: `INR ${Number(s.collected_monthly_rent || 0).toLocaleString("en-IN")}`,
              icon: DollarSign,
              trend: `${s.paid_customers || 0} paid customers`,
              trendColor: "text-emerald-600",
            },
          ]);
        } else {
          setStats([
            {
              title: "Total Rooms",
              value: 0,
              icon: Users,
              trend: "-",
              trendColor: "text-slate-500",
            },
            {
              title: "Total Customers",
              value: 0,
              icon: Users,
              trend: "-",
              trendColor: "text-slate-500",
            },
            {
              title: "Pending Rent",
              value: "INR 0",
              icon: CreditCard,
              trend: "-",
              trendColor: "text-slate-500",
            },
            {
              title: "Monthly Collected",
              value: "INR 0",
              icon: DollarSign,
              trend: "-",
              trendColor: "text-slate-500",
            },
          ]);
        }
      } catch (caught) {
        setError(caught?.message || "Failed to load dashboard stats");
      } finally {
        setStatsLoading(false);
      }

      try {
        setPaymentLoading(true);
        const monthlyResponse = await getMonthlyPayments(selectedMonth);
        setMonthlyPayments(monthlyResponse || []);
      } catch (caught) {
        setError(
          (prev) =>
            prev || caught?.message || "Failed to load monthly payments",
        );
        setMonthlyPayments([]);
      } finally {
        setPaymentLoading(false);
      }
    }

    loadDashboard();
  }, [selectedMonth]);

  const savePayment = async (row) => {
    const amount = Number(row.amount_paid || 0);
    try {
      setPaymentSaving(row.customer_id);
      await createPayment({
        customer_id: row.customer_id,
        month: row.month,
        monthly_rent: Number(row.monthly_rent),
        amount_paid: amount,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: row.payment_method || "Cash",
        remarks: row.remarks || null,
      });
      const refreshed = await getMonthlyPayments(selectedMonth);
      setMonthlyPayments(refreshed || []);
    } catch (caught) {
      setError(caught?.response?.data?.detail || "Failed to save payment");
    } finally {
      setPaymentSaving(null);
    }
  };

  const updatePaymentRow = (customerId, field, value) => {
    setMonthlyPayments((previous) =>
      previous.map((row) =>
        row.customer_id === customerId ? { ...row, [field]: value } : row,
      ),
    );
  };

  const cards = stats || [
    {
      title: "Total Rooms",
      value: "--",
      icon: Users,
      trend: "-",
      trendColor: "text-slate-400",
    },
    {
      title: "Total Customers",
      value: "--",
      icon: Users,
      trend: "-",
      trendColor: "text-slate-400",
    },
    {
      title: "Pending Rent",
      value: "--",
      icon: CreditCard,
      trend: "-",
      trendColor: "text-slate-400",
    },
    {
      title: "Monthly Collected",
      value: "--",
      icon: DollarSign,
      trend: "-",
      trendColor: "text-slate-400",
    },
  ];
  const pendingPayments = monthlyPayments.filter(
    (row) => row.payment_status !== "Paid",
  );

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 relative">
        <ModuleHeader
          icon={<Users size={22} />}
          title="Dashboard"
          tagline="Track rooms, allocations, and reports"
        />
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="max-w-[1300px] mx-auto space-y-6">
          {/* Stats cards */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {(statsLoading ? new Array(4).fill(0) : cards).map(
                (item, idx) => (
                  <article
                    key={item?.title ?? idx}
                    className={`rounded-xl bg-white p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md ${
                      statsLoading ? "animate-pulse" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm uppercase tracking-wide text-slate-500">
                          {item?.title ?? "Loading"}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                          {statsLoading ? "--" : item.value}
                        </p>
                      </div>
                      <div className="bg-slate-100 p-2 rounded-lg text-sky-500">
                        {statsLoading ? (
                          <span className="block w-8 h-8 rounded-md bg-slate-300" />
                        ) : (
                          <item.icon className="h-6 w-6" />
                        )}
                      </div>
                    </div>
                    {!statsLoading && item.trend && (
                      <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-90">
                        <ArrowUpRight
                          className={`h-4 w-4 ${item.trendColor}`}
                        />
                        <span className={item.trendColor}>{item.trend}</span>
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Monthly Rent Payments
                </h2>
                <p className="text-sm text-slate-500">
                  Customers without a paid record are pending from the 5th of
                  the month.
                </p>
              </div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Rent</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Loading monthly payments...
                      </td>
                    </tr>
                  ) : pendingPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        No active customers found.
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map((row) => {
                      const pending = true;
                      return (
                        <tr
                          key={row.customer_id}
                          className={`border-b ${pending ? "bg-red-50" : "bg-white"}`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {row.customer_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.room_number || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            INR{" "}
                            {Number(row.monthly_rent || 0).toLocaleString(
                              "en-IN",
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={row.monthly_rent}
                              value={row.amount_paid ?? 0}
                              onChange={(event) =>
                                updatePaymentRow(
                                  row.customer_id,
                                  "amount_paid",
                                  event.target.value,
                                )
                              }
                              className="w-28 px-2 py-1.5 border border-slate-300 rounded-md"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${pending ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                            >
                              {pending ? "Pending" : "Paid"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => savePayment(row)}
                              disabled={paymentSaving === row.customer_id}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
                            >
                              {paymentSaving === row.customer_id
                                ? "Saving..."
                                : "Save Payment"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
