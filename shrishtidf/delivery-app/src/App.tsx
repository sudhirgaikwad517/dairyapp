import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen';
import DashboardScreen from './pages/DashboardScreen';
import DeliveryDetailScreen from './pages/DeliveryDetailScreen';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('delivery_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        } />

        <Route path="/delivery/:id" element={
          <ProtectedRoute>
            <DeliveryDetailScreen />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
