import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../app/layout/DashboardLayout";
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import ModuleHeader from "@/components/ui/ModuleHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { changePin } from "@/services/auth_service";
import toast from "react-hot-toast";

// ✅ Move OUTSIDE to prevent re-render focus issue
const InputField = ({
  label,
  field,
  placeholder,
  showToggle,
  formData,
  showPasswords,
  errors,
  handleInputChange,
  togglePasswordVisibility,
  maxLength = 4,
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}</label>

    <div className="relative">
      <input
        type={showPasswords[field] ? "text" : "password"}
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode="numeric"
        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg font-mono tracking-wider ${
          errors[field]
            ? "border-red-300 focus:border-red-500"
            : "border-gray-300 focus:border-purple-500"
        }`}
      />

      {showToggle && (
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPasswords[field] ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>

    {errors[field] && (
      <p className="text-sm text-red-600 flex items-center gap-1">
        <AlertCircle size={14} />
        {errors[field]}
      </p>
    )}
  </div>
);

export default function UserManagement() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    currentPin: false,
    newPin: false,
    confirmPin: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ✅ simple input handler (no restriction)
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // clear error while typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // ✅ validate ONLY on submit
  const validateForm = () => {
    const newErrors = {};

    const isValidPin = (pin) => /^\d{4}$/.test(pin);

    if (!isValidPin(formData.currentPin)) {
      newErrors.currentPin = "Must be exactly 4 digits";
    }

    if (!isValidPin(formData.newPin)) {
      newErrors.newPin = "Must be exactly 4 digits";
    }

    if (!isValidPin(formData.confirmPin)) {
      newErrors.confirmPin = "Must be exactly 4 digits";
    }

    if (
      formData.newPin &&
      formData.confirmPin &&
      formData.newPin !== formData.confirmPin
    ) {
      newErrors.confirmPin = "PINs do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await changePin(formData.currentPin, formData.newPin);
      toast.success("PIN changed successfully!");

      setFormData({
        currentPin: "",
        newPin: "",
        confirmPin: "",
      });
      // ✅ Redirect to login
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (error) {
      toast.error(error.message || "Failed to change PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-lg shadow-lg p-2 sm:p-4 md:p-5 relative min-w-0 text-xs sm:text-sm">
        <LoadingOverlay show={loading} message="Updating PIN..." />
        <ModuleHeader
          icon={<Shield size={22} />}
          title="User Management"
          tagline="Manage your account security settings"
        />

        <div className="max-w-6xl mx-auto mt-5 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 items-center">
            {/* Left Image */}
            <div className="flex justify-right lg:justify-center">
              <img
                src="/user_management.png"
                alt="User Management"
                className="w-full max-w-xs sm:max-w-sm mx-auto rounded-xl"
              />
            </div>

            {/* Form */}
            <div className="flex justify-center lg:justify-start">
              <div className="bg-white rounded-lg p-3 sm:p-6 border border-gray-200 shadow-md w-full max-w-md">
                <div className="text-center mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                    <Key size={24} className="text-purple-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                    Change Login PIN
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Enter your current PIN and set a new 4-digit PIN
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label="Current PIN"
                    field="currentPin"
                    placeholder="Enter current PIN"
                    showToggle={true}
                    formData={formData}
                    showPasswords={showPasswords}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    togglePasswordVisibility={togglePasswordVisibility}
                    maxLength={4}
                  />

                  <InputField
                    label="New PIN"
                    field="newPin"
                    placeholder="Enter new PIN"
                    showToggle={true}
                    formData={formData}
                    showPasswords={showPasswords}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    togglePasswordVisibility={togglePasswordVisibility}
                    maxLength={4}
                  />

                  <InputField
                    label="Confirm PIN"
                    field="confirmPin"
                    placeholder="Confirm new PIN"
                    showToggle={true}
                    formData={formData}
                    showPasswords={showPasswords}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    togglePasswordVisibility={togglePasswordVisibility}
                    maxLength={4}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      "Changing..."
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Change PIN
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
