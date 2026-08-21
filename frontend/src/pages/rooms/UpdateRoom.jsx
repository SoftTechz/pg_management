import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Home, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../app/layout/DashboardLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { deleteRoom, getRoomById, updateRoom } from "@/services/room_service";

export default function UpdateRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    roomNumber: "",
    totalBeds: "",
    status: "Available",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRoomById(roomId)
      .then((response) => {
        const room = response.room || response;
        setFormData({
          roomNumber: room.room_number || "",
          totalBeds: String(room.total_beds || ""),
          status: room.status || "Available",
        });
      })
      .catch(() => toast.error("Failed to load room."))
      .finally(() => setLoading(false));
  }, [roomId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.roomNumber.trim() || !formData.totalBeds)
      return toast.error("Room number and beds are required.");
    try {
      setSaving(true);
      await updateRoom(roomId, {
        room_number: formData.roomNumber.trim(),
        total_beds: Number(formData.totalBeds),
        status: formData.status,
      });
      toast.success("Room updated successfully.");
      navigate("/rooms");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to update room.");
    } finally {
      setSaving(false);
    }
  };

  const removeRoom = async () => {
    if (!window.confirm("Delete this room?")) return;
    try {
      await deleteRoom(roomId);
      toast.success("Room deleted successfully.");
      navigate("/rooms");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to delete room.");
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 relative">
        <LoadingOverlay
          show={loading || saving}
          message={saving ? "Saving room..." : "Loading room..."}
        />
        <ModuleHeader
          icon={<Home size={22} />}
          title="Edit Room"
          tagline="Update room capacity and status"
          action={
            <button
              type="button"
              onClick={() => navigate("/rooms")}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          }
        />
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b border-gray-200" />
          <section>
            <SectionHeader
              title="Room Details"
              icon={<ClipboardList size={18} />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <Field
                label="Room Number"
                name="roomNumber"
                value={formData.roomNumber}
                onChange={(event) =>
                  setFormData({ ...formData, roomNumber: event.target.value })
                }
              />
              <div>
                <label
                  htmlFor="totalBeds"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Number of Beds
                </label>
                <select
                  id="totalBeds"
                  value={formData.totalBeds}
                  onChange={(event) =>
                    setFormData({ ...formData, totalBeds: event.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1} {index === 0 ? "bed" : "beds"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(event) =>
                    setFormData({ ...formData, status: event.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white"
                >
                  <option>Available</option>
                  <option>Maintenance</option>
                </select>
              </div>
            </div>
          </section>
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              <Save size={18} />
              Save Changes
            </button>
            <button
              type="button"
              onClick={removeRoom}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 px-4 rounded-lg disabled:opacity-50"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label
        htmlFor={props.name}
        className="block text-sm font-semibold text-gray-700 mb-2"
      >
        {label}
      </label>
      <input
        id={props.name}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        {...props}
      />
    </div>
  );
}
