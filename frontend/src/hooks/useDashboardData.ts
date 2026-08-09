import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  isProfitable: boolean;
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  total: number;
}

export interface AccountDRE {
  accountId: string;
  accountName: string;
  initialBalance: number;
  priorBalance: number;
  periodIncome: number;
  periodExpense: number;
  finalBalance: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

export interface ConsolidatedDRE {
  priorBalance: number;
  periodIncome: number;
  periodExpense: number;
  finalBalance: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  netBalance: number;
  isProfitable: boolean;
}

export interface DashboardData {
  summary: DashboardSummary;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  accounts?: AccountDRE[];
  consolidated?: ConsolidatedDRE;
}

export function useDashboardData(startDate?: string, endDate?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      let query = '';
      if (startDate && endDate) {
        query = `?startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetchApi(`/reports/dre${query}`);
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  return { data, loading, error, refresh: loadData };
}
