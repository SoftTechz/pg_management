import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Home, Plus } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../app/layout/DashboardLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { createRoom } from "@/services/room_service";

export default function AddRoom() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ roomNumber: "", totalBeds: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!formData.roomNumber.trim())
      nextErrors.roomNumber = "Room number is required.";
    if (!formData.totalBeds)
      nextErrors.totalBeds = "Number of beds is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setLoading(true);
      await createRoom({
        room_number: formData.roomNumber.trim(),
        total_beds: Number(formData.totalBeds),
        status: "Available",
      });
      toast.success("Room added successfully.");
      navigate("/rooms");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to add room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 relative">
          <LoadingOverlay show={loading} message="Creating room..." />
          <ModuleHeader
            icon={<Home size={22} />}
            title="Add Room"
            tagline="Create a room and set its bed capacity"
            action={
              <button
                type="button"
                onClick={() => navigate("/rooms")}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <Field
                  label="Room Number"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  error={errors.roomNumber}
                  required
                  placeholder="Enter room number"
                />
                <div>
                  <label
                    htmlFor="totalBeds"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Number of Beds <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="totalBeds"
                    name="totalBeds"
                    value={formData.totalBeds}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">Select beds</option>
                    {Array.from({ length: 6 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1} {index === 0 ? "bed" : "beds"}
                      </option>
                    ))}
                  </select>
                  {errors.totalBeds && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.totalBeds}
                    </p>
                  )}
                </div>
              </div>
            </section>
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus size={18} />
                  {loading ? "Saving..." : "Add Room"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, error, required, ...props }) {
  return (
    <div>
      <label
        htmlFor={props.name}
        className="block text-sm font-semibold text-gray-700 mb-2"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={props.name}
        required={required}
        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        {...props}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
