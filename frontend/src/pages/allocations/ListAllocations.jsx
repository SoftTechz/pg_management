import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../../app/layout/DashboardLayout";
import {
  CalendarDays,
  Eye,
  FileText,
  Hash,
  Search,
  X,
  Printer,
  Download,
} from "lucide-react";
import { getAllAllocations } from "@/services/allocation_service";
import ModuleHeader from "@/components/ui/ModuleHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

const TABS = ["active", "completed", "cancelled"];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ListAllocations() {
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_URL || "";
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().split("T")[0];
  const roomId = searchParams.get("roomId") || "";
  const roomName = searchParams.get("roomName") || "";

  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allocations, setAllocations] = useState([]);
  // const [allocationTotals, setAllocationTotals] = useState({
  //   active: 0,
  //   completed: 0,
  //   cancelled: 0,
  // });
  const [searchTerm, setSearchTerm] = useState("");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfAllocation, setPdfAllocation] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfIframeRef = useRef(null);

  useEffect(() => {
    fetchAllocations();
  }, [selectedDate, roomId]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllAllocations({
        date: selectedDate,
        room_id: roomId || undefined,
        minimal: true,
      });
      setAllocations(response.allocations || []);
      // setAllocationTotals({
      //   active: response.total_allocations_active || 0,
      //   completed: response.total_allocations_completed || 0,
      //   cancelled: response.total_allocations_cancelled || 0,
      // });
    } catch (err) {
      setError("Failed to load allocations.");
      console.error("Error fetching allocations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllocation = (allocation) => {
    setPdfAllocation(allocation);
    setShowPdfModal(true);
    setPdfLoading(true);
  };

  const closePdfModal = () => {
    setShowPdfModal(false);
    setPdfAllocation(null);
    setPdfLoading(false);
  };

  const getDownloadDatePart = (allocation) => {
    const rawDate = allocation?.date || allocation?.created_at;
    if (!rawDate) return "unknown-date";

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return String(rawDate).replace(/[^\w-]/g, "-");
    }

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handlePrint = async () => {
    try {
      const iframeWindow = pdfIframeRef.current?.contentWindow;
      if (!iframeWindow) {
        console.error("Prescription preview is not ready for printing.");
        return;
      }
      iframeWindow.focus();
      iframeWindow.print();
    } catch (error) {
      console.error("Error printing prescription preview:", error);
    }
  };
  const handleDownload = async () => {
    if (!pdfAllocation?.id) {
      console.error("Allocation ID not available");
      return;
    }

    try {
      const baseApi = "/api/v1";
      const pdfUrl = `${baseApi}/allocations/${pdfAllocation.id}/pdf?download=1`;
      const namePart = String(
        pdfAllocation.roomName || "prescription",
      ).replace(/[^\w-]/g, "-");
      const allocationIdPart = pdfAllocation.id || "no-id";
      const datePart = getDownloadDatePart(pdfAllocation);

      // Format: ownername_allocationid_date
      const filename = `${namePart}_${allocationIdPart}_${datePart}.pdf`;

      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const filteredAllocations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return allocations.filter((allocation) => {
      const statusMatch =
        (allocation.status || "active").toLowerCase() === activeTab;

      if (!statusMatch) return false;
      if (!query) return true;

      const name = (allocation.roomName || "").toLowerCase();
      const phone = String(allocation.phone || "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [allocations, activeTab, searchTerm]);

  const counts = useMemo(
    () => ({
      active: allocations.filter(
        (item) => (item.status || "active").toLowerCase() === "active",
      ).length,
      completed: allocations.filter(
        (item) => (item.status || "active").toLowerCase() === "completed",
      ).length,
      cancelled: allocations.filter(
        (item) => (item.status || "active").toLowerCase() === "cancelled",
      ).length,
    }),
    [allocations],
  );

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 relative">
        <LoadingOverlay show={loading} message="Loading allocations..." />
        <ModuleHeader
          icon={<CalendarDays size={22} />}
          title="Allocations"
          tagline={
            roomId
              ? `Allocations for ${roomName || "selected room"}`
              : "Manage daily allocations"
          }
        />

        {/* <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50 px-4 py-4">
          <label className="block text-sm font-semibold text-purple-800 mb-2">
            Filter By Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full sm:w-72 px-4 py-2.5 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          />
        </div> */}
        <div className="mb-4">
          <p className="inline-flex items-center gap-2 text-sm text-purple-800 font-bold uppercase tracking-wide">
            Filter By Date -{" "}
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full sm:w-72 px-4 py-2.5 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            />
          </p>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by room name or phone number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab} ({counts[tab] || 0})
            </button>
          ))}
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
        ) : filteredAllocations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {activeTab} allocations for {formatDate(selectedDate)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <Hash size={14} />
                      S.No
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Room Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Number
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Tenant Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Room Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map((allocation, index) => (
                  <tr
                    key={allocation.id}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      navigate(`/allocations/${allocation.id}`, {
                        state: { allocation, sourceTab: activeTab },
                      })
                    }
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                      {allocation.roomName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {allocation.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {allocation.petName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {allocation.petType || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {allocation.time || "-"}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewAllocation(allocation);
                        }}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition duration-150"
                        title="Prescription / PDF"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/allocations/${allocation.id}`, {
                            state: { allocation, sourceTab: activeTab },
                          });
                        }}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition duration-150"
                        title="View Allocation"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Prescription Modal */}
        {showPdfModal && pdfAllocation && (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  Allocation Prescription
                </h2>
                <button
                  onClick={closePdfModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="relative p-6">
                <LoadingOverlay
                  show={pdfLoading}
                  message="Loading prescription..."
                />
                <iframe
                  ref={pdfIframeRef}
                  src={`/peepalvets.html?allocation_id=${
                    pdfAllocation.id
                  }&api_base=/api/v1`}
                  title="Prescription Preview"
                  className="w-full h-[75vh] border rounded-lg bg-white"
                  onLoad={() => setPdfLoading(false)}
                />
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={closePdfModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                >
                  <Printer size={18} />
                  Print
                </button>
                {/* <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
                >
                  <Download size={18} />
                  Download
                </button> */}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
