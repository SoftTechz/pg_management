import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, ClipboardList, Home, Save, Users } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../app/layout/DashboardLayout";
import { getCustomerById, updateCustomer } from "@/services/customer_service";
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

export default function UpdateCustomer() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomer() {
      try {
        setLoading(true);
        const customer = await getCustomerById(customerId);
        if (cancelled) return;

        setFormData({
          name: customer.name || "",
          workingDetails: customer.working_details || "",
          workAddress: customer.work_address || "",
          dateOfBirth: customer.date_of_birth || "",
          education: customer.education || "",
          advance:
            customer.advance === null || customer.advance === undefined
              ? ""
              : String(customer.advance),
          monthlyRent:
            customer.monthly_rent === null || customer.monthly_rent === undefined
              ? ""
              : String(customer.monthly_rent),
          mobileNumber: customer.mobile_number || "",
          fatherName: customer.father_name || "",
          fatherOccupation: customer.father_occupation || "",
          permanentAddress:
            typeof customer.permanent_address === "string"
              ? customer.permanent_address
              : customer.permanent_address?.address || "",
          aadhaarNumber: customer.aadhaar_number || "",
          roomNumber: customer.room_number || "",
          admissionDate: customer.admission_date || "",
        });
      } catch (error) {
        console.error("Error loading customer:", error);
        toast.error("Failed to load customer.");
        navigate("/customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustomer();
    return () => {
      cancelled = true;
    };
  }, [customerId, navigate]);

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
      setSaving(true);
      await updateCustomer(customerId, {
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
      });
      toast.success("Customer updated successfully.");
      navigate("/customers");
    } catch (error) {
      console.error("Error updating customer:", error);
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 relative">
          <LoadingOverlay
            show={loading || saving}
            message={saving ? "Updating customer..." : "Loading customer..."}
          />
          <ModuleHeader
            icon={<Users size={22} />}
            title="Edit Customer"
            tagline="Update customer admission and rent details"
            action={
              <button
                type="button"
                onClick={() => navigate("/customers")}
                disabled={saving}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            }
          />

          {!loading && (
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              <div className="border-b border-gray-200 mb-3"></div>

              <section>
                <SectionHeader title="Customer Details" icon={<ClipboardList size={18} />} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <TextField label="Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} required placeholder="Enter customer name" />
                  <TextField label="Mobile Number" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} required maxLength="10" placeholder="Enter mobile number" />
                  <TextField label="Date of Birth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} type="date" />
                  <TextField label="Education" name="education" value={formData.education} onChange={handleChange} placeholder="Enter education" />
                  <TextField label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} error={errors.aadhaarNumber} maxLength="12" placeholder="Enter Aadhaar number" />
                  <TextField label="Advance" name="advance" value={formData.advance} onChange={handleChange} error={errors.advance} type="number" min="0" placeholder="Enter advance amount" />
                  <TextField label="Monthly Rent" name="monthlyRent" value={formData.monthlyRent} onChange={handleChange} error={errors.monthlyRent} type="number" min="0" placeholder="Enter monthly rent" />
                </div>
              </section>

              <section>
                <SectionHeader title="Work And Family" icon={<BriefcaseBusiness size={18} />} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <TextArea label="Working Details" name="workingDetails" value={formData.workingDetails} onChange={handleChange} placeholder="Enter job, business, or study details" />
                  <TextArea label="Work Address" name="workAddress" value={formData.workAddress} onChange={handleChange} placeholder="Enter working address" />
                  <TextField label="Father's Name" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Enter father's name" />
                  <TextField label="Father's Occupation" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} placeholder="Enter father's occupation" />
                </div>
              </section>

              <section>
                <SectionHeader title="Address And Admission" icon={<Home size={18} />} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <TextArea label="Permanent Address" name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} placeholder="Enter permanent address" />
                  <div className="grid grid-cols-1 gap-4 md:gap-6">
                    <TextField label="Room Number" name="roomNumber" value={formData.roomNumber} onChange={handleChange} placeholder="Enter room number" />
                    <TextField label="Admission Date" name="admissionDate" value={formData.admissionDate} onChange={handleChange} type="date" />
                  </div>
                </div>
              </section>

              <div className="flex gap-4 pt-4 md:pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Save size={18} />
                    {saving ? "Updating..." : "Update Customer"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function TextField({ label, error, required = false, ...props }) {
  return (
    <div>
      <label htmlFor={props.name} className="block text-sm font-semibold text-gray-700 mb-2">
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
      <label htmlFor={props.name} className="block text-sm font-semibold text-gray-700 mb-2">
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
