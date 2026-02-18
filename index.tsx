import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';
import { initCapacitorOneSignal } from './src/lib/pushNotifications'; // Import init function

// Initialize OneSignal immediately before rendering
initCapacitorOneSignal();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);