import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Workspace from './pages/Workspace.jsx';
import AdminPage from './pages/AdminPage.jsx';

function Protected({ children }) {
  const { signedIn } = useAuth();
  const loc = useLocation();
  if (!signedIn) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export default function App() {
  const { signedIn } = useAuth();
  const routes = (
    <Routes>
      <Route path="/login" element={signedIn ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminPage />
          </Protected>
        }
      />
      <Route
        path="/*"
        element={
          <Protected>
            <Workspace />
          </Protected>
        }
      />
    </Routes>
  );
  // One socket for the whole signed-in session, so moving between pages
  // doesn't disconnect (and flap the user's presence).
  return signedIn ? <SocketProvider>{routes}</SocketProvider> : routes;
}
