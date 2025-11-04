import React, { Suspense, lazy } from 'react';
import { useBundleMonitor } from './hooks/usePerformanceOptimized';
import BundleAnalyzer from './components/Performance/BundleAnalyzer';

// Lazy load heavy components
const Desktop = lazy(() => import('./components/system7/Desktop'));
const MenuBar = lazy(() => import('./components/system7/MenuBar'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="w-screen h-screen flex items-center justify-center bg-s7-pattern">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="font-chicago text-black">Loading NASA System 7 Portal...</p>
    </div>
  </div>
);

function App() {
  // Monitor bundle performance
  useBundleMonitor();

  return (
    <div className="w-screen h-screen overflow-hidden bg-s7-pattern" data-testid="desktop-container">
      <Suspense fallback={<LoadingFallback />}>
        <MenuBar />
        <Desktop />
      </Suspense>

      {/* Development bundle analyzer */}
      {process.env.NODE_ENV === 'development' && <BundleAnalyzer />}
    </div>
  );
}

export default App;
