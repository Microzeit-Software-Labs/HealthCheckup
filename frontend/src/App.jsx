import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import DetailPage from './pages/detail/DetailPage';
import { CHECK_REGISTRY } from './config/checks';

export { CHECK_REGISTRY };

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />

        {CHECK_REGISTRY.map(({ name, label, layer }) => (
          <Route
            key={name}
            path={name}
            element={<DetailPage checkName={name} label={label} layer={layer} />}
          />
        ))}

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
