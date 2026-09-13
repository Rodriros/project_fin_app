import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../services/api';

export interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  date: string;
  description: string;
  status: string;
  accountId: string;
  destinationAccountId?: string | null;
  createdAt: string;
  isInvoicePayment?: boolean;
  account?: {
    id: string;
    name: string;
    type: string;
  };
  destinationAccount?: {
    id: string;
    name: string;
    type: string;
  } | null;
  categoryId?: string | null;
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const filtersRef = useRef(filters);
  const pageRef = useRef(page);

  useEffect(() => {
    filtersRef.current = filters;
    pageRef.current = page;
  }, [filters, page]);

  const loadTransactions = useCallback(async (filterOverride?: TransactionFilters, pageOverride?: number) => {
    try {
      setLoading(true);
      const activeFilters = filterOverride || filtersRef.current;
      const currentPage = pageOverride || pageRef.current;
      const params = new URLSearchParams();
      
      if (activeFilters.accountId) params.append('accountId', activeFilters.accountId);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
      if (activeFilters.importStartDate) params.append('importStartDate', activeFilters.importStartDate);
      if (activeFilters.importEndDate) params.append('importEndDate', activeFilters.importEndDate);
      params.append('page', currentPage.toString());
      params.append('limit', '25'); // Hardcoded 25 items per page for now
      
      const queryString = params.toString();
      const endpoint = `/transactions${queryString ? `?${queryString}` : ''}`;
      
      const data = await fetchApi(endpoint);
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setPage(currentPage);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(async (newFilters: TransactionFilters) => {
    setFilters(newFilters);
    await loadTransactions(newFilters, 1); // Reset to page 1 on filter change
  }, [loadTransactions]);

  const changePage = useCallback(async (newPage: number) => {
    await loadTransactions(filtersRef.current, newPage);
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

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    const updatedTx = await fetchApi(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    await loadTransactions();
    return updatedTx;
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
  }, [loadTransactions]);

  return { 
    transactions, 
    loading, 
    error, 
    filters,
    page,
    totalPages,
    total,
    applyFilters,
    changePage,
    createTransaction, 
    updateTransaction,
    batchCreateTransactions,
    deleteBatch,
    suggestCategory,
    refresh: () => loadTransactions(filters, page),
    uniqueDescriptions
  };
}
