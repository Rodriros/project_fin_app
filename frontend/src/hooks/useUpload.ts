import { useState } from 'react';
import { API_BASE_URL } from '../services/api';

export function useUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadStatement = async (file: File, bank?: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bank) formData.append('bank', bank);

      const response = await fetch(`${API_BASE_URL}/upload/statement`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const exportCSV = (startDate?: string, endDate?: string) => {
    let url = `${API_BASE_URL}/reports/export/csv`;
    if (startDate || endDate) {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      url += `?${params.toString()}`;
    }
    
    // Create an invisible iframe or anchor to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return { uploadStatement, exportCSV, loading, error };
}
