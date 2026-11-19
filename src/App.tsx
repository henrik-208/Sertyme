import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LockDepositPage } from './pages/LockDepositPage';
import { MyDepositsPage } from './pages/MyDepositsPage';
import { DepositDetailPage } from './pages/DepositDetailPage';
import { LandlordDeskPage } from './pages/LandlordDeskPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lock" element={<LockDepositPage />} />
        <Route path="/deposits" element={<MyDepositsPage />} />
        <Route path="/deposit/:id" element={<DepositDetailPage />} />
        <Route path="/landlord" element={<LandlordDeskPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
