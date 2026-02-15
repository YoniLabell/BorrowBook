import { useState, useEffect, useCallback } from "react";
import { apiFetch, setTokens, clearTokens } from "../api/client";

interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url?: string;
  about?: string;
  latitude?: number;
  longitude?: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiFetch<User>("/users/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{
      access_token: string;
      refresh_token: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.access_token, data.refresh_token);
    await fetchMe();
  };

  const register = async (
    email: string,
    password: string,
    display_name: string
  ) => {
    const data = await apiFetch<{
      access_token: string;
      refresh_token: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    });
    setTokens(data.access_token, data.refresh_token);
    await fetchMe();
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return { user, loading, login, register, logout };
}
