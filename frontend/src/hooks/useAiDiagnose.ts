import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { AiDiagnosticRequest, AiDiagnosticResponse } from '../types/domain';
import { useToast } from '../context/ToastContext';

export interface AiHistoryItem {
  id: string;
  timestamp: Date;
  question: string;
  response?: AiDiagnosticResponse;
  error?: string;
  isLoading?: boolean;
}

export function useAiDiagnose() {
  const [history, setHistory] = useState<AiHistoryItem[]>([]);
  const { error } = useToast();

  const mutation = useMutation({
    mutationFn: async (payload: AiDiagnosticRequest): Promise<AiDiagnosticResponse> => {
      const response = await apiClient.post<AiDiagnosticResponse>('/api/ai/diagnose', payload);
      return response.data;
    },
  });

  const ask = async (question: string) => {
    const queryTrimmed = question.trim();
    if (!queryTrimmed) return;

    const itemId = Math.random().toString(36).substring(2, 9);
    const newEntry: AiHistoryItem = {
      id: itemId,
      timestamp: new Date(),
      question: queryTrimmed,
      isLoading: true,
    };

    setHistory((prev) => [...prev, newEntry]);

    try {
      const res = await mutation.mutateAsync({ question: queryTrimmed });
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, response: res, isLoading: false } : item,
        ),
      );
      return res;
    } catch (err: any) {
      const errorMessage =
        err.message || 'Diagnostic query failed. Please verify GEMINI_API_KEY in backend/.env.';
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, error: errorMessage, isLoading: false } : item,
        ),
      );
      error(errorMessage, 'AI Diagnostic Error');
      throw err;
    }
  };

  const clearHistory = () => setHistory([]);

  return {
    ask,
    history,
    clearHistory,
    isLoading: mutation.isPending,
  };
}
