import React, { useState, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";

import "./App.css";
type DataItem = {
  stn: string;
  bearing: number;
  range: number;
  latitude: number;
  longitude: number;
  category: string;
  generalType: string;
  timestamp: string;
};

type WorkerPageResult = {
  data: DataItem[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  sortBy: { id: string; desc: boolean }[];
  filters: { id: string; value: string }[];
};

const columns: ColumnDef<DataItem>[] = [
  { accessorKey: "stn", header: "STN" },
  { accessorKey: "bearing", header: "Bearing" },
  { accessorKey: "range", header: "Range" },
  { accessorKey: "latitude", header: "Latitude" },
  { accessorKey: "longitude", header: "Longitude" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "generalType", header: "Type" },
  { accessorKey: "timestamp", header: "Timestamp" },
];

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

const App: React.FC = () => {
  const [pageResult, setPageResult] = useState<WorkerPageResult>({
    data: [],
    currentPage: 1,
    itemsPerPage: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
    sortBy: [],
    filters: [],
  });

  const [gotoPageValue, setGotoPageValue] = useState("");
  const [customPageSize, setCustomPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const workerRef = useRef<Worker | null>(null);

  const table = useReactTable({
    data: pageResult.data,
    columns,
    state: { sorting, columnFilters },
    manualSorting: true,
    manualFiltering: true,
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(nextSorting);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "setSort", sortBy: nextSorting });
      }
    },
    onColumnFiltersChange: (updater) => {
      const nextFilters = typeof updater === "function" ? updater(columnFilters) : updater;
      setColumnFilters(nextFilters);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "setFilter", filters: nextFilters });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    pageCount: pageResult.totalPages,
  });

  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (e) => {
      console.log(e.data);
      setPageResult(e.data as WorkerPageResult);
    };
    worker.onerror = (error) => console.error("Web Worker error:", error);
    worker.postMessage({ type: "refresh" });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const goToNextPage = () => {
    if (workerRef.current && pageResult.currentPage < pageResult.totalPages) {
      workerRef.current.postMessage({ type: "next" });
    }
  };
  const goToPreviousPage = () => {
    if (workerRef.current && pageResult.currentPage > 1) {
      workerRef.current.postMessage({ type: "prev" });
    }
  };
  const handleGotoPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGotoPageValue(e.target.value.replace(/[^0-9]/g, ""));
  };
  const handleGotoPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(gotoPageValue, 10);
    if (workerRef.current && !isNaN(pageNum) && pageNum >= 1 && pageNum <= pageResult.totalPages) {
      workerRef.current.postMessage({ type: "goto", page: pageNum });
    }
    setGotoPageValue("");
  };
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const perPage = parseInt(e.target.value, 10);
    setCustomPageSize(perPage);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "setItemsPerPage", perPage });
    }
  };

  return (
    <div className="w-screen h-screen p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">Web Worker Table</h1>
      <div className="rounded-xl shadow-lg overflow-hidden border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <span>▲</span>,
                        desc: <span>▼</span>,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                    {header.column.getCanFilter() && (
                      <div>
                        <input
                          type="text"
                          placeholder={`Filter...`}
                          value={(header.column.getFilterValue() ?? "") as string}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          className="w-full mt-1 px-1 py-0.5 text-xs border text-white border-gray-300 rounded focus:ring"
                          style={{ minWidth: 0 }}
                        />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-black">
                  No data received yet...
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 border-b text-black border-gray-100 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between mt-6">
        <div className="flex gap-2 items-center">
          <button
            className="rounded px-3 py-1 bg-gray-200  text-white font-semibold disabled:opacity-50 transition"
            onClick={goToPreviousPage}
            disabled={pageResult.currentPage <= 1}
          >
            Previous
          </button>
          <button
            className="rounded px-3 py-1 bg-gray-200  text-white font-semibold disabled:opacity-50 transition"
            onClick={goToNextPage}
            disabled={pageResult.currentPage >= pageResult.totalPages}
          >
            Next
          </button>
        </div>

        <form onSubmit={handleGotoPageSubmit} className="flex items-center gap-2">
          <label className="text-sm  text-white">
            Go to page:
            <input
              type="number"
              min={1}
              max={pageResult.totalPages}
              value={gotoPageValue}
              onChange={handleGotoPageChange}
              className="ml-2 w-16 px-2 py-1 rounded border border-gray-300 focus:ring focus:ring-blue-100 text-sm"
              placeholder="Page"
            />
          </label>
          <button
            type="submit"
            disabled={
              !gotoPageValue ||
              parseInt(gotoPageValue, 10) < 1 ||
              parseInt(gotoPageValue, 10) > pageResult.totalPages
            }
            className="bg-blue-600 text-white rounded px-3 py-1 text-sm font-semibold disabled:bg-blue-200 transition"
          >
            Go
          </button>
        </form>

        <label className="flex items-center text-sm  text-white">
          Items per page:
          <select
            value={customPageSize}
            onChange={handlePageSizeChange}
            className="ml-2 px-2 py-1 rounded border border-gray-300 focus:ring text-gray-500 focus:ring-blue-100"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <span className="text-sm  text-white">
          Page <span className="font-semibold">{pageResult.currentPage}</span> of{" "}
          <span className="font-semibold">{pageResult.totalPages}</span>
          {" | "}
          Total: <span className="font-semibold">{pageResult.totalItems}</span>
        </span>
      </div>
    </div>
  );
};

export default App;
