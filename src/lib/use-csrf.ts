"use client";

import { useEffect, useState } from "react";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";

/**
 * useCSRF — client hook that ensures a CSRF token is available.
 * - Reads the pipmlk_csrf cookie on mount
 * - If missing, fetches /api/csrf to obtain one (and sets the cookie)
 * - Exposes getCSRFHeader() for use in fetch calls
 */
export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
  };

  const fetchToken = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/csrf", { method: "GET", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.csrfToken) {
          setToken(data.csrfToken);
          return data.csrfToken;
        }
      }
    } catch {
      // silent fallback — token will be null
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    const existing = getCookie(CSRF_COOKIE_NAME);
    if (existing) {
      setToken(existing);
    } else {
      void fetchToken();
    }
  }, []);

  const getCSRFHeader = (): Record<string, string> => {
    if (!token) return {};
    return { [CSRF_HEADER_NAME]: token };
  };

  const ensureToken = async (): Promise<string | null> => {
    if (token) return token;
    return await fetchToken();
  };

  return {
    token,
    loading,
    getCSRFHeader,
    ensureToken,
    refresh: fetchToken,
  };
}
