import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../app/layout/DashboardLayout";
import {
  Plus,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  adjustInventoryItemQuantity,
  deleteInventoryItem,
  deleteInventoryItemHistoryEntry,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItemName,
} from "@/services/inventoryItem_service";
import { getDashboardStats } from "@/services/dashboard_service";
import ModuleHeader from "@/components/ui/ModuleHeader";

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

export default function ListInventoryItem() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  // const [totalInventoryItems, setTotalInventoryItems] = useState(0);
  const [inventoryItemsPerPage] = useState(10);
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const requestIdRef = useRef(0);
  const hasPrev = cursorHistory.length > 0;

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  const [adjustForm, setAdjustForm] = useState({
    date: today,
    adjustmentType: "add",
    quantity: "",
    price: "",
    gstPercent: 0,
    reason: "",
    // remark: "",
  });
  const [editName, setEditName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const adjustmentBaseAmount =
    Number(adjustForm.quantity || 0) * Number(adjustForm.price || 0);
  const adjustmentGstAmount =
    adjustmentBaseAmount * Number(adjustForm.gstPercent || 0) / 100;
  const adjustmentTotalAmount = adjustmentBaseAmount + adjustmentGstAmount;

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchTerm.trim();
      if (trimmed.length >= 3) {
        setActiveSearchTerm(trimmed);
        setCursor(null);
        setCursorHistory([]);
      } else if (trimmed.length === 0) {
        setActiveSearchTerm("");
        setCursor(null);
        setCursorHistory([]);
      } else {
        // 1-2 chars: do not trigger API and keep current list
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const activeSearch = activeSearchTerm.length >= 3;
      const params = {
        limit: inventoryItemsPerPage,
        cursor: cursor || undefined,
        search: activeSearch ? activeSearchTerm : undefined,
      };

      const requestId = ++requestIdRef.current;
      const [inventoryItemResponse, statsResponse] = await Promise.all([
        getAllInventoryItems(params),
        // getDashboardStats(),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setInventoryItems(inventoryItemResponse.inventoryItems || []);
      setNextCursor(inventoryItemResponse.next_cursor || null);
      setHasNext(Boolean(inventoryItemResponse.has_next));
      // setTotalInventoryItems(statsResponse?.data?.total_inventoryItems ?? 0);
      setIsInitialLoad(false);
    } catch (err) {
      setError("Failed to load inventoryItems. Please try again later.");
      console.error("Error fetching inventoryItems:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const activeSearch = activeSearchTerm.length >= 3;
    const shouldFetchAll = activeSearchTerm === "";

    if (!activeSearch && !shouldFetchAll) {
      return;
    }
    fetchInventoryItems();
  }, [cursor, activeSearchTerm]);

  const refreshSelectedInventoryItem = async (inventoryItemId) => {
    if (!inventoryItemId) return;
    try {
      const response = await getInventoryItemById(inventoryItemId);
      setSelectedInventoryItem(response.inventoryItem || null);
    } catch {
      setSelectedInventoryItem(null);
    }
  };

  const startIndex = cursorHistory.length * inventoryItemsPerPage;
  const paginatedInventoryItems = inventoryItems;
  // const displayedTotal = totalInventoryItems;

  const closeAllModals = () => {
    setIsViewOpen(false);
    setIsAdjustOpen(false);
    setIsEditOpen(false);
    setSelectedInventoryItem(null);
    setAdjustForm({
      date: today,
      adjustmentType: "add",
      quantity: "",
      price: "",
      gstPercent: 0,
      reason: "",
      // remark: "",
    });
    setEditName("");
  };

  const openViewModal = async (inventoryItemId) => {
    await refreshSelectedInventoryItem(inventoryItemId);
    setIsViewOpen(true);
  };

  const openAdjustModal = (inventoryItem) => {
    setSelectedInventoryItem({
      id: inventoryItem.id,
      name: inventoryItem.name,
    });
    setAdjustForm({
      date: today,
      adjustmentType: "add",
      quantity: "",
      price: "",
      gstPercent: 0,
      reason: "",
      // remark: "",
    });
    setIsAdjustOpen(true);
  };

  const openEditModal = (inventoryItem) => {
    setSelectedInventoryItem({
      id: inventoryItem.id,
      name: inventoryItem.name,
    });
    setEditName(inventoryItem.name || "");
    setIsEditOpen(true);
  };

  const handleAdjustEntry = async (event) => {
    event.preventDefault();
    if (!selectedInventoryItem?.id) return;

    if (!adjustForm.date) {
      toast.error("Date is required.");
      return;
    }
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    if (!adjustForm.price || Number(adjustForm.price) <= 0) {
      toast.error("Price must be greater than 0.");
      return;
    }
    if (Number(adjustForm.gstPercent) < 0) {
      toast.error("GST must be 0 or more.");
      return;
    }
    // if (!adjustForm.reason.trim()) {
    //   toast.error("Reason is required.");
    //   return;
    // }

    try {
      setModalLoading(true);
      await adjustInventoryItemQuantity(selectedInventoryItem.id, {
        date: adjustForm.date,
        adjustmentType: adjustForm.adjustmentType,
        quantity: Number(adjustForm.quantity),
        price: Number(adjustForm.price),
        gstPercent: Number(adjustForm.gstPercent),
        reason: adjustForm.reason.trim(),
        // remark: adjustForm.remark.trim(),
      });
      await fetchInventoryItems();
      await refreshSelectedInventoryItem(selectedInventoryItem.id);
      toast.success("InventoryItem quantity adjusted successfully.");
      setIsAdjustOpen(false);
      setIsViewOpen(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "Insufficient stock to reduce the requested quantity") {
        toast.error(detail);
      } else {
        toast.error("Failed to adjust quantity.");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleRenameInventoryItem = async (event) => {
    event.preventDefault();
    if (!selectedInventoryItem?.id) return;

    try {
      setModalLoading(true);
      await updateInventoryItemName(selectedInventoryItem.id, editName);
      await fetchInventoryItems();
      await refreshSelectedInventoryItem(selectedInventoryItem.id);
      toast.success("InventoryItem name updated successfully.");
      setIsEditOpen(false);
      setIsViewOpen(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "InventoryItem name already exists") {
        toast.error("InventoryItem name already exists.");
      } else if (detail === "InventoryItem name is required") {
        toast.error("InventoryItem name is required.");
      } else {
        toast.error("Failed to update inventoryItem name.");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteHistory = async (entryId) => {
    if (!selectedInventoryItem?.id) return;

    if (!window.confirm("Delete this history entry?")) {
      return;
    }

    try {
      setModalLoading(true);
      await deleteInventoryItemHistoryEntry(selectedInventoryItem.id, entryId);
      await fetchInventoryItems();
      await refreshSelectedInventoryItem(selectedInventoryItem.id);
      toast.success("History entry deleted.");
    } catch {
      toast.error("Failed to delete history entry.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteInventoryItem = async () => {
    if (!selectedInventoryItem?.id) return;

    const isConfirmed = window.confirm(
      `Delete "${selectedInventoryItem.name}"? This action cannot be undone.`,
    );
    if (!isConfirmed) {
      return;
    }

    try {
      setModalLoading(true);
      await deleteInventoryItem(selectedInventoryItem.id);
      await fetchInventoryItems();
      toast.success("InventoryItem deleted successfully.");
      closeAllModals();
    } catch {
      toast.error("Failed to delete inventoryItem.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleNextPage = () => {
    if (hasNext && nextCursor) {
      setCursorHistory((prev) => [...prev, cursor]);
      setCursor(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const previousCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((prev) => prev.slice(0, -1));
      setCursor(previousCursor || null);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <ModuleHeader
          icon={<Package size={22} />}
          title="InventoryItem Management"
          tagline="Manage all inventoryItem inventory records"
          action={
            <button
              onClick={() => navigate("/inventoryItems/add")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm md:text-base font-semibold py-2 md:py-2.5 px-3 md:px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              <Plus size={18} />
              Add InventoryItem
            </button>
          }
        />

        {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <p className="inline-flex items-center gap-2 text-sm text-purple-800 font-bold uppercase tracking-wide">
            <Package size={16} />
            Total InventoryItems - {totalInventoryItems}
          </p>
        </div> */}

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by inventoryItem name..."
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);
              const trimmed = value.trim();

              if (trimmed.length === 0) {
                setCursor(null);
                setCursorHistory([]);
              } else if (trimmed.length >= 3) {
                setCursor(null);
                setCursorHistory([]);
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : !isInitialLoad && paginatedInventoryItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No inventoryItems found</p>
            <p className="text-gray-400 mt-2">
              {searchTerm
                ? "Try adjusting your search"
                : "Add your first inventoryItem to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        S.No
                      </span>
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      InventoryItem Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Last Purchase Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Present Quantity
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventoryItems.map((inventoryItem, index) => (
                    <tr
                      key={inventoryItem.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition duration-150"
                    >
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                        {inventoryItem.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(inventoryItem.lastAddedDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {inventoryItem.presentQuantity ?? 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openViewModal(inventoryItem.id)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition duration-150"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openAdjustModal(inventoryItem)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition duration-150"
                            title="Adjust Quantity"
                          >
                            <SlidersHorizontal size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(inventoryItem)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition duration-150"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {paginatedInventoryItems.map((inventoryItem) => (
                <div
                  key={inventoryItem.id}
                  className="bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-3"
                >
                  <h3 className="font-semibold text-gray-800">{inventoryItem.name}</h3>
                  <p className="text-sm text-gray-600">
                    Last Added Date: {formatDate(inventoryItem.lastAddedDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Present Quantity: {inventoryItem.presentQuantity ?? 0}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(inventoryItem.id)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition duration-150"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openAdjustModal(inventoryItem)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition duration-150"
                      title="Adjust Quantity"
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(inventoryItem)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition duration-150"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
              <div className="text-xs md:text-sm text-gray-600">
                Showing {inventoryItems.length > 0 ? startIndex + 1 : 0} to{" "}
                {startIndex + inventoryItems.length} of inventoryItems
                {/* {displayedTotal} inventoryItems */}
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={!hasPrev}
                  className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>

                <button
                  onClick={handleNextPage}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-gray-300 text-xs md:text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {(isViewOpen || isAdjustOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 bg-gray-100/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {isViewOpen
                  ? "InventoryItem Details"
                  : isAdjustOpen
                    ? "Adjust InventoryItem Quantity"
                    : "Edit InventoryItem Name"}
              </h2>
              <button
                onClick={closeAllModals}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {isViewOpen && selectedInventoryItem && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm text-gray-500">InventoryItem Name</p>
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        {selectedInventoryItem.name}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm text-gray-500">Added On</p>
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        {formatDate(selectedInventoryItem.addedOn)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm text-gray-500">
                        Last Purchase Date
                      </p>
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        {formatDate(selectedInventoryItem.lastAddedDate)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm text-gray-500">Present Quantity</p>
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        {selectedInventoryItem.presentQuantity ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm text-gray-500">Latest Price</p>
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        {formatCurrency(selectedInventoryItem.latestPrice)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4">
                      <p className="text-sm text-gray-500">Total Bill</p>
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        {formatCurrency(selectedInventoryItem.totalBill)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      InventoryItem History
                    </h3>
                    {selectedInventoryItem.history?.length ? (
                      <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Entry Type
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Price
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                GST %
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                GST Amount
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Total
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Reason
                              </th>
                              {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Remark
                              </th> */}
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                Delete
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInventoryItem.history.map((entry) => (
                              <tr
                                key={entry.id}
                                className="border-t border-gray-100"
                              >
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {entry.entryType === "adjustment"
                                    ? `Adjustment (${entry.adjustmentType || "-"})`
                                    : "Stock Entry"}
                                </td>
                                <td
                                  className={`px-4 py-3 text-sm font-semibold ${Number(entry.quantity || 0) < 0 ? "text-red-600" : "text-green-700"}`}
                                >
                                  {entry.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {formatCurrency(entry.price)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {Number(entry.gstPercent || 0)}%
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {formatCurrency(entry.gstAmount || 0)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {formatCurrency(entry.totalBill)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  {entry.reason || "-"}
                                </td>
                                {/* <td className="px-4 py-3 text-sm text-gray-700">
                                  {entry.remark || "-"}
                                </td> */}
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  <button
                                    onClick={() =>
                                      handleDeleteHistory(entry.id)
                                    }
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                                    title="Delete History"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No history found.</p>
                    )}
                  </div>
                </div>
              )}

              {isAdjustOpen && selectedInventoryItem && (
                <form onSubmit={handleAdjustEntry} className="space-y-5">
                  <p className="text-sm text-gray-600">
                    Adjust stock for{" "}
                    <span className="font-semibold">{selectedInventoryItem.name}</span>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={adjustForm.date}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            date: event.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Adjustment Type
                      </label>
                      <select
                        name="adjustmentType"
                        value={adjustForm.adjustmentType}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            adjustmentType: event.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
                      >
                        <option value="add">Add Quantity</option>
                        <option value="reduce">Reduce Quantity</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        name="quantity"
                        value={adjustForm.quantity}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            quantity: event.target.value,
                          }))
                        }
                        placeholder="Enter quantity"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        name="price"
                        value={adjustForm.price}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            price: event.target.value,
                          }))
                        }
                        placeholder="Enter price"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        GST (%)
                      </label>
                      <select
                        name="gstPercent"
                        value={adjustForm.gstPercent}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            gstPercent: Number(event.target.value),
                          }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
                      >
                        {GST_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}%
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Total GST
                      </label>
                      <input
                        type="number"
                        value={adjustmentGstAmount.toFixed(2)}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Total Amount
                      </label>
                      <input
                        type="number"
                        value={adjustmentTotalAmount.toFixed(2)}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Reason
                      </label>
                      <input
                        type="text"
                        name="reason"
                        value={adjustForm.reason}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="Why are you adjusting this stock?"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                    </div>

                    {/* <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remark
                      </label>
                      <textarea
                        name="remark"
                        value={adjustForm.remark}
                        onChange={(event) =>
                          setAdjustForm((prev) => ({
                            ...prev,
                            remark: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Optional note"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                      ></textarea>
                    </div> */}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                    >
                      {modalLoading ? "Saving..." : "Save Adjustment"}
                    </button>
                  </div>
                </form>
              )}

              {isEditOpen && selectedInventoryItem && (
                <form onSubmit={handleRenameInventoryItem} className="space-y-5">
                  <p className="text-sm text-gray-600">
                    Update inventoryItem name for{" "}
                    <span className="font-semibold">{selectedInventoryItem.name}</span>
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      InventoryItem Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder="Enter new inventoryItem name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteInventoryItem}
                      disabled={modalLoading}
                      className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                    >
                      {modalLoading ? "Deleting..." : "Delete InventoryItem"}
                    </button>

                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                    >
                      {modalLoading ? "Saving..." : "Update Name"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
