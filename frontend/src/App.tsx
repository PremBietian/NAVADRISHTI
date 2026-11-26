import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationProvider } from './components/NotificationContext';
import { AppLayout } from './layouts/AppLayout';
import { UploadEvidenceModal } from './components/UploadEvidenceModal';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { EvidenceConflictsPage } from './pages/EvidenceConflictsPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { AiInvestigationPage } from './pages/AiInvestigationPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/overview" element={<DashboardPage />} />
          <Route path="/evidence" element={<EvidenceConflictsPage />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />
          <Route path="/investigation" element={<AiInvestigationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppLayout onOpenUpload={() => setUploadModalOpen(true)}>
          <AnimatedRoutes />
        </AppLayout>
        <UploadEvidenceModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
        />
      </NotificationProvider>
    </BrowserRouter>
  );
}
