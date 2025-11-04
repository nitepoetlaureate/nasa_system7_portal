import React, { useState, useEffect } from 'react';
import { useBundleMonitor } from '../../hooks/usePerformanceOptimized';

const BundleAnalyzer = () => {
  const [bundleInfo, setBundleInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useBundleMonitor();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Monitor bundle loading in development
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const bundleEntries = entries.filter(entry =>
          entry.name.includes('bundle') ||
          entry.name.includes('chunk') ||
          entry.name.includes('.js')
        );

        if (bundleEntries.length > 0) {
          const totalSize = bundleEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
          const bundles = bundleEntries.map(entry => ({
            name: entry.name.split('/').pop(),
            size: entry.transferSize || 0,
            loadTime: entry.duration,
            cached: entry.transferSize === 0
          }));

          setBundleInfo({
            totalSize,
            bundles,
            lastUpdated: Date.now()
          });
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms) => {
    return ms.toFixed(2) + 'ms';
  };

  // Keyboard shortcut to toggle visibility (Ctrl+Shift+B)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return (
      <div className="fixed bottom-4 right-4 text-xs text-gray-500 opacity-50">
        Press Ctrl+Shift+B for bundle info
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-xl max-w-md z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">📦 Bundle Analysis</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {bundleInfo ? (
        <div className="space-y-2">
          <div className="border-b border-gray-600 pb-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Size:</span>
              <span className="font-mono text-green-400">
                {formatBytes(bundleInfo.totalSize)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Bundles:</span>
              <span>{bundleInfo.bundles.length}</span>
            </div>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {bundleInfo.bundles.map((bundle, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className={bundle.cached ? 'text-blue-400' : 'text-green-400'}>
                    {bundle.cached ? '🗂️' : '📄'}
                  </span>
                  <span className="font-mono truncate max-w-[200px]">
                    {bundle.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">
                    {formatBytes(bundle.size)}
                  </span>
                  <span className="text-yellow-400">
                    {formatTime(bundle.loadTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Performance recommendations */}
          <div className="border-t border-gray-600 pt-2 mt-2">
            <h4 className="text-xs font-bold mb-1 text-yellow-400">Recommendations:</h4>
            <ul className="text-xs space-y-1">
              {bundleInfo.totalSize > 1024 * 1024 && (
                <li className="text-orange-400">
                  ⚠️ Bundle size > 1MB - consider code splitting
                </li>
              )}
              {bundleInfo.bundles.length > 5 && (
                <li className="text-blue-400">
                  💡 Consider bundle consolidation
                </li>
              )}
              {bundleInfo.bundles.some(b => b.loadTime > 500) && (
                <li className="text-red-400">
                  🐌 Some bundles loading slowly
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-4">
          Loading bundle information...
        </div>
      )}
    </div>
  );
};

export default BundleAnalyzer;