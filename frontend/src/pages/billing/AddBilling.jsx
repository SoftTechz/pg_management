import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../app/layout/DashboardLayout";
import { ArrowLeft, FileText, Plus, Trash2, Users } from "lucide-react";
import ServiceItemInput from "@/components/ui/ServiceItemInput";
import { createPayments } from "@/services/payments_service";
import { getInventoryItemNameAndQuantity } from "@/services/inventoryItem_service";
import toast from "react-hot-toast";
import ModuleHeader from "@/components/ui/ModuleHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

export default function AddPayments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    room_name: "",
    phone_number: "",
    pet_name: "",
    address: "",
    date: new Date().toISOString().split("T")[0],
    items: [
      {
        service_or_item: "",
        quantity: "",
        rate: "",
        amount: 0,
      },
    ],
  });
  const [errors, setErrors] = useState({});
  const [inventoryItems, setInventoryItems] = useState([]);

  const calculateItemAmount = (quantity, rate) => {
    const q = Number(quantity) || 0;
    const r = Number(rate) || 0;
    return Number((q * r).toFixed(2));
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getInventoryItemNameAndQuantity({ limit: 1000 });
        setInventoryItems(res.inventoryItems || []);
      } catch (err) {
        console.error("Error loading inventoryItem list:", err);
        toast.error("Unable to load inventoryItem list for item suggestions.");
      }
    };

    fetchProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [field]: field === "service_or_item" ? value : Number(value),
      };
      items[index].amount = calculateItemAmount(
        items[index].quantity,
        items[index].rate,
      );
      return { ...prev, items };
    });
  };

  const handleAddRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          service_or_item: "",
          quantity: "",
          rate: "",
          amount: 0,
        },
      ],
    }));
  };

  const handleRemoveRow = (index) => {
    setFormData((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: items.length
          ? items
          : [{ service_or_item: "", quantity: "", rate: "", amount: 0 }],
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.room_name.trim()) {
      newErrors.room_name = "Room name is required.";
    }

    if (!formData.date.trim()) {
      newErrors.date = "Date is required.";
    }

    const invalidItem = formData.items.find(
      (item) => !item.service_or_item.trim(),
    );
    if (invalidItem) {
      newErrors.items = "All item rows must have service or item name.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        room_name: formData.room_name.trim(),
        phone_number: formData.phone_number.trim(),
        pet_name: formData.pet_name.trim(),
        address: formData.address.trim(),
        date: formData.date,
        items: formData.items.map((item) => ({
          service_or_item: item.service_or_item.trim(),
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: calculateItemAmount(item.quantity, item.rate),
        })),
        total_amount: calculateTotalAmount(),
      };

      await createPayments(payload);
      toast.success("Payments record added successfully 🎉");
      navigate("/payments");
    } catch (err) {
      console.error("Error creating payments record:", err);
      toast.error("Failed to add payments record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 relative">
          <LoadingOverlay show={loading} message="Creating payments record..." />
          <ModuleHeader
            icon={<FileText size={22} />}
            title="Add New Payments"
            tagline="Create a new payments entry"
            action={
              <button
                type="button"
                onClick={() => navigate("/payments")}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            }
          />

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="border-b border-gray-200 mb-3"></div>

            <div>
              <SectionHeader title="Payments Info" icon={<Users size={18} />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Room Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="room_name"
                    value={formData.room_name}
                    onChange={handleChange}
                    placeholder="Enter room name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    required
                  />
                  {errors.room_name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.room_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    placeholder="Enter phone number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tenant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pet_name"
                    value={formData.pet_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter tenant name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter address"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    required
                  />
                  {errors.date && (
                    <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <SectionHeader
                title="Payments Items"
                icon={<FileText size={18} />}
              />
              {errors.items && (
                <p className="text-red-500 text-sm mb-2">{errors.items}</p>
              )}
              <div className="overflow-x-auto overflow-y-visible relative">
                <table className="w-full min-h-40 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        Service / Item
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        Quantity
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        Rate
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {formData.items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-t border-gray-200 overflow-visible"
                      >
                        <td className="p-2">
                          <ServiceItemInput
                            value={item.service_or_item}
                            onChange={(value) =>
                              handleItemChange(index, "service_or_item", value)
                            }
                            inventoryItems={inventoryItems}
                            placeholder="Service or item"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            // type="number"
                            // min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            // type="number"
                            // min="0"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(index, "rate", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            // min="0"
                            value={item.amount.toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="inline-flex items-center justify-center text-white bg-red-500 hover:bg-red-600 rounded-lg w-9 h-9"
                            title="Remove row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <Plus size={16} />
                  Add Row
                </button>
                <div className="text-right text-lg font-semibold">
                  Total: ₹{calculateTotalAmount().toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/payments")}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
                disabled={loading}
              >
                Save Payments
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
