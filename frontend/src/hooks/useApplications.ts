import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  ApplicationResponse,
  ApplicationFilterParams,
  PaginatedApplicationsResult,
  UpdateApplicationRequest,
  UpdateNotesRequest,
  CreateApplicationRequest,
} from '../types/domain';
import { useToast } from '../context/ToastContext';

export function useApplications(filters: ApplicationFilterParams) {
  // Prune undefined, null, and empty string params
  const cleanParams = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== ''),
  );

  return useQuery<PaginatedApplicationsResult>({
    queryKey: ['applications', cleanParams],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedApplicationsResult>('/api/applications', {
        params: cleanParams,
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30 * 1000,
  });
}

export function useApplication(id?: string) {
  return useQuery<ApplicationResponse>({
    queryKey: ['application', id],
    queryFn: async () => {
      if (!id) throw new Error('Application ID is required');
      const response = await apiClient.get<ApplicationResponse>(`/api/applications/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateApplicationRequest }) => {
      const response = await apiClient.patch<ApplicationResponse>(`/api/applications/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.setQueryData(['application', updatedApp.id], updatedApp);
      success(
        `Application for ${updatedApp.studentName} updated to stage: ${updatedApp.stage}`,
        'Stage Updated',
      );
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update application', 'Update Error');
    },
  });
}

export function useUpdateNotes() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNotesRequest }) => {
      const response = await apiClient.patch<ApplicationResponse>(
        `/api/applications/${id}/notes`,
        data,
      );
      return response.data;
    },
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.setQueryData(['application', updatedApp.id], updatedApp);
      success('Notes recorded and timestamped successfully', 'Notes Saved');
    },
    onError: (err: any) => {
      error(err.message || 'Failed to save notes', 'Notes Error');
    },
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateApplicationRequest) => {
      const response = await apiClient.post<ApplicationResponse>('/api/applications', data);
      return response.data;
    },
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      success(
        `New application created for ${newApp.studentName} in stage ${newApp.stage}`,
        'Application Created',
      );
    },
    onError: (err: any) => {
      error(err.message || 'Failed to create application', 'Creation Error');
    },
  });
}
