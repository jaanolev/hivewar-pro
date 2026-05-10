import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'
import LandingPage from './pages/LandingPage.tsx'
import { AuthProvider } from './lib/auth.tsx'
import AccountMenu from './components/Toolbar/AccountMenu.tsx'

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

function Root() {
  return (
    <StrictMode>
      <AuthProvider>
        <Router />
        <AccountMenu />
      </AuthProvider>
    </StrictMode>
  );
}

// Listen for hash changes
window.addEventListener('hashchange', () => {
  // Force re-render on hash change
  root.render(<Root />);
});

const root = createRoot(document.getElementById('root')!);
root.render(<Root />);
