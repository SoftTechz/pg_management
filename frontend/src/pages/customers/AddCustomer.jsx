import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ClipboardList,
  Home,
  UserPlus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../app/layout/DashboardLayout";
import { createCustomer } from "@/services/customer_service";
import { getAllRooms } from "@/services/room_service";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import ModuleHeader from "@/components/ui/ModuleHeader";
import SectionHeader from "@/components/ui/SectionHeader";

const initialFormData = {
  name: "",
  workingDetails: "",
  workAddress: "",
  dateOfBirth: "",
  education: "",
  advance: "",
  monthlyRent: "",
  mobileNumber: "",
  fatherName: "",
  fatherOccupation: "",
  permanentAddress: "",
  aadhaarNumber: "",
  roomNumber: "",
  admissionDate: "",
};

export default function AddCustomer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getAllRooms()
      .then((response) => {
        if (!cancelled)
          setRooms(Array.isArray(response) ? response : response.rooms || []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load rooms.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};
    const mobile = formData.mobileNumber.trim();
    const aadhaar = formData.aadhaarNumber.replace(/\s/g, "");

    if (!formData.name.trim()) nextErrors.name = "Customer name is required.";
    if (!mobile) {
      nextErrors.mobileNumber = "Mobile number is required.";
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      nextErrors.mobileNumber = "Enter a valid 10 digit mobile number.";
    }
    if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
      nextErrors.aadhaarNumber = "Aadhaar number must be 12 digits.";
    }
    if (formData.advance && Number(formData.advance) < 0) {
      nextErrors.advance = "Advance cannot be negative.";
    }
    if (formData.monthlyRent && Number(formData.monthlyRent) < 0) {
      nextErrors.monthlyRent = "Monthly rent cannot be negative.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    try {
      setLoading(true);
      await createCustomer({
        name: formData.name.trim(),
        working_details: formData.workingDetails.trim() || null,
        work_address: formData.workAddress.trim() || null,
        date_of_birth: formData.dateOfBirth || null,
        education: formData.education.trim() || null,
        advance: formData.advance ? Number(formData.advance) : 0,
        monthly_rent: formData.monthlyRent ? Number(formData.monthlyRent) : 0,
        mobile_number: formData.mobileNumber.trim(),
        father_name: formData.fatherName.trim() || null,
        father_occupation: formData.fatherOccupation.trim() || null,
        permanent_address: {
          address: formData.permanentAddress.trim(),
          city: "",
          state: "",
          pincode: "",
        },
        aadhaar_number: formData.aadhaarNumber.replace(/\s/g, "") || null,
        room_number: formData.roomNumber.trim() || null,
        admission_date: formData.admissionDate || null,
        status: "Active",
      });
      toast.success("Customer added successfully.");
      navigate("/customers");
    } catch (error) {
      console.error("Error creating customer:", error);
      const detail = error?.response?.data?.detail;
      toast.error(
        typeof detail === "string" ? detail : "Failed to add customer.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-5 relative min-w-0">
          <LoadingOverlay show={loading} message="Creating customer..." />
          <ModuleHeader
            icon={<Users size={22} />}
            title="Add Customer"
            tagline="Create a customer admission profile"
            action={
              <button
                type="button"
                onClick={() => navigate("/customers")}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            }
          />

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <div className="border-b border-gray-200 mb-2"></div>

            <section>
              <SectionHeader
                title="Customer Details"
                icon={<ClipboardList size={18} />}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <TextField
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  required
                  placeholder="Enter customer name"
                />
                <TextField
                  label="Mobile Number"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  error={errors.mobileNumber}
                  required
                  maxLength="10"
                  placeholder="Enter mobile number"
                />
                <TextField
                  label="Date of Birth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  type="date"
                />
                <TextField
                  label="Education"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  placeholder="Enter education"
                />
                <TextField
                  label="Aadhaar Number"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  error={errors.aadhaarNumber}
                  maxLength="12"
                  placeholder="Enter Aadhaar number"
                />
                <TextField
                  label="Advance"
                  name="advance"
                  value={formData.advance}
                  onChange={handleChange}
                  error={errors.advance}
                  type="number"
                  min="0"
                  placeholder="Enter advance amount"
                />
                <TextField
                  label="Monthly Rent"
                  name="monthlyRent"
                  value={formData.monthlyRent}
                  onChange={handleChange}
                  error={errors.monthlyRent}
                  type="number"
                  min="0"
                  required
                  placeholder="Enter monthly rent"
                />
              </div>
            </section>

            <section>
              <SectionHeader
                title="Work And Family"
                icon={<BriefcaseBusiness size={18} />}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <TextArea
                  label="Working Details"
                  name="workingDetails"
                  value={formData.workingDetails}
                  onChange={handleChange}
                  placeholder="Enter job, business, or study details"
                />
                <TextArea
                  label="Work Address"
                  name="workAddress"
                  value={formData.workAddress}
                  onChange={handleChange}
                  placeholder="Enter working address"
                />
                <TextField
                  label="Father's Name"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="Enter father's name"
                />
                <TextField
                  label="Father's Occupation"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="Enter father's occupation"
                />
              </div>
            </section>

            <section>
              <SectionHeader
                title="Address And Admission"
                icon={<Home size={18} />}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <TextArea
                  label="Permanent Address"
                  name="permanentAddress"
                  value={formData.permanentAddress}
                  onChange={handleChange}
                  placeholder="Enter permanent address"
                />
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label
                      htmlFor="roomNumber"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Room Number
                    </label>
                    <select
                      id="roomNumber"
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="">Select room number</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.room_number}>
                          {room.room_number} (
                          {room.available_beds ?? room.total_beds ?? 0} beds
                          available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <TextField
                    label="Admission Date"
                    name="admissionDate"
                    value={formData.admissionDate}
                    onChange={handleChange}
                    type="date"
                    required
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <UserPlus size={18} />
                  {loading ? "Saving..." : "Add Customer"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

function TextField({ label, error, required = false, ...props }) {
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
        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
        {...props}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function TextArea({ label, ...props }) {
  return (
    <div>
      <label
        htmlFor={props.name}
        className="block text-sm font-semibold text-gray-700 mb-2"
      >
        {label}
      </label>
      <textarea
        id={props.name}
        rows="3"
        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
        {...props}
      />
    </div>
  );
}
