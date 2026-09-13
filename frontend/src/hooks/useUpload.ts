import { useState } from 'react';
import { API_BASE_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';

export function useUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const uploadStatement = async (file: File, bank?: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bank) formData.append('bank', bank);

      const response = await fetch(`${API_BASE_URL}/upload/statement`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload falhou com status ${response.status}`);
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao processar upload');
      setLoading(false);
      throw err;
    }
  };

  const previewStatement = async (file: File, bank?: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bank) formData.append('bank', bank);

      const response = await fetch(`${API_BASE_URL}/upload/preview`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (response.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao processar pré-visualização (status ${response.status})`);
      }

      const data = await response.json();
      setLoading(false);
      return data.transactions;
    } catch (err: any) {
      setError(err.message || 'Erro ao pré-visualizar extrato');
      setLoading(false);
      throw err;
    }
  };

  const exportCSV = async (startDate?: string, endDate?: string) => {
    let url = `${API_BASE_URL}/reports/export/csv`;
    if (startDate || endDate) {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao exportar CSV');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `extrato_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Erro ao exportar CSV:', err);
      alert(err.message || 'Erro ao exportar arquivo');
    }
  };

  return { uploadStatement, previewStatement, exportCSV, loading, error };
}
