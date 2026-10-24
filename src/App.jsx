import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { QuoteProvider, useQuote } from './context/QuoteContext.jsx';
import Header from './components/common/Header.jsx';
import Toast from './components/common/Toast.jsx';
import AgentQuoteFunnel from './pages/Agent/AgentQuoteFunnel.jsx';
import LanguageSelectionScreen from './pages/Agent/LanguageSelectionScreen.jsx';
import AgentLoginPage from './pages/Agent/AgentLoginPage.jsx';

import LoadingSpinner from './components/common/LoadingSpinner.jsx';

/**
 * Route protection for authenticated Sales Agents
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <LoadingSpinner
        size="lg"
        color="primary"
        fullHeight
        label="Verifying agent session..."
        subtext="Connecting to Memorial Express security services"
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AgentAppLayout() {
  const location = useLocation();
  const { lang, setLanguage, toasts, removeToast, isLoadingHomes, isLoadingDb } = useQuote();
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(() => {
    return Boolean(localStorage.getItem('memorial_lang'));
  });

  const isLoginPage = location.pathname === '/login';

  const handleLanguageToggle = () => {
    const nextLang = lang === 'es' ? 'en' : 'es';
    setLanguage(nextLang);
  };

  const handleLanguageProceed = () => {
    setHasSelectedLanguage(true);
  };

  return (
    <div className="app-shell">
      {/* Top Header shown on internal portal routes */}
      {!isLoginPage && (
        <Header
          lang={lang}
          onLanguageToggle={handleLanguageToggle}
        />
      )}

      {isLoginPage ? (
        <Routes>
          <Route path="/login" element={<AgentLoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <div className="page-container">
          <Routes>
            <Route path="/login" element={<AgentLoginPage />} />

            {/* Default Base Route: Shows Language Selection on first visit, or Quote Funnel once chosen */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  {hasSelectedLanguage ? (
                    <AgentQuoteFunnel />
                  ) : (
                    <div className="main-card">
                      <LanguageSelectionScreen onProceed={handleLanguageProceed} />
                    </div>
                  )}
                </ProtectedRoute>
              }
            />

            {/* Dedicated Language Selection Route */}
            <Route
              path="/language"
              element={
                <ProtectedRoute>
                  <div className="main-card">
                    <LanguageSelectionScreen onProceed={handleLanguageProceed} />
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Dedicated Quote Funnel Route */}
            <Route
              path="/funnel"
              element={
                <ProtectedRoute>
                  <AgentQuoteFunnel />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      )}

      {/* Centralized Toast Notifications Container */}
      <div className="toast-container noprint">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QuoteProvider>
          <AgentAppLayout />
        </QuoteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
