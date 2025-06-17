// Fungsi untuk mengonversi nilai bearing/sudut ke dalam rentang 0-360 derajat
const convertAngleBearing = (angle: number): number => {
  if (angle < 0) {
    return angle + 360;  // Menangani sudut negatif
  }
  if (angle >= 360) {
    return angle - 360;  // Menangani sudut lebih dari 360
  }
  return angle;  // Mengembalikan nilai angle dalam rentang 0-360
};

// Fungsi untuk memproses data dan menghitung koordinat (misalnya, dengan metode Vincenty)
const createModifiedData = (messages: any) => {
  const bearing = convertAngleBearing(messages.bearing); // Gunakan convertAngleBearing di sini
  let range = messages.range;

  // Fungsi placeholder untuk menghitung koordinat (Anda bisa menggantinya dengan fungsi nyata)
  const calculateVincentyLatLon = (lat1: number, lon1: number, bearing: number, range: number, unit: string) => {
    return [lon1 + 0.1, lat1 + 0.1]; // Placeholder perhitungan
  };

  const coordinateCurrent = calculateVincentyLatLon(
    0, // Lat awal (misalnya)
    0, // Long awal (misalnya)
    bearing,
    range,
    "m"
  );

  return {
    ...messages,
    stn: messages.stn,  // `stn` adalah ID unik yang digunakan untuk mengelompokkan data
    bearing,
    range,
    latitude: coordinateCurrent[1],
    longitude: coordinateCurrent[0],
    category: messages.category.toString().padStart(2, "0"),
    generalType: messages.generalType.toString().padStart(2, "0"),
    timestamp: new Date().toISOString() // Menambahkan timestamp saat data diproses
  };
};

// Objek untuk menyimpan data berdasarkan stn
let dataStore: { [key: number]: any } = {};

// Inisialisasi WebSocket dengan URL yang sesuai
let ws: WebSocket;
let reconnectInterval: any;  // Variable to store the reconnect interval ID

// Fungsi untuk membuat koneksi WebSocket
const connectWebSocket = () => {
  ws = new WebSocket('ws://localhost:8085');  // Ganti dengan WebSocket server lokal

  ws.onmessage = function (event) {
    const messages = JSON.parse(event.data);

    // Proses data
    const processedData = createModifiedData(messages);

    // Menyimpan atau memperbarui data berdasarkan stn
    dataStore[processedData.stn] = processedData;  // Menimpa data yang sudah ada berdasarkan stn

    // Kirimkan data yang sudah dikelompokkan ke thread utama
    postMessage(dataStore);  // Kirimkan seluruh dataStore yang sudah dikelompokkan
  };

  ws.onopen = () => {
    console.log('WebSocket connection established');
    // Clear any existing reconnect interval if the connection is successful
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket connection closed');
    // Start reconnecting when the connection is closed
    reconnectWebSocket();
  };
};

// Fungsi untuk mencoba menghubungkan ulang WebSocket
const reconnectWebSocket = () => {
  console.log('Attempting to reconnect WebSocket...');
  // Clear previous reconnect interval if exists
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
  }

  // Coba untuk reconnect setiap 5 detik
  reconnectInterval = setInterval(() => {
    console.log('Reconnecting WebSocket...');
    connectWebSocket();
  }, 5000); // Coba reconnect setiap 5 detik
};

// Mulai koneksi WebSocket pertama kali
connectWebSocket();
