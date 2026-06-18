import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "@/lib/firebase";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import SharedChat from "./pages/SharedChat";
import CuteLoader from "./components/CuteLoader";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, loading] = useAuthState(auth);
  const devMode = sessionStorage.getItem('devMode');
  
  if (loading) return <CuteLoader />;
  if (!user && !devMode) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/chat/:chatId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/share/:sharedId" element={<SharedChat />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
