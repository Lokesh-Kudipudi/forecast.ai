import { Routes, Route } from 'react-router-dom';
import { ROUTES } from './router/routes';
import { Navbar } from './components/layout/Navbar';
import OverviewPage from './pages/OverviewPage';
import ForecastsPage from './pages/ForecastsPage';
import ModelsPage from './pages/ModelsPage';
import RunsPage from './pages/RunsPage';
import PipelinesPage from './pages/PipelinesPage';
import MonitoringPage from './pages/MonitoringPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Navbar />
      <Routes>
        <Route path={ROUTES.overview} element={<OverviewPage />} />
        <Route path={ROUTES.forecasts} element={<ForecastsPage />} />
        <Route path={ROUTES.models} element={<ModelsPage />} />
        <Route path={ROUTES.runs} element={<RunsPage />} />
        <Route path={ROUTES.pipelines} element={<PipelinesPage />} />
        <Route path={ROUTES.monitoring} element={<MonitoringPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
