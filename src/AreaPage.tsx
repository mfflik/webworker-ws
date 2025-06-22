import React, { useState, useEffect } from "react";

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

const AreaPage: React.FC<{ worker: Worker }> = ({ worker }) => {
  const [minLat, setMinLat] = useState("-90");
  const [maxLat, setMaxLat] = useState("90");
  const [minLon, setMinLon] = useState("-180");
  const [maxLon, setMaxLon] = useState("180");
  const [areaData, setAreaData] = useState<DataItem[]>([]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.mode === "area" && Array.isArray(e.data.areaData)) {
        setAreaData(e.data.areaData);
      }
    };
    worker.addEventListener("message", handler);
    worker.postMessage({
      type: "getAreaData",
      area: {
        minLat: -90,
        maxLat: 90,
        minLon: 0,
        maxLon: 180,
      },
    });
    return () => worker.removeEventListener("message", handler);
  }, [worker]);

  const applyAreaFilter = () => {
    if (
      minLat !== "" &&
      maxLat !== "" &&
      minLon !== "" &&
      maxLon !== "" &&
      !isNaN(Number(minLat)) &&
      !isNaN(Number(maxLat)) &&
      !isNaN(Number(minLon)) &&
      !isNaN(Number(maxLon))
    ) {
      worker.postMessage({
        type: "getAreaData",
        area: {
          minLat: Number(minLat),
          maxLat: Number(maxLat),
          minLon: Number(minLon),
          maxLon: Number(maxLon),
        },
      });
    }
  };

  const clearAreaFilter = () => {
    setMinLat("");
    setMaxLat("");
    setMinLon("");
    setMaxLon("");
    setAreaData([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h2 className="text-2xl font-bold mb-4">All Data In Bounding Box (JSON)</h2>
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm mb-1">Min Latitude</label>
          <input
            type="number"
            value={minLat}
            onChange={(e) => setMinLat(e.target.value)}
            className="px-2 py-1 border rounded"
            step="any"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Max Latitude</label>
          <input
            type="number"
            value={maxLat}
            onChange={(e) => setMaxLat(e.target.value)}
            className="px-2 py-1 border rounded"
            step="any"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Min Longitude</label>
          <input
            type="number"
            value={minLon}
            onChange={(e) => setMinLon(e.target.value)}
            className="px-2 py-1 border rounded"
            step="any"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Max Longitude</label>
          <input
            type="number"
            value={maxLon}
            onChange={(e) => setMaxLon(e.target.value)}
            className="px-2 py-1 border rounded"
            step="any"
          />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={applyAreaFilter}>
          Apply
        </button>
        <button className="bg-gray-200 text-gray-600 px-4 py-2 rounded" onClick={clearAreaFilter}>
          Clear
        </button>
      </div>
      <div className="mb-3 text-gray-700 text-sm">
        Total: <span className="font-semibold">{areaData.length}</span> record(s)
      </div>
      <pre className="bg-gray-900 text-white text-xs rounded-xl p-4 overflow-auto max-h-[60vh]">
        {areaData.length === 0 ? "No data in area..." : JSON.stringify(areaData, null, 2)}
      </pre>
    </div>
  );
};

export default AreaPage;
