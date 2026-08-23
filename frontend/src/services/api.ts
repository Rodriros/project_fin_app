import { useAuthStore } from '../store/authStore';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid — logout and redirect
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro no servidor (status ${response.status})`);
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor(offline).');
    }
    throw err;
  }
};

// Fetch without auth (for login/register)
export const fetchPublic = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro no servidor (status ${response.status})`);
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor (Backend offline). Certifique-se de executar "npm run dev" na raiz do projeto.');
    }
    throw err;
  }
};
