import React, { useRef, useEffect, useState } from "react";
import MainTable from "./MainTable";
import AreaPage from "./AreaPage";
import "./App.css";

const App: React.FC = () => {
  const [mode, setMode] = useState<"main" | "area">("main");
  const workerRef = useRef<Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  // Inisialisasi worker hanya sekali
  useEffect(() => {
    if (!workerRef.current) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url));
      workerRef.current = worker;
      setWorkerReady(true);
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-gray-900">
      <div className="flex gap-2 p-4">
        <button
          onClick={() => setMode("main")}
          className={`px-3 py-2 rounded ${
            mode === "main" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          Main Table
        </button>
        <button
          onClick={() => setMode("area")}
          className={`px-3 py-2 rounded ${
            mode === "area" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          Area Table
        </button>
      </div>
      {/* Render table hanya jika worker sudah siap */}
      {workerReady && mode === "main" && <MainTable worker={workerRef.current} />}
      {workerReady && mode === "area" && <AreaPage worker={workerRef.current} />}
    </div>
  );
};

export default App;
