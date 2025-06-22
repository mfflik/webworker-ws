type SortSpec = { id: string; desc: boolean };
type FilterSpec = { id: string; value: string };

const dataStore: { [key: number]: MessageData } = {};
let itemsPerPage = 10;
let currentPage = 1;
let sortBy: SortSpec[] = [];
let filters: FilterSpec[] = [];

const getFilteredSortedPaginatedData = () => {
  let allData = Object.values(dataStore);

  // Apply filters
  for (const filter of filters) {
    allData = allData.filter((item: MessageData) =>
      String(item[filter.id] ?? '')
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
  postMessage({
    data: paginatedData,
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    sortBy,
    filters,
  });
};

// Example createModifiedData as before (keep this)
const convertAngleBearing = (angle: number): number => {
  if (angle < 0) return angle + 360;
  if (angle >= 360) return angle - 360;
  return angle;
};
interface MessageData {
  stn: number;
  bearing: number;
  range: number;
  category: string | number;
  general_type: string | number;
  [key: string]: unknown;
}

/**
 * Modifies the given data by adding `latitude`, `longitude`, and `timestamp` fields
 * using the `calculateVincentyLatLon` function from a separate module.
 *
 * @param {MessageData} messages - The data to be modified
 * @returns {Promise<MessageData & { latitude: number; longitude: number; timestamp: string; }>} The modified data
 * @throws If the import of `calculateVincentyLatLon` fails
 */
const createModifiedData = async (messages: MessageData) => {
  const bearing = convertAngleBearing(messages.bearing);
  const range = messages.range;
  try {
    const { calculateVincentyLatLon } = await import("./calculateVincentyLatLon");
    const coordinateCurrent = calculateVincentyLatLon(
      -6, 107, bearing, range, "m"
    );
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

// WebSocket logic (as before)
let ws: WebSocket;
let reconnectInterval: ReturnType<typeof setInterval>;
let timeoutId: ReturnType<typeof setTimeout> | undefined;

const connectWebSocket = () => {
  ws = new WebSocket("ws://localhost:8085");
  ws.onmessage = async function (event) {
    const messages = JSON.parse(event.data);
    try {
      const processedData = await createModifiedData(messages);
      dataStore[processedData.stn] = processedData;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        postCurrentPage();
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

self.onmessage = (e) => {
  const { type, page, perPage, sortBy: newSort, filters: newFilters } = e.data || {};
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
    case "refresh":
    default:
      postCurrentPage();
  }
};

connectWebSocket();
