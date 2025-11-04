import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce, throttle } from 'lodash';

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const renderStartTime = useRef(Date.now());
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - renderStartTime.current;

    if (process.env.NODE_ENV === 'development' && renderCount.current > 1) {
      console.log(`🔍 ${componentName} rendered ${renderCount.current} times (${renderTime}ms)`);
    }

    renderStartTime.current = Date.now();
  });

  const getRenderStats = () => ({
    renderCount: renderCount.current,
    lastRenderTime: Date.now() - renderStartTime.current
  });

  return { getRenderStats };
};

// Debounced state hook for search inputs and other频繁 updates
export const useDebouncedState = (initialValue, delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  const debouncedSetValue = useMemo(
    () => debounce((newValue) => {
      setDebouncedValue(newValue);
    }, delay),
    [delay]
  );

  useEffect(() => {
    debouncedSetValue(value);
    return () => debouncedSetValue.cancel();
  }, [value, debouncedSetValue]);

  return [value, setValue, debouncedValue];
};

// Optimized scroll handling
export const useOptimizedScroll = (callback, delay = 16) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const throttledCallback = useMemo(
    () => throttle(() => callbackRef.current(), delay),
    [delay]
  );

  useEffect(() => {
    window.addEventListener('scroll', throttledCallback, { passive: true });
    return () => {
      window.removeEventListener('scroll', throttledCallback);
      throttledCallback.cancel();
    };
  }, [throttledCallback]);
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [entries, setEntries] = useState([]);
  const observer = useRef();

  const observe = useCallback((element) => {
    if (element && observer.current) {
      observer.current.observe(element);
    }
  }, []);

  const unobserve = useCallback((element) => {
    if (element && observer.current) {
      observer.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'undefined') {
      observer.current = new IntersectionObserver((entries) => {
        setEntries(entries);
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      });
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [options]);

  return { entries, observe, unobserve };
};

// Lazy image loading hook
export const useLazyImage = (src, options = {}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { observe, unobserve } = useIntersectionObserver(options);

  const imgRef = useCallback((node) => {
    if (node) {
      observe(node);
    }
  }, [observe]);

  useEffect(() => {
    const visibleEntry = entries.find(entry => entry.isIntersecting);
    if (visibleEntry && !imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
      };
      img.onerror = () => {
        setError(new Error('Failed to load image'));
        setIsLoading(false);
      };
      img.src = src;
    }
  }, [entries, src, imageSrc]);

  return { imgRef, imageSrc, isLoading, error };
};

// Window size optimization
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, []);

  return windowSize;
};

// Memory leak prevention for timers
export const useTimeout = (callback, delay) => {
  const timeoutRef = useRef();

  useEffect(() => {
    timeoutRef.current = setTimeout(callback, delay);
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [callback, delay]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { cancel };
};

// Optimized API request hook with retry logic
export const useOptimizedApi = (apiFunction, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { retries = 3, retryDelay = 1000 } = options;

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await apiFunction(...args);
        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    setError(lastError);
    setLoading(false);
    throw lastError;
  }, [apiFunction, retries, retryDelay]);

  return { data, loading, error, execute };
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length - 1
    );

    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll
  };
};

// Bundle size monitoring
export const useBundleMonitor = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name.includes('bundle') || entry.name.includes('chunk')) {
            console.log(`📦 Bundle loaded: ${entry.name} (${entry.transferSize} bytes)`);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);
};

// Cache invalidation hook
export const useCacheInvalidation = (cacheKey, ttl = 3600000) => { // 1 hour default
  const [isExpired, setIsExpired] = useState(false);
  const cacheTime = useRef(Date.now());

  useEffect(() => {
    const checkCache = () => {
      const now = Date.now();
      if (now - cacheTime.current > ttl) {
        setIsExpired(true);
        cacheTime.current = now;
      }
    };

    const interval = setInterval(checkCache, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [ttl]);

  const refreshCache = useCallback(() => {
    cacheTime.current = Date.now();
    setIsExpired(false);
  }, []);

  return { isExpired, refreshCache };
};