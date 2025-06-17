const WebSocket = require('ws');

// Membuat WebSocket server pada port 8085
const wss = new WebSocket.Server({ port: 8085 });

console.log('WebSocket server started on ws://localhost:8085');

// Fungsi untuk mengirim data
const sendData = (ws) => {
  let currentStn = 1;  // Mulai dari 1

  // Fungsi untuk mengirim data satu per satu
  const sendOneByOne = () => {
    const data = {
      bearing: Math.random() * 360,  // Data bearing acak (0-360 derajat)
      range: Math.random() * 1000,   // Data range acak (0-1000 meter)
      stn: currentStn,  // Kirim nilai stn yang berurutan
      category: Math.floor(Math.random() * 10),  // Kategori acak
      generalType: Math.floor(Math.random() * 5)  // Tipe umum acak
    };

    // Kirim data ke klien
    ws.send(JSON.stringify(data));
    // console.log(`Sent stn: ${currentStn}`);

    // Update nilai stn untuk pengiriman berikutnya
    currentStn = currentStn < 1000 ? currentStn + 1 : 1;  // Jika sudah mencapai 10000, mulai lagi dari 1

    // Jika currentStn mencapai 10000, beri jeda 1 detik sebelum mengulang
    if (currentStn === 1) {
      setTimeout(() => {
        sendOneByOne();  // Mulai kirim data lagi setelah 1 detik
      }, 1000);  // Menunggu 1 detik setelah selesai mengirim 1-10000
    } else {
      sendOneByOne()
    }
  };

  sendOneByOne();  // Mulai mengirim data
};

// Ketika ada klien yang terhubung
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Mulai kirim data secara bertahap
  sendData(ws);

  // Menangani koneksi yang terputus
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
