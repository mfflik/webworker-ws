import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Membuat instance Web Worker
    const worker = new Worker(new URL('./worker.ts', import.meta.url));

    // Mendengarkan pesan yang dikirimkan oleh worker
    worker.onmessage = (e) => {
      const modifiedData = e.data;
      setData(modifiedData); // Set data yang sudah diproses ke state React
    };

    // Tangani error Web Worker
    worker.onerror = (error) => {
      console.error('Web Worker error:', error);
    };

    // Cleanup worker saat komponen di-unmount
    return () => {
      worker.terminate(); // Menghentikan worker saat komponen unmount
      console.log('Worker terminated');
    };
  }, []);

  return (
    <div>
      <h1>WebSocket Data</h1>
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>No data received yet...</p>
      )}
    </div>
  );
};

export default App;
