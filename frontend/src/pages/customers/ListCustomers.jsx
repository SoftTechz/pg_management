import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import DashboardLayout from "../../app/layout/DashboardLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { getAllCustomers } from "@/services/customer_service";
import { getAllRooms } from "@/services/room_service";
import {
  createAllocation,
  deleteAllocation,
  getAllAllocations,
} from "@/services/allocation_service";
import toast from "react-hot-toast";

const CUSTOMERS_PER_PAGE = 10;

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function formatCurrency(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatAddress(address) {
  if (!address) return "-";
  if (typeof address === "string") return address || "-";
  return (
    [address.address, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ") || "-"
  );
}

export default function ListCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [allocationCustomer, setAllocationCustomer] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [activeAllocation, setActiveAllocation] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

  const loadAllocationData = async (customer) => {
    setAllocationCustomer(customer);
    setSelectedRoomId("");
    setSelectedBed("");
    setAllocationLoading(true);
    try {
      const [roomResponse, allocationResponse] = await Promise.all([
        getAllRooms(),
        getAllAllocations(),
      ]);
      const roomList = Array.isArray(roomResponse)
        ? roomResponse
        : roomResponse.rooms || [];
      const allocations = Array.isArray(allocationResponse)
        ? allocationResponse
        : allocationResponse.allocations || [];
      setRooms(roomList);
      setActiveAllocation(
        allocations.find(
          (allocation) =>
            allocation.customer_id === customer.id &&
            allocation.status === "Active",
        ) || null,
      );
    } catch {
      toast.error("Failed to load allocation details.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const availableBeds = selectedRoom
    ? Array.from(
        { length: Number(selectedRoom.available_beds || 0) },
        (_, index) => index + 1,
      ).filter(
        (bed) =>
          !(selectedRoom.occupants || []).some(
            (occupant) => Number(occupant.bed_number) === bed,
          ),
      )
    : [];

  const submitAllocation = async () => {
    if (!selectedRoomId || !selectedBed || !allocationCustomer) return;
    try {
      setAllocationLoading(true);
      await createAllocation({
        customer_id: allocationCustomer.id,
        room_id: selectedRoomId,
        bed_number: Number(selectedBed),
      });
      toast.success("Room allocated successfully.");
      setAllocationCustomer(null);
      window.location.reload();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to allocate room.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const vacateAllocation = async () => {
    if (!activeAllocation) return;
    try {
      setAllocationLoading(true);
      await deleteAllocation(activeAllocation.id);
      toast.success("Room vacated successfully.");
      setAllocationCustomer(null);
      window.location.reload();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to vacate room.");
    } finally {
      setAllocationLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearchTerm(searchTerm.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        setLoading(true);
        setError("");
        const response = await getAllCustomers(
          activeSearchTerm ? { search: activeSearchTerm } : {},
        );
        if (!cancelled) {
          setCustomers(
            Array.isArray(response) ? response : response.customers || [],
          );
        }
      } catch (caught) {
        console.error("Error loading customers:", caught);
        if (!cancelled) {
          setError("Failed to load customers. Please try again.");
          setCustomers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [activeSearchTerm]);

  const totalCustomers = customers.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCustomers / CUSTOMERS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * CUSTOMERS_PER_PAGE;
  const paginatedCustomers = useMemo(
    () => customers.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE),
    [customers, startIndex],
  );

  const openView = (customer) => {
    setSelectedCustomer(customer);
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 relative min-w-0">
        <LoadingOverlay show={loading} message="Loading customers..." />
        <ModuleHeader
          icon={<Users size={22} />}
          title="Customer Management"
          tagline="Manage customer admissions and room rent"
          action={
            <button
              onClick={() => navigate("/customers/add")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm md:text-base font-semibold py-2 md:py-2.5 px-3 md:px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              Add Customer
            </button>
          }
        />

        <div className="mb-2">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-800">
            <Users size={14} />
            Total Customers - {totalCustomers}
          </span>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by customer name or room number..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full min-w-0 pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {!loading && totalCustomers === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No customers found</p>
            <p className="text-gray-400 mt-2">
              {activeSearchTerm
                ? "Try another name or room number"
                : "Add your first customer to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <TableHeader>S.No</TableHeader>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Mobile</TableHeader>
                    <TableHeader>Room Number</TableHeader>
                    <TableHeader>Admission Date</TableHeader>
                    <TableHeader>Monthly Rent</TableHeader>
                    <TableHeader align="center">Action</TableHeader>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer, index) => (
                    <tr
                      key={customer.id || `${customer.name}-${index}`}
                      onClick={() => openView(customer)}
                      className="border-b border-gray-200 hover:bg-gray-50 transition duration-150 cursor-pointer"
                    >
                      <TableCell strong>{startIndex + index + 1}</TableCell>
                      <TableCell strong>{customer.name || "-"}</TableCell>
                      <TableCell>{customer.mobile_number || "-"}</TableCell>
                      <TableCell>{customer.room_number || "-"}</TableCell>
                      <TableCell>
                        {formatDate(customer.admission_date)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(customer.monthly_rent)}
                      </TableCell>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/customers/${customer.id}/edit`);
                            }}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition"
                            title="Edit Customer"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              loadAllocationData(customer);
                            }}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                            title="Allocate or vacate room"
                          >
                            <BedDouble size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {paginatedCustomers.map((customer, index) => (
                <article
                  key={customer.id || `${customer.name}-${index}`}
                  onClick={() => openView(customer)}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-3.5 space-y-3 cursor-pointer active:bg-gray-100 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-purple-700">
                        S.No {startIndex + index + 1}
                      </p>
                      <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                        {customer.name || "-"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Room {customer.room_number || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/customers/${customer.id}/edit`);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600"
                        title="Edit Customer"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          loadAllocationData(customer);
                        }}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700"
                        title="Allocate or vacate room"
                      >
                        <BedDouble size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-xs sm:text-sm text-gray-600">
                    <Info label="Mobile" value={customer.mobile_number} />
                    <Info
                      label="Admission Date"
                      value={formatDate(customer.admission_date)}
                    />
                    <Info
                      label="Monthly Rent"
                      value={formatCurrency(customer.monthly_rent)}
                    />
                  </div>
                </article>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCustomers}
              startIndex={startIndex}
              shownCount={paginatedCustomers.length}
              onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
              onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            />
          </>
        )}
      </div>

      {allocationCustomer && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Room Allocation
                </h2>
                <p className="text-sm text-gray-500">
                  {allocationCustomer.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllocationCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[76vh]">
              {allocationLoading && (
                <p className="text-sm text-gray-500">
                  Loading allocation details...
                </p>
              )}
              {activeAllocation ? (
                <>
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                    Currently allocated to room{" "}
                    {activeAllocation.room_number ||
                      activeAllocation.roomNumber ||
                      "-"}
                    , bed {activeAllocation.bed_number}.
                  </div>
                  <button
                    type="button"
                    onClick={vacateAllocation}
                    disabled={allocationLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
                  >
                    Vacate Room
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="allocationRoom"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Room Number
                    </label>
                    <select
                      id="allocationRoom"
                      value={selectedRoomId}
                      onChange={(event) => {
                        setSelectedRoomId(event.target.value);
                        setSelectedBed("");
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">Select a vacant room</option>
                      {rooms
                        .filter((room) => Number(room.available_beds || 0) > 0)
                        .map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.room_number} ({room.available_beds} beds
                            available)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="allocationBed"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Bed Number
                    </label>
                    <select
                      id="allocationBed"
                      value={selectedBed}
                      onChange={(event) => setSelectedBed(event.target.value)}
                      disabled={!selectedRoomId}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                    >
                      <option value="">Select a bed</option>
                      {availableBeds.map((bed) => (
                        <option key={bed} value={bed}>
                          Bed {bed}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={submitAllocation}
                    disabled={
                      allocationLoading || !selectedRoomId || !selectedBed
                    }
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50"
                  >
                    Allocate Room
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {selectedCustomer.name || "Customer Details"}
                </h2>
                <p className="text-sm text-gray-500">
                  Room {selectedCustomer.room_number || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 transition shrink-0"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[78vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <Detail label="Name" value={selectedCustomer.name} />
                <Detail label="Mobile" value={selectedCustomer.mobile_number} />
                <Detail
                  label="Room Number"
                  value={selectedCustomer.room_number}
                />
                <Detail
                  label="Monthly Rent"
                  value={formatCurrency(selectedCustomer.monthly_rent)}
                />
                <Detail
                  label="Admission Date"
                  value={formatDate(selectedCustomer.admission_date)}
                />
                <Detail
                  label="Date of Birth"
                  value={formatDate(selectedCustomer.date_of_birth)}
                />
                <Detail label="Education" value={selectedCustomer.education} />
                <Detail
                  label="Advance"
                  value={formatCurrency(selectedCustomer.advance)}
                />
                <Detail
                  label="Aadhaar Number"
                  value={selectedCustomer.aadhaar_number}
                />
                <Detail
                  label="Father's Name"
                  value={selectedCustomer.father_name}
                />
                <Detail
                  label="Father's Occupation"
                  value={selectedCustomer.father_occupation}
                />
                <Detail
                  label="Working Details"
                  value={selectedCustomer.working_details}
                />
                <Detail
                  label="Work Address"
                  value={selectedCustomer.work_address}
                />
                <Detail
                  label="Permanent Address"
                  value={formatAddress(selectedCustomer.permanent_address)}
                />
                <Detail label="Status" value={selectedCustomer.status} />
                <Detail
                  label="Created At"
                  value={formatDate(selectedCustomer.created_at)}
                />
                <Detail
                  label="Updated At"
                  value={formatDate(selectedCustomer.updated_at)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  shownCount,
  onPrev,
  onNext,
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs md:text-sm text-gray-600">
        Showing {startIndex + 1} to {startIndex + shownCount} of {totalItems}{" "}
        customers
      </p>
      <div className="flex items-center justify-between sm:justify-end gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <span className="text-xs md:text-sm text-gray-600 px-2 whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function TableHeader({ children, align = "left" }) {
  const alignClass = align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-4 py-4 ${alignClass} text-sm font-semibold text-gray-700 whitespace-nowrap`}
    >
      {children}
    </th>
  );
}

function TableCell({ children, strong = false }) {
  return (
    <td
      className={`px-4 py-4 text-sm align-top ${strong ? "text-gray-800 font-medium" : "text-gray-600"}`}
    >
      {children || "-"}
    </td>
  );
}

function Info({ label, value }) {
  return (
    <p>
      <span className="font-semibold text-gray-700">{label}: </span>
      {value || "-"}
    </p>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 min-w-0">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900 break-words">{value || "-"}</p>
    </div>
  );
}
