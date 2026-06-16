import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import AccountMenu from './components/Toolbar/AccountMenu.tsx'

// Behind hash routes — never hit by organic /-landers, so they ship in
// their own chunks instead of bloating the default-route bundle.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.tsx'));

// Simple hash-based routing
function Router() {
  const hash = window.location.hash;

  if (hash === '#/admin') {
    return (
      <Suspense fallback={null}>
        <AdminDashboard />
      </Suspense>
    );
  }

  if (hash === '#/landing' || hash === '#/home') {
    return (
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    );
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
