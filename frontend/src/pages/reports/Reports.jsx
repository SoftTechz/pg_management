import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import DashboardLayout from "@/app/layout/DashboardLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import { getAllCustomers } from "@/services/customer_service";
import {
  exportReportExcel,
  getCustomerReport,
  getMonthlyPaymentReport,
  getPaymentHistoryReport,
  getRoomReport,
} from "@/services/report_service";

const REPORTS = [
  ["customers", "Customer Report"],
  ["rooms", "Room Report"],
  ["monthly", "Monthly Payment Report"],
  ["history", "Payment History"],
];
const PAGE_SIZE = 10;

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState("customers");
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedReport = searchParams.get("report");
    if (REPORTS.some(([key]) => key === requestedReport)) {
      setReport(requestedReport);
    }
  }, [searchParams]);

  useEffect(() => {
    getAllCustomers()
      .then((response) =>
        setCustomers(
          Array.isArray(response) ? response : response.customers || [],
        ),
      )
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => setPage(1), [report, month, status, customerId]);

  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      if (report === "history" && !customerId) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        let response = [];
        if (report === "customers") response = await getCustomerReport();
        if (report === "rooms") response = await getRoomReport();
        if (report === "monthly")
          response = await getMonthlyPaymentReport(
            month,
            status === "all" ? undefined : status,
          );
        if (report === "history")
          response = await getPaymentHistoryReport(customerId);
        if (!cancelled) setRows(response || []);
      } catch {
        if (!cancelled) {
          setRows([]);
          setError("Failed to load report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadReport();
    return () => {
      cancelled = true;
    };
  }, [report, month, status, customerId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage],
  );

  const exportExcel = async () => {
    try {
      setExporting(true);
      const params =
        report === "monthly"
          ? { month, ...(status !== "all" ? { status } : {}) }
          : report === "history" && customerId
            ? { customer_id: customerId }
            : {};
      download(
        await exportReportExcel(report, params),
        `${report}-report.xlsx`,
      );
    } catch {
      setError("Failed to export Excel report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 h-full min-h-0 flex flex-col">
        <ModuleHeader
          icon={<FileText size={22} />}
          title="Reports"
          tagline="Select a report submodule"
          action={
            <button
              type="button"
              onClick={exportExcel}
              disabled={exporting || (report === "history" && !customerId)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              {exporting ? "Exporting..." : "Export Excel"}
            </button>
          }
        />
        <nav
          className="flex flex-wrap gap-2 border-b border-gray-200 mb-5 shrink-0"
          aria-label="Report submodules"
        >
          {REPORTS.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => {
                setReport(key);
                setSearchParams({ report: key });
              }}
              className={`px-3 py-2.5 text-sm font-semibold border-b-2 ${report === key ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {report === "monthly" && (
            <>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="all">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </>
          )}
          {report === "history" && (
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{" "}
                  {customer.room_number ? `- Room ${customer.room_number}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="mb-4 text-sm font-bold uppercase tracking-wide text-purple-800">
          Total Records - {rows.length}
        </div>
        <div className="min-h-0 flex-1 overflow-auto pr-1">
          {loading ? (
            <div className="py-10 text-center text-gray-500">
              Loading report...
            </div>
          ) : (
            <ReportTable type={report} rows={visibleRows} />
          )}
          {rows.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, rows.length)} of{" "}
                {rows.length} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ReportTable({ type, rows }) {
  if (!rows.length)
    return (
      <div className="py-10 text-center text-gray-500">No records found.</div>
    );
  if (type === "customers")
    return (
      <Table
        headers={[
          "Name",
          "Date Of Birth",
          "Mobile",
          "Father Name",
          "Father Occupation",
          "Aadhaar",
          "Room",
          "Admission Date",
          "Advance",
          "Monthly Rent",
          "Status",
          "Education",
          "Qualification",
          "Working Details",
          "Company",
          "Work Address",
          "Permanent Address",
        ]}
        rows={rows.map((row) => [
          row.name,
          row.date_of_birth,
          row.mobile_number,
          row.father_name,
          row.father_occupation,
          row.aadhaar_number,
          row.room_number,
          row.admission_date,
          row.advance,
          row.monthly_rent,
          row.status,
          row.education,
          row.qualification,
          row.working_details,
          row.company_organization,
          row.work_address,
          typeof row.permanent_address === "object"
            ? Object.values(row.permanent_address || {})
                .filter(Boolean)
                .join(", ")
            : row.permanent_address,
        ])}
      />
    );
  if (type === "rooms")
    return (
      <Table
        headers={[
          "Room",
          "Floor",
          "Total Beds",
          "Occupied",
          "Available",
          "Status",
          "Occupants",
        ]}
        rows={rows.map((row) => [
          row.room_number,
          row.floor,
          row.total_beds,
          row.occupied_beds,
          row.available_beds,
          row.status,
          (row.occupants || [])
            .map((occupant) => `${occupant.name} (Bed ${occupant.bed_number})`)
            .join(", "),
        ])}
      />
    );
  const headers =
    type === "monthly"
      ? ["Customer", "Room", "Month", "Rent", "Paid", "Remaining", "Status"]
      : [
          "Month",
          "Customer",
          "Room",
          "Rent",
          "Paid",
          "Remaining",
          "Status",
          "Payment Date",
          "Payment Method",
          "Remarks",
        ];
  return (
    <Table
      headers={headers}
      rows={rows.map((row) =>
        type === "monthly"
          ? [
              row.customer_name,
              row.room_number,
              row.month,
              row.monthly_rent,
              row.amount_paid,
              row.remaining_amount,
              row.payment_status,
            ]
          : [
              row.month,
              row.customer_name,
              row.room_number,
              row.monthly_rent,
              row.amount_paid,
              row.remaining_amount,
              row.payment_status,
              row.payment_date,
              row.payment_method,
              row.remarks,
            ],
      )}
    />
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-gray-200 hover:bg-gray-50"
            >
              {row.map((value, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-gray-700 align-top min-w-32"
                >
                  {value || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
