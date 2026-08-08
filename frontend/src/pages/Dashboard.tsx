import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, MoreHorizontal, Calendar, Download } from 'lucide-react';
import { useI18nStore } from '../i18n';
import { useDashboardData } from '../hooks/useDashboardData';
import { useUpload } from '../hooks/useUpload';
import styles from './Dashboard.module.css';

const COLORS = ['#22c55e', '#b7e452', '#0d2218', '#6b7280', '#3b82f6', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC = () => {
  const { t } = useI18nStore();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const { data, loading, error } = useDashboardData(selectedMonth, selectedYear);
  const { exportCSV } = useUpload();

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-main)' }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--negative-color)' }}>Error loading data: {error}</div>;

  const summary = data?.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, isProfitable: true };
  
  // Transform data for charts
  const barChartData = [
    { name: 'Total', income: summary.totalIncome, expense: summary.totalExpense }
  ];

  const pieChartData = data?.expenseByCategory.map(item => ({
    name: item.name,
    value: item.total
  })) || [];

  const handleExport = () => {
    const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();
    exportCSV(startDate, endDate);
  };

  return (
    <div className={styles.dashboard}>
      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 600 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', cursor: 'pointer' }}>
            <Download size={16} /> Exportar
          </button>
          
          <Calendar size={18} style={{ color: 'var(--text-muted)', marginLeft: '1rem' }} />
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(Number(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Cards */}
      <div className={styles.topCards}>
        <div className={`glass-panel ${styles.card} ${styles.darkCard}`}>
          <div className={styles.cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-lime)' }}></div>
              {t('update_title')}
            </span>
          </div>
          <div className={styles.cardValue} style={{ fontSize: '1rem', marginTop: 'auto' }}>
            {summary.isProfitable ? 'Lucro' : 'Prejuízo'} no período<br/>
            <span style={{ color: summary.isProfitable ? 'var(--accent-lime)' : 'var(--negative-color)' }}>
              R$ {Math.abs(summary.netBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHeader}>
            <span>{t('net_income')}</span>
            <MoreHorizontal size={20} />
          </div>
          <div className={styles.cardValue}>R$ {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className={styles.cardTrend}>
            <span className={styles.positive}><TrendingUp size={14} /> Receitas</span>
          </div>
        </div>

        <div className={`glass-panel ${styles.card}`}>
          <div className={styles.cardHeader}>
            <span>{t('total_expenses')}</span>
            <MoreHorizontal size={20} />
          </div>
          <div className={styles.cardValue}>R$ {summary.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className={styles.cardTrend}>
            <span className={styles.negative}><TrendingDown size={14} /> Despesas</span>
          </div>
        </div>
      </div>

      {/* Charts Area */}
      <div className={styles.chartsArea}>
        <div className={`glass-panel ${styles.chartCard}`}>
          <div className={styles.cardHeader} style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{t('revenue_expenses')}</span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 10, height: 10, backgroundColor: 'var(--sidebar-bg)' }}></div> {t('income_label')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: 10, height: 10, backgroundColor: 'var(--accent-lime)' }}></div> {t('expense_label')}
              </span>
            </div>
          </div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                <Bar dataKey="income" fill="var(--sidebar-bg)" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="expense" fill="var(--accent-lime)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`glass-panel ${styles.chartCard}`}>
           <div className={styles.cardHeader} style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{t('expenses_by_category')}</span>
          </div>
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Sem despesas no período</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
