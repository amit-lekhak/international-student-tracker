import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { School, Program, Agent } from '../types/domain';

export function useSchools() {
  return useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const response = await apiClient.get<School[]>('/api/schools');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  });
}

export function usePrograms(schoolId?: string) {
  return useQuery({
    queryKey: ['programs', { schoolId }],
    queryFn: async () => {
      const params = schoolId ? { schoolId } : undefined;
      const response = await apiClient.get<Program[]>('/api/programs', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await apiClient.get<Agent[]>('/api/agents');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
