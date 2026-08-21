import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import DashboardLayout from "../../app/layout/DashboardLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { getAllRooms } from "@/services/room_service";
import { getCustomerById } from "@/services/customer_service";

const ROOMS_PER_PAGE = 10;

export default function ListRooms() {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [occupantsLoading, setOccupantsLoading] = useState(false);

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    setOccupants([]);
    setOccupantsLoading(true);
    try {
      const roomOccupants = room.occupants || [];
      const details = await Promise.all(
        roomOccupants.map(async (occupant) => {
          try {
            return await getCustomerById(occupant.id);
          } catch {
            return {
              id: occupant.id,
              name: occupant.name,
              bed_number: occupant.bed_number,
            };
          }
        }),
      );
      setOccupants(
        details.map((customer, index) => ({
          ...customer,
          bed_number: roomOccupants[index]?.bed_number,
        })),
      );
    } finally {
      setOccupantsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadRooms() {
      try {
        setLoading(true);
        setError("");
        const response = await getAllRooms();
        const roomList = Array.isArray(response)
          ? response
          : response.rooms || [];
        if (!cancelled) setRooms(roomList);
      } catch {
        if (!cancelled) {
          setError("Failed to load rooms. Please try again.");
          setRooms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRooms();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setPage(1), [searchTerm, statusFilter]);

  const filteredRooms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesSearch =
        !term ||
        String(room.room_number || "")
          .toLowerCase()
          .includes(term);
      const vacant = Number(room.available_beds ?? room.total_beds ?? 0) > 0;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "vacant" ? vacant : !vacant);
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRooms.length / ROOMS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * ROOMS_PER_PAGE;
  const visibleRooms = filteredRooms.slice(
    startIndex,
    startIndex + ROOMS_PER_PAGE,
  );

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 relative">
        <LoadingOverlay show={loading} message="Loading rooms..." />
        <ModuleHeader
          icon={<Home size={22} />}
          title="Room Management"
          tagline="Manage room capacity and occupancy"
          action={
            <button
              onClick={() => (window.location.hash = "#/rooms/add")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-md"
            >
              <Plus size={18} />
              Add Room
            </button>
          }
        />
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-800">
            <Home size={14} />
            Total Rooms - {rooms.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by room number..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="all">All rooms</option>
            <option value="vacant">Vacant rooms</option>
            <option value="filled">Filled rooms</option>
          </select>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {!loading && visibleRooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No rooms found</p>
            <p className="text-gray-400 mt-2">
              Try another room number or filter.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <Header>S.No</Header>
                    <Header>Room Number</Header>
                    <Header>Total Beds</Header>
                    <Header>Available Beds</Header>
                    <Header>Status</Header>
                    <Header align="center">Action</Header>
                  </tr>
                </thead>
                <tbody>
                  {visibleRooms.map((room, index) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      index={startIndex + index}
                      onOpen={handleRoomClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {visibleRooms.map((room, index) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  index={startIndex + index}
                  onOpen={handleRoomClick}
                />
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs md:text-sm text-gray-600">
                Showing {startIndex + 1} to {startIndex + visibleRooms.length}{" "}
                of {filteredRooms.length} rooms
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) => Math.max(1, previous - 1))
                  }
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
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
                    setPage((previous) => Math.min(totalPages, previous + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Room {selectedRoom.room_number}
                </h2>
                <p className="text-sm text-gray-500">
                  Customer details for current occupants
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[72vh]">
              {occupantsLoading ? (
                <p className="text-center py-8 text-gray-500">
                  Loading customer details...
                </p>
              ) : occupants.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No customers are living in this room.
                </p>
              ) : (
                <div className="space-y-3">
                  {occupants.map((customer) => (
                    <div
                      key={customer.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {customer.name || "-"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Bed {customer.bed_number || "-"}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                          {customer.status || "Active"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm text-gray-600">
                        <span>Mobile: {customer.mobile_number || "-"}</span>
                        <span>Admission: {customer.admission_date || "-"}</span>
                        <span>
                          Monthly rent: INR{" "}
                          {Number(customer.monthly_rent || 0).toLocaleString(
                            "en-IN",
                          )}
                        </span>
                        <span>Education: {customer.education || "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function RoomRow({ room, index, onOpen }) {
  const navigate = (path) => {
    window.location.hash = `#${path}`;
  };
  const vacant = Number(room.available_beds ?? room.total_beds ?? 0) > 0;
  return (
    <tr
      onClick={() => onOpen(room)}
      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
    >
      <Cell>{index + 1}</Cell>
      <Cell strong>{room.room_number || "-"}</Cell>
      <Cell>{room.total_beds || 0}</Cell>
      <Cell>{room.available_beds ?? room.total_beds ?? 0}</Cell>
      <Cell>
        <Status vacant={vacant} />
      </Cell>
      <td className="px-4 py-4 text-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/rooms/${room.id}`);
          }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200"
          title="Edit Room"
        >
          <Pencil size={16} />
        </button>
      </td>
    </tr>
  );
}

function RoomCard({ room, index, onOpen }) {
  const vacant = Number(room.available_beds ?? room.total_beds ?? 0) > 0;
  return (
    <article
      onClick={() => onOpen(room)}
      className="bg-white rounded-lg border border-slate-200 p-2.5 cursor-pointer shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-purple-700">
            S.No {index + 1}
          </p>
          <h3 className="font-semibold text-gray-900 text-xs leading-4 line-clamp-2">
            Room {room.room_number || "-"}
          </h3>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            window.location.hash = `#/rooms/${room.id}`;
          }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600"
          title="Edit Room"
        >
          <Pencil size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-600">
        <span>Total beds: {room.total_beds || 0}</span>
        <span>Available: {room.available_beds ?? room.total_beds ?? 0}</span>
      </div>
      <div className="mt-2">
        <Status vacant={vacant} />
      </div>
    </article>
  );
}

function Status({ vacant }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${vacant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
    >
      {vacant ? "Vacant" : "Filled"}
    </span>
  );
}
function Header({ children, align = "left" }) {
  return (
    <th
      className={`px-4 py-4 text-${align} text-sm font-semibold text-gray-700 whitespace-nowrap`}
    >
      {children}
    </th>
  );
}
function Cell({ children, strong }) {
  return (
    <td
      className={`px-4 py-4 text-sm ${strong ? "text-gray-800 font-medium" : "text-gray-600"}`}
    >
      {children}
    </td>
  );
}
