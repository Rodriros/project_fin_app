import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/categories');
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (name: string, type: 'INCOME' | 'EXPENSE') => {
    const data = await fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
    setCategories(prev => [...prev, data]);
    return data;
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return { categories, loading, error, createCategory, refresh: loadCategories };
}
