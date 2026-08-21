import api from "@/config/axios";

const DRUG_NAME_QTY_CACHE_PREFIX = "inventoryItem_name_qty_cache_v1";

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

const buildCacheKey = (params = {}) => {
  const sortedEntries = Object.entries(params || {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const serialized = JSON.stringify(Object.fromEntries(sortedEntries));
  return `${DRUG_NAME_QTY_CACHE_PREFIX}:${serialized}`;
};

const readInventoryItemNameQtyCache = (params = {}) => {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(buildCacheKey(params));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.inventoryItems)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeInventoryItemNameQtyCache = (params = {}, data = { inventoryItems: [] }) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(buildCacheKey(params), JSON.stringify(data));
  } catch {
    // Ignore quota/storage errors and continue with API behavior.
  }
};

const clearInventoryItemNameQtyCache = () => {
  if (!isBrowser()) return;

  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(DRUG_NAME_QTY_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore cache clear errors.
  }
};

const refreshInventoryItemNameQtyCache = async () => {
  const defaultParams = { limit: 1000 };
  const res = await api.get("/inventoryItems/name-quantity", { params: defaultParams });
  writeInventoryItemNameQtyCache(defaultParams, res.data);
  return res.data;
};

const refreshInventoryItemNameQtyCacheSafely = async () => {
  try {
    await refreshInventoryItemNameQtyCache();
  } catch {
    // Don't fail mutation APIs if cache refresh fails.
  }
};

// Create inventoryItem
export const createInventoryItem = async (payload) => {
  const res = await api.post("/inventoryItems/", payload);
  await refreshInventoryItemNameQtyCacheSafely();
  return res.data;
};

// Get all inventoryItems with pagination and search
export const getAllInventoryItems = async (params = {}) => {
  const res = await api.get("/inventoryItems/", { params });
  return res.data;
};

// Get all inventoryItems with pagination and search
// export const getAllInventoryItemsNameAndQty = async (params = {}) => {
//   const res = await api.get("/inventoryItems", { params });
//   return res.data;
// };

// Get inventoryItem names and quantities for lightweight selection
export const getInventoryItemNameAndQuantity = async (params = {}) => {
  const cached = readInventoryItemNameQtyCache(params);
  if (cached) {
    return cached;
  }

  const res = await api.get("/inventoryItems/name-quantity", { params });
  writeInventoryItemNameQtyCache(params, res.data);
  return res.data;
};

// Get inventoryItem by ID
export const getInventoryItemById = async (inventoryItemId) => {
  const res = await api.get(`/inventoryItems/${inventoryItemId}`);
  return res.data;
};

// Add stock/history entry to inventoryItem
export const updateInventoryItem = async (inventoryItemId, payload) => {
  const res = await api.post(`/inventoryItems/${inventoryItemId}/entries`, payload);
  await refreshInventoryItemNameQtyCacheSafely();
  return res.data;
};

// Adjust inventoryItem quantity with reason/remark
export const adjustInventoryItemQuantity = async (inventoryItemId, payload) => {
  const requestBody = {
    date: payload.date,
    adjustmentType: payload.adjustmentType,
    quantity: Number(payload.quantity),
    price: Number(payload.price),
    gstPercent: Number(payload.gstPercent ?? 0),
    reason: payload.reason ?? "",
  };
  const res = await api.post(`/inventoryItems/${inventoryItemId}/adjustments`, requestBody);
  await refreshInventoryItemNameQtyCacheSafely();
  return res.data;
};

// Update inventoryItem name
export const updateInventoryItemName = async (inventoryItemId, name) => {
  const res = await api.put(`/inventoryItems/${inventoryItemId}/name`, { name });
  await refreshInventoryItemNameQtyCacheSafely();
  return res.data;
};

// Delete one history entry
export const deleteInventoryItemHistoryEntry = async (inventoryItemId, entryId) => {
  const res = await api.delete(`/inventoryItems/${inventoryItemId}/entries/${entryId}`);
  await refreshInventoryItemNameQtyCacheSafely();
  return res.data;
};

// Delete inventoryItem
export const deleteInventoryItem = async (inventoryItemId) => {
  const res = await api.delete(`/inventoryItems/${inventoryItemId}`);
  await refreshInventoryItemNameQtyCacheSafely();
  return res.data;
};

export const invalidateInventoryItemNameQtyCache = () => {
  clearInventoryItemNameQtyCache();
};

// Save a prescription template
export const createInventoryItemTemplate = async (payload) => {
  const res = await api.post("/inventoryItems/manage/templates", payload);
  return res.data;
};

// Get all prescription templates
export const getAllInventoryItemTemplates = async () => {
  const res = await api.get("/inventoryItems/manage/templates");
  return res.data;
};

// Get one prescription template
export const getInventoryItemTemplateById = async (templateId) => {
  const res = await api.get(`/inventoryItems/manage/templates/${templateId}`);
  return res.data;
};

// Delete a prescription template
export const deleteInventoryItemTemplate = async (templateId) => {
  const res = await api.delete(`/inventoryItems/manage/templates/${templateId}`);
  return res.data;
};
