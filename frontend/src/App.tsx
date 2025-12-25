import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import GachaPage from './pages/GachaPage';
import InventoryPage from './pages/InventoryPage';
import TeamPage from './pages/TeamPage';
import BattlePage from './pages/BattlePage';
import EquipmentPage from './pages/Equipment';
import ItemsPage from './pages/Items';
import DailyRewardsPage from './pages/DailyRewardsPage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const loadUserFromStorage = useAuthStore((state) => state.loadUserFromStorage);
  const verifySession = useAuthStore((state) => state.verifySession);

  // Verify session on app start
  useEffect(() => {
    const initAuth = async () => {
      // First load from localStorage for immediate UI update
      loadUserFromStorage();

      // Then verify session with server
      await verifySession();
    };

    initAuth();
  }, [loadUserFromStorage, verifySession]);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root based on auth status */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/lobby" replace /> : <HomePage />}
        />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gacha"
          element={
            <ProtectedRoute>
              <GachaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <TeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/battle"
          element={
            <ProtectedRoute>
              <BattlePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipment"
          element={
            <ProtectedRoute>
              <EquipmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <ItemsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/daily-rewards"
          element={
            <ProtectedRoute>
              <DailyRewardsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
