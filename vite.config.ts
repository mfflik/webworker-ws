import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],  // Menambahkan ekstensi file .js dan .jsx
  },
  build: {
    target: 'esnext',  // Menggunakan target ESNext agar mendukung fitur terbaru dari JS dan TS
  },
});
