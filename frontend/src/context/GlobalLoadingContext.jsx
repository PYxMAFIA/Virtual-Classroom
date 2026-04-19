import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 240;
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

const GlobalLoadingContext = createContext({
  isGlobalLoading: false,
  startGlobalLoading: () => {},
  stopGlobalLoading: () => {},
});

export const GlobalLoadingProvider = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const visibleSinceRef = useRef(0);

  const startGlobalLoading = useCallback(() => {
    setPendingCount((current) => current + 1);
  }, []);

  const stopGlobalLoading = useCallback(() => {
    setPendingCount((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    if (pendingCount > 0) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!isVisible && !showTimerRef.current) {
        showTimerRef.current = setTimeout(() => {
          setIsVisible(true);
          visibleSinceRef.current = Date.now();
          showTimerRef.current = null;
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (!isVisible || hideTimerRef.current) return;

    const elapsed = Date.now() - visibleSinceRef.current;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      hideTimerRef.current = null;
    }, remaining);
  }, [pendingCount, isVisible]);

  useEffect(() => {
    const requestInterceptorId = axios.interceptors.request.use(
      (config) => {
        if (!config?.timeout) {
          config.timeout = DEFAULT_REQUEST_TIMEOUT_MS;
        }
        if (!config?.skipGlobalLoader) {
          startGlobalLoading();
          config.__globalLoaderTracked = true;
        }
        return config;
      },
      (error) => {
        if (error?.config?.__globalLoaderTracked) {
          stopGlobalLoading();
        }
        return Promise.reject(error);
      }
    );

    const responseInterceptorId = axios.interceptors.response.use(
      (response) => {
        if (response?.config?.__globalLoaderTracked) {
          stopGlobalLoading();
        }
        return response;
      },
      (error) => {
        if (error?.config?.__globalLoaderTracked) {
          stopGlobalLoading();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptorId);
      axios.interceptors.response.eject(responseInterceptorId);
    };
  }, [startGlobalLoading, stopGlobalLoading]);

  useEffect(() => () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const value = useMemo(
    () => ({
      isGlobalLoading: isVisible,
      startGlobalLoading,
      stopGlobalLoading,
    }),
    [isVisible, startGlobalLoading, stopGlobalLoading]
  );

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = () => useContext(GlobalLoadingContext);
