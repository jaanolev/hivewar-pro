import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'
import LandingPage from './pages/LandingPage.tsx'

// Simple hash-based routing
function Router() {
  const hash = window.location.hash;
  
  if (hash === '#/admin') {
    return <AdminDashboard />;
  }
  
  if (hash === '#/landing' || hash === '#/home') {
    return <LandingPage />;
  }
  
  // Default: show the app (for existing users)
  // New users can go to #/landing to see info first
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
