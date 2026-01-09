import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'

// Simple hash-based routing
function Router() {
  const hash = window.location.hash;
  
  if (hash === '#/admin') {
    return <AdminDashboard />;
  }
  
  return <App />;
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
  // Force re-render on hash change
  root.render(
    <StrictMode>
      <Router />
    </StrictMode>,
  );
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
