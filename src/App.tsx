import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "@/lib/firebase";
import Login from "./pages/Login";
import Chat from "./pages/Chat";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, loading] = useAuthState(auth);
  const devMode = sessionStorage.getItem('devMode');
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black/95 text-purple-400">
      <div className="animate-pulse">Loading Saheli AI...</div>
    </div>
  );
  if (!user && !devMode) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
