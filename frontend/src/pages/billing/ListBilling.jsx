import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../app/layout/DashboardLayout";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  FileText,
  Users,
} from "lucide-react";
import { getAllPayments } from "@/services/payments_service";
import { getDashboardStats } from "@/services/dashboard_service";
import ModuleHeader from "@/components/ui/ModuleHeader";

export default function ListPayments() {
  const navigate = useNavigate();

  const [paymentss, setPaymentss] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  // const [totalPayments, setTotalPayments] = useState(0);

  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  const paymentssPerPage = 5;
  const hasPrev = cursorHistory.length > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed.length >= 3) {
        setActiveSearchTerm(trimmed);
      } else if (trimmed.length === 0) {
        setActiveSearchTerm("");
        setCursor(null);
        setCursorHistory([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const activeSearch = activeSearchTerm.length >= 3;
    if (!activeSearch && activeSearchTerm !== "") {
      return;
    }

    const activeCursor = cursor || undefined;

    const doFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const requestId = ++requestIdRef.current;

        const params = {
          limit: paymentssPerPage,
          cursor: activeCursor,
          search: activeSearch ? activeSearchTerm : undefined,
        };

        const [response, statsResponse] = await Promise.all([
          getAllPayments(params),
          // getDashboardStats(),
        ]);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setPaymentss(response.paymentss || []);
        setNextCursor(response.next_cursor || null);
        setHasNext(Boolean(response.has_next));
        // setTotalPayments(statsResponse?.data?.total_payments || 0);
      } catch (err) {
        console.error("Error fetching payments list:", err);
        setError("Failed to load payments list. Please try again.");
      } finally {
        if (requestIdRef.current) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    doFetch();
  }, [cursor, activeSearchTerm]);

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const previousCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setCursor(previousCursor || null);
    }
  };

  const handleNextPage = () => {
    if (hasNext && nextCursor) {
      setCursorHistory((prev) => [...prev, cursor]);
      setCursor(nextCursor);
    }
  };

  const startIndex = cursorHistory.length * paymentssPerPage;

  const handleEditClick = (paymentsId) => {
    navigate(`/payments/${paymentsId}`);
  };

  const handlePdfClick = (payments) => {
    if (!payments) return;
    setSelectedPayments(payments);
    setModalLoading(true);
    setShowBillModal(true);
  };

  const closeBillModal = () => {
    setShowBillModal(false);
    setSelectedPayments(null);
    setModalLoading(false);
  };

  const handlePrintBill = () => {
    if (!selectedPayments || !selectedPayments.id) return;
    window.open(
      `/bill.html?payments_id=${selectedPayments.id}&print=1&api_base=/api/v1`,
      "_blank",
      "noopener",
    );
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 relative">
        <ModuleHeader
          icon={<FileText size={22} />}
          title="Payments Management"
          tagline="Manage payments records"
          action={
            <button
              onClick={() => navigate("/payments/add")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm md:text-base font-semibold py-2 md:py-2.5 px-3 md:px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              Add Payments
            </button>
          }
        />

        {/* <div className="mb-4">
          <p className="inline-flex items-center gap-2 text-sm text-purple-800 font-bold uppercase tracking-wide">
            <Users size={16} />
            Total Bills - {totalPayments}
          </p>
        </div> */}

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by room name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCursor(null);
              setCursorHistory([]);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : !isInitialLoad && paymentss.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No payments records found</p>
            <p className="text-gray-400 mt-2">
              {searchTerm
                ? "Try adjusting your search"
                : "Add your first payments record to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Room Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Phone Number
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Tenant Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Total Bill
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentss.map((payments, index) => (
                    <tr
                      key={payments.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                        {payments.room_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payments.phone_number || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payments.pet_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payments.date || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payments.total_amount
                          ? `₹${payments.total_amount.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handlePdfClick(payments)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                            title="Download PDF"
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            onClick={() => handleEditClick(payments.id)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200"
                            title="Edit Payments"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {paymentss.map((payments) => (
                <div
                  key={payments.id}
                  className="bg-gray-50 rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {payments.room_name || "-"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {payments.pet_name || "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePdfClick(payments)}
                        className="p-2 bg-gray-100 rounded-lg"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => handleEditClick(payments.id)}
                        className="p-2 bg-purple-100 text-purple-600 rounded-lg"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Phone: {payments.phone_number || "-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date: {payments.date || "-"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
              <div className="text-xs md:text-sm text-gray-600">
                Showing {paymentss.length > 0 ? startIndex + 1 : 0} to{" "}
                {startIndex + paymentss.length} of bills
                {/* {totalPayments} bills */}
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={!hasPrev}
                  className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span className="text-xs md:text-sm text-gray-600 px-2">
                  {startIndex + 1} to {startIndex + paymentss.length} of{" "}
                  {/* {totalPayments} */}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {showBillModal && selectedPayments && (
              <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Payments Preview</h2>
                    <button
                      onClick={closeBillModal}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>

                  <div className="relative p-4">
                    {modalLoading && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                      </div>
                    )}
                    <iframe
                      src={`/bill.html?payments_id=${selectedPayments.id}&api_base=/api/v1`}
                      title="Payments Preview"
                      className="w-full h-[75vh] border rounded-lg"
                      onLoad={() => setModalLoading(false)}
                    />
                  </div>

                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
                    <button
                      onClick={closeBillModal}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                      Close
                    </button>
                    <button
                      onClick={handlePrintBill}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
