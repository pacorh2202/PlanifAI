import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('[App] 🚀 Initializing PlanifAI...');
window.onerror = function (msg, url, line, col, error) {
  console.error('[Fatal Error]:', msg, 'at', url, ':', line, ':', col, error);
  return false;
};

import './src/styles/tailwind.css';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';


import { GlobalErrorBoundary } from './src/components/GlobalErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);