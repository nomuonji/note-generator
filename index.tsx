
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: The error "File '.../App.tsx' is not a module" on this line is resolved by providing a valid module implementation in App.tsx. The import path is correct.
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
