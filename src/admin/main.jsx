import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../lib/auth.jsx';
import AdminApp from './AdminApp.jsx';
import '../styles/app.css';
import './admin.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AdminApp />
    </AuthProvider>
  </StrictMode>
);
