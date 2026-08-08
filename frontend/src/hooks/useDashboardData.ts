import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  isProfitable: boolean;
}

interface CategoryTotal {
  categoryId: string;
  name: string;
  total: number;
}

interface DashboardData {
  summary: DashboardSummary;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

export function useDashboardData(month?: number, year?: number) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      let query = '';
      if (month !== undefined && year !== undefined) {
        // month is 0-indexed if using JS dates, but let's assume 1-12 from UI
        // Construct start and end dates
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
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
  }, [month, year]);

  return { data, loading, error, refresh: loadData };
}
