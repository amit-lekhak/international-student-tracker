import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, registerAuthEvents, setInMemoryToken, resetUnauthorizedGate } from '../api/client';
import { UserResponse, LoginRequest, LoginResponse, Agent } from '../types/domain';
import { QUICK_SWITCH_PRESETS, QuickSwitchPreset } from '../lib/constants';
import { useToast } from './ToastContext';

interface AuthContextValue {
  user: UserResponse | null;
  agentProfile: Agent | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  activePreset: QuickSwitchPreset | null;
  login: (credentials: LoginRequest) => Promise<UserResponse>;
  logout: () => Promise<void>;
  switchPreset: (presetId: string) => Promise<void>;
  refreshProfile: () => Promise<UserResponse | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [agentProfile, setAgentProfile] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<QuickSwitchPreset | null>(null);
  const { success, error, warning } = useToast();

  const fetchAgentProfile = useCallback(async (agentId?: string | null): Promise<Agent | null> => {
    if (!agentId) {
      setAgentProfile(null);
      return null;
    }
    try {
      const res = await apiClient.get<Agent>(`/api/agents/${agentId}`);
      setAgentProfile(res.data);
      return res.data;
    } catch {
      setAgentProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserResponse | null> => {
    try {
      const response = await apiClient.get<UserResponse>('/api/auth/me');
      setUser(response.data);
      // Map back to matching preset if available
      const matchingPreset = QUICK_SWITCH_PRESETS.find((p) => p.email === response.data.email);
      if (matchingPreset) {
        setActivePreset(matchingPreset);
      }
      if (response.data.role === 'AGENT' && response.data.agentId) {
        await fetchAgentProfile(response.data.agentId);
      } else {
        setAgentProfile(null);
      }
      return response.data;
    } catch {
      localStorage.removeItem('auth_active');
      setUser(null);
      setActivePreset(null);
      setAgentProfile(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAgentProfile]);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<UserResponse> => {
      setIsLoading(true);
      try {
        const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
        if (response.data.accessToken) {
          setInMemoryToken(response.data.accessToken);
        }
        localStorage.setItem('auth_active', '1');
        setUser(response.data.user);
        const preset = QUICK_SWITCH_PRESETS.find((p) => p.email === credentials.email);
        if (preset) {
          setActivePreset(preset);
        }
        // Fetch the real agent profile so we show correct name/tier
        if (response.data.user.role === 'AGENT' && response.data.user.agentId) {
          await fetchAgentProfile(response.data.user.agentId);
        } else {
          setAgentProfile(null);
        }
        // Reset the 401 gate so session-expiry toasts work for the new session
        resetUnauthorizedGate();
        // Invalidate and refetch all data for the newly authenticated tenant
        await queryClient.invalidateQueries();
        success(`Logged in as ${response.data.user.email} (${response.data.user.role})`);
        return response.data.user;
      } catch (err: any) {
        localStorage.removeItem('auth_active');
        error(err.message || 'Login failed', 'Authentication Error');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchAgentProfile, success, error, queryClient],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('auth_active');
      setInMemoryToken(null);
      setUser(null);
      setAgentProfile(null);
      setActivePreset(null);
      setIsLoading(false);
      // clear() removes all cached data and stops all in-flight retries immediately,
      // preventing the cascade of 401 toasts from concurrent re-fetches after logout.
      queryClient.clear();
      warning('Logged out of session');
    }
  }, [warning, queryClient]);

  const switchPreset = useCallback(
    async (presetId: string) => {
      const preset = QUICK_SWITCH_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setIsLoading(true);
      try {
        await login({
          email: preset.email,
          password: 'password123',
        });
      } catch (err: any) {
        error(`Failed to switch to preset ${preset.label}: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [login, error],
  );

  // Register interceptor callbacks
  useEffect(() => {
    registerAuthEvents({
      onUnauthorized: () => {
        localStorage.removeItem('auth_active');
        setUser(null);
        setActivePreset(null);
        setAgentProfile(null);
        setInMemoryToken(null);
        warning('Session expired. Please switch persona or log in again.', 'Unauthorized');
      },
      onForbidden: (msg: string) => {
        error(msg || 'You do not have permission to perform this action.', 'Access Denied (403)');
      },
    });

    // Rehydrate session only if an active session flag exists; otherwise stay on LoginScreen
    const initializeAuth = async () => {
      const hasAuthSession = localStorage.getItem('auth_active') === '1';
      if (!hasAuthSession) {
        setIsLoading(false);
        return;
      }
      await refreshProfile();
    };

    initializeAuth();
  }, [refreshProfile, warning, error]);

  const value: AuthContextValue = {
    user,
    agentProfile,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isAgent: user?.role === 'AGENT',
    activePreset,
    login,
    logout,
    switchPreset,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
