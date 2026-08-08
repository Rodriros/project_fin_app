import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  description: string;
  status: string;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    type: string;
  };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/transactions');
      setTransactions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (data: Partial<Transaction>) => {
    const newTx = await fetchApi('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Optimistic or real refresh
    await loadTransactions();
    return newTx;
  };

  // Derive unique descriptions for autocomplete
  const uniqueDescriptions = Array.from(new Set(transactions.map(t => t.description))).filter(Boolean);

  useEffect(() => {
    loadTransactions();
  }, []);

  return { 
    transactions, 
    loading, 
    error, 
    createTransaction, 
    refresh: loadTransactions,
    uniqueDescriptions
  };
}
