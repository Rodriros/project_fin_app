import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../services/api';

export interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  description: string;
  status: string;
  accountId: string;
  categoryId: string | null;
  createdAt: string;
  account?: {
    id: string;
    name: string;
    type: string;
  };
  category?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface TransactionFilters {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  importStartDate?: string;
  importEndDate?: string;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({});

  const loadTransactions = useCallback(async (filterOverride?: TransactionFilters) => {
    try {
      setLoading(true);
      const activeFilters = filterOverride || filters;
      const params = new URLSearchParams();
      
      if (activeFilters.accountId) params.append('accountId', activeFilters.accountId);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
      if (activeFilters.importStartDate) params.append('importStartDate', activeFilters.importStartDate);
      if (activeFilters.importEndDate) params.append('importEndDate', activeFilters.importEndDate);
      
      const queryString = params.toString();
      const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;
      
      const data = await fetchApi(endpoint);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const applyFilters = useCallback(async (newFilters: TransactionFilters) => {
    setFilters(newFilters);
    await loadTransactions(newFilters);
  }, [loadTransactions]);

  const createTransaction = async (data: Partial<Transaction>) => {
    const newTx = await fetchApi('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Optimistic or real refresh
    await loadTransactions();
    return newTx;
  };

  const batchCreateTransactions = async (transactionsData: Partial<Transaction>[]) => {
    const result = await fetchApi('/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions: transactionsData }),
    });
    await loadTransactions();
    return result;
  };

  const deleteBatch = async (transactionIds: string[]) => {
    const result = await fetchApi('/transactions/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ transactionIds }),
    });
    await loadTransactions();
    return result;
  };

  const suggestCategory = async (description: string) => {
    if (!description) return null;
    const res = await fetchApi(`/transactions/suggest-category?description=${encodeURIComponent(description)}`);
    return res.categoryId;
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
    filters,
    applyFilters,
    createTransaction, 
    batchCreateTransactions,
    deleteBatch,
    suggestCategory,
    refresh: loadTransactions,
    uniqueDescriptions
  };
}
