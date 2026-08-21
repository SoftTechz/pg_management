import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../app/layout/DashboardLayout";
import {
  ArrowLeft,
  ClipboardList,
  Package,
  Save,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { deleteInventoryItem, getInventoryItemById, updateInventoryItem } from "@/services/inventoryItem_service";
import ModuleHeader from "@/components/ui/ModuleHeader";
import SectionHeader from "@/components/ui/SectionHeader";

const GST_OPTIONS = [0, 5, 12, 18, 28];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function UpdateInventoryItem() {
  const { inventoryItemId } = useParams();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryItem, setInventoryItem] = useState(null);
  const [formData, setFormData] = useState({
    date: today,
    quantity: "",
    price: "",
    gstPercent: "0",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (inventoryItemId) {
      fetchInventoryItem();
    }
  }, [inventoryItemId]);

  const fetchInventoryItem = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInventoryItemById(inventoryItemId);
      const fetchedInventoryItem = response.inventoryItem || null;
      setInventoryItem(fetchedInventoryItem);
      const latestEntry = fetchedInventoryItem?.history?.[0] || null;
      setFormData((prev) => ({
        ...prev,
        gstPercent: String(latestEntry?.gstPercent ?? 0),
      }));
    } catch (err) {
      setError("Failed to load inventoryItem details.");
      console.error("Error fetching inventoryItem:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalEntries = useMemo(() => inventoryItem?.history?.length || 0, [inventoryItem]);
  const subTotal = useMemo(
    () => Number(formData.quantity || 0) * Number(formData.price || 0),
    [formData.quantity, formData.price],
  );
  const gstAmount = useMemo(
    () => (subTotal * Number(formData.gstPercent || 0)) / 100,
    [subTotal, formData.gstPercent],
  );
  const totalAmount = useMemo(() => subTotal + gstAmount, [subTotal, gstAmount]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = "Date is required.";
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than 0.";
    }

    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = "Price must be greater than 0.";
    }
    if (Number(formData.gstPercent) < 0) {
      newErrors.gstPercent = "GST must be a valid percentage.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await updateInventoryItem(inventoryItemId, {
        date: formData.date,
        quantity: Number(formData.quantity),
        price: Number(formData.price),
        gstPercent: Number(formData.gstPercent || 0),
      });

      toast.success("InventoryItem updated successfully");
      navigate("/inventoryItems");
    } catch (err) {
      setError("Failed to update inventoryItem.");
      toast.error("Failed to update inventoryItem.");
      console.error("Error updating inventoryItem:", err);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this inventoryItem? This action cannot be undone.",
      )
    ) {
      try {
        setSaving(true);
        await deleteInventoryItem(inventoryItemId);
        toast.success("InventoryItem deleted successfully");
        navigate("/inventoryItems");
      } catch {
        setError("Failed to delete inventoryItem.");
        toast.error("Failed to delete inventoryItem.");
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!inventoryItem) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-gray-600">InventoryItem not found.</p>
          <button
            type="button"
            onClick={() => navigate("/inventoryItems")}
            className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeft size={16} />
            Back to InventoryItems
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <ModuleHeader
            icon={<Package size={22} />}
            title="Update InventoryItem"
            tagline="Manage stock entries and history"
            action={
              <button
                type="button"
                onClick={() => navigate("/inventoryItems")}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            }
          />

          <div className="border-b border-gray-200 mb-6"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">InventoryItem Name</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {inventoryItem.name}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Last Added Date</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {formatDate(inventoryItem.lastAddedDate)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Present Quantity</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {inventoryItem.presentQuantity}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Added On</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {formatDate(inventoryItem.addedOn)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Latest Price</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {formatCurrency(inventoryItem.latestPrice)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Bill</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {formatCurrency(inventoryItem.totalBill)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <SectionHeader title="Add New Stock Entry" icon={<ClipboardList size={18} />} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Entry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  {errors.date && (
                    <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.quantity}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Price (Per Unit) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500 mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="gstPercent"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    GST (%)
                  </label>
                  <select
                    id="gstPercent"
                    name="gstPercent"
                    value={formData.gstPercent}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
                  >
                    {GST_OPTIONS.map((option) => (
                      <option key={option} value={String(option)}>
                        {option}%
                      </option>
                    ))}
                  </select>
                  {errors.gstPercent && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.gstPercent}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    GST Amount
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 font-semibold">
                    {formatCurrency(gstAmount)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Total Amount
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 font-semibold">
                    {formatCurrency(totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
              >
                <Save size={20} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg justify-center"
              >
                <Trash2 size={20} />
                Delete InventoryItem
              </button>
            </div>
          </form>

          <div className="mt-10">
            <SectionHeader title={`InventoryItem History (${totalEntries})`} />
            {inventoryItem.history?.length ? (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Total Bill
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItem.history.map((entry) => (
                      <tr key={entry.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {entry.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatCurrency(entry.price)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {formatCurrency(entry.totalBill)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No history found for this inventoryItem.
              </p>
            )}
          </div>

          {saving && (
            <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                <p className="text-gray-700 font-semibold text-lg">
                  Updating inventoryItem...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
