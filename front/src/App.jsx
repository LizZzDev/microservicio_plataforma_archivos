import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "./pages/auth/AuthPage";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/profile/Profile";
import Users from "./pages/admin/Users";

// 🔥 NUEVA IMPORTACIÓN DEL REPOSITORIO UNIFICADO
import Repository from "./pages/files/Repository";

import { AuthProvider, useAuth } from "./context/AuthContext";

// 🛡️ RUTAS PROTEGIDAS ARREGLADAS (Usando 'user' en vez de 'token')
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { user } = useAuth();

  // Si no hay usuario logueado, patada de regreso al Login
  if (!user) return <Navigate to="/" replace />;
  
  // Si la ruta pide Admin y el usuario es normal, patada al Dashboard
  if (requireAdmin && user?.role?.toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/" element={<AuthPage />} />

          {/* App (Todo esto está dentro del Layout) */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
          
            <Route path="/directories" element={<Repository />} />
            <Route path="/directories/:id" element={<Repository />} />
            
            <Route path="/profile" element={<Profile />} />
            
            {/* Admin */}
            {/* Si alguien escribe solo /admin, lo mandamos a /admin/users automáticamente */}
            <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin={true}><Users /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;