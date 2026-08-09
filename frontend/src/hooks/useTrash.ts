import { useState, useCallback } from 'react';
import { fetchApi } from '../services/api';

export interface DeletedTransaction {
  id: string;
  originalId: string;
  amount: number;
  type: string;
  date: string;
  description: string;
  status: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  userId: string;
  deletedByUserId: string;
  deletedByName: string;
  deletedAt: string;
  createdAt: string;
}

export function useTrash() {
  const [trashItems, setTrashItems] = useState<DeletedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/trash');
      setTrashItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreItem = async (id: string) => {
    await fetchApi(`/trash/${id}/restore`, { method: 'POST' });
    await loadTrash();
  };

  const restoreBatch = async (trashIds: string[]) => {
    await fetchApi('/trash/restore-batch', {
      method: 'POST',
      body: JSON.stringify({ trashIds }),
    });
    await loadTrash();
  };

  return {
    trashItems,
    loading,
    error,
    loadTrash,
    restoreItem,
    restoreBatch,
  };
}
