type SortSpec = { id: string; desc: boolean };
type FilterSpec = { id: string; value: string };
console.log("active")
interface MessageData {
  stn: number;
  bearing: number;
  range: number;
  category: string | number;
  general_type: string | number;
  [key: string]: unknown;
}

// Data store utama
const dataStore: { [key: number]: MessageData } = {};
let itemsPerPage = 10;
let currentPage = 1;
let sortBy: SortSpec[] = [];
let filters: FilterSpec[] = [];

/**
 * Filtering + sorting + paginasi utama
 */
const getFilteredSortedPaginatedData = () => {
  let allData = Object.values(dataStore);

  // Apply filters
  for (const filter of filters) {
    allData = allData.filter((item: MessageData) =>
      String(item[filter.id] ?? "")
        .toLowerCase()
        .includes(filter.value.toLowerCase())
    );
  }

  // Apply sorting (multi-column)
  if (sortBy.length > 0) {
    allData.sort((a, b) => {
      for (const s of sortBy) {
        const aVal = a[s.id];
        const bVal = b[s.id];
        const aComp = typeof aVal === "number" ? aVal : String(aVal);
        const bComp = typeof bVal === "number" ? bVal : String(bVal);
        if (aComp < bComp) return s.desc ? 1 : -1;
        if (aComp > bComp) return s.desc ? -1 : 1;
      }
      return 0;
    });
  }

  // Pagination
  const totalItems = allData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = allData.slice(startIndex, startIndex + itemsPerPage);

  return { paginatedData, totalItems, totalPages };
};

const postCurrentPage = () => {
  const { paginatedData, totalItems, totalPages } = getFilteredSortedPaginatedData();
  // console.log("🚀 ~ postCurrentPage ~ totalPages:", totalPages);
  postMessage({
    mode: "main",
    data: paginatedData,
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    sortBy,
    filters,
  });
};

const convertAngleBearing = (angle: number): number => {
  if (angle < 0) return angle + 360;
  if (angle >= 360) return angle - 360;
  return angle;
};

/**
 * Tambah latitude, longitude, timestamp ke data, panggil calculateVincentyLatLon
 */
const createModifiedData = async (messages: MessageData) => {
  const bearing = convertAngleBearing(messages.bearing);
  const range = messages.range;
  try {
    const { calculateVincentyLatLon } = await import("./calculateVincentyLatLon");
    const coordinateCurrent = calculateVincentyLatLon(-6, 107, bearing, range, "m");
    return {
      ...messages,
      stn: messages.stn,
      bearing,
      range,
      latitude: coordinateCurrent[1],
      longitude: coordinateCurrent[0],
      category: messages.category.toString().padStart(2, "0"),
      generalType: messages.general_type.toString().padStart(2, "0"),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to import calculateVincentyLatLon:", error);
    throw error;
  }
};
let areaQuery: { minLat: number; maxLat: number; minLon: number; maxLon: number } | null = null;

const handleGetAreaData = (area: typeof areaQuery) => {
  // console.log("🚀 ~ handleGetAreaData ~ area:", area)
  areaQuery = area; // simpan filter terakhir
  filterAndPostAreaData(); // kirim hasil
};

function filterAndPostAreaData() {
  if (!areaQuery) return;
  const allData = Object.values(dataStore);
  const filtered = allData.filter(
    (item: any) =>
      typeof item.latitude === "number" &&
      typeof item.longitude === "number" &&
      item.latitude >= Math.min(areaQuery.minLat, areaQuery.maxLat) &&
      item.latitude <= Math.max(areaQuery.minLat, areaQuery.maxLat) &&
      item.longitude >= Math.min(areaQuery.minLon, areaQuery.maxLon) &&
      item.longitude <= Math.max(areaQuery.minLon, areaQuery.maxLon)
  );
  // console.log("🚀 ~ filterAndPostAreaData ~ filtered:", filtered)
  postMessage({ mode: "area", areaData: filtered });
}

// --- WebSocket logic (sama seperti sebelumnya) ---
let ws: WebSocket;
let reconnectInterval: ReturnType<typeof setInterval>;
let timeoutId: ReturnType<typeof setTimeout> | undefined;

const connectWebSocket = () => {
  ws = new WebSocket("ws://localhost:8085");
  ws.onmessage = async function (event) {
    const messages = JSON.parse(event.data);
    // console.log("🚀 ~ messages:", messages)
    try {
      const processedData = await createModifiedData(messages);
      dataStore[processedData.stn] = processedData;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        postCurrentPage();
        filterAndPostAreaData();
      }, 10);
    } catch (error) {
      console.error("Error processing data:", error);
    }
  };
  ws.onopen = () => {
    if (reconnectInterval) clearInterval(reconnectInterval);
  };
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
  ws.onclose = () => {
    reconnectWebSocket();
  };
};

const reconnectWebSocket = () => {
  if (reconnectInterval) clearInterval(reconnectInterval);
  reconnectInterval = setInterval(() => {
    connectWebSocket();
  }, 5000);
};

// --- HANDLER utama pesan dari React ---
self.onmessage = (e) => {
  const { type, page, perPage, sortBy: newSort, filters: newFilters, area } = e.data || {};
  switch (type) {
    case "next":
      currentPage++;
      postCurrentPage();
      break;
    case "prev":
      if (currentPage > 1) currentPage--;
      postCurrentPage();
      break;
    case "goto":
      if (typeof page === "number" && page >= 1) {
        currentPage = page;
        postCurrentPage();
      }
      break;
    case "setItemsPerPage":
      if (typeof perPage === "number" && perPage > 0) {
        itemsPerPage = perPage;
        currentPage = 1;
        postCurrentPage();
      }
      break;
    case "setSort":
      sortBy = Array.isArray(newSort) ? newSort : [];
      currentPage = 1;
      postCurrentPage();
      break;
    case "setFilter":
      filters = Array.isArray(newFilters) ? newFilters : [];
      currentPage = 1;
      postCurrentPage();
      break;
    case "getAreaData": // Tambahan utama
      if (
        area &&
        typeof area.minLat === "number" &&
        typeof area.maxLat === "number" &&
        typeof area.minLon === "number" &&
        typeof area.maxLon === "number"
      ) {
        handleGetAreaData(area);
      } else {
        postMessage({ mode: "area", areaData: [] });
      }
      break;
    case "refresh":
    default:
      postCurrentPage();
  }
};

connectWebSocket();
