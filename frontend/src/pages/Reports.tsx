import React, { useState } from 'react';
import { useI18nStore } from '../i18n';
import { useDashboardData } from '../hooks/useDashboardData';
import styles from './Reports.module.css';

const Reports: React.FC = () => {
  const { t } = useI18nStore();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
  
  // Month mode state
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // Custom mode state
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Derived effective dates
  const effectiveStartDate = filterMode === 'month' 
    ? new Date(selectedYear, selectedMonth - 1, 1).toISOString()
    : customStartDate ? new Date(`${customStartDate}T00:00:00`).toISOString() : undefined;
    
  const effectiveEndDate = filterMode === 'month'
    ? new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString()
    : customEndDate ? new Date(`${customEndDate}T23:59:59`).toISOString() : undefined;

  const { data, loading, error } = useDashboardData(effectiveStartDate, effectiveEndDate);

  if (loading) return <div style={{ padding: '2rem' }}>Loading DRE...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Error: {error}</div>;

  const summary = data?.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, isProfitable: true };
  const incomes = data?.incomeByCategory || [];
  const expenses = data?.expenseByCategory || [];

  return (
    <div className={styles.reportsPage}>
      <div className={styles.filters}>
        <h2>{t('dre_title')}</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filterMode}
            onChange={e => setFilterMode(e.target.value as 'month' | 'custom')}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
          >
            <option value="month">Mensal</option>
            <option value="custom">Personalizado</option>
          </select>

          {filterMode === 'month' ? (
            <>
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
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>até</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '0.45rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel">
        <table className={styles.dreTable}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th className={styles.amount}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {/* INCOMES */}
            <tr className={styles.sectionRow}>
              <td className={styles.sectionTitle}>{t('dre_revenues')}</td>
              <td className={`${styles.amount} ${styles.positive}`}>
                {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {incomes.map(inc => (
              <tr key={inc.categoryId} className={styles.subItem}>
                <td>{inc.name}</td>
                <td className={styles.amount}>{inc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}

            {/* EXPENSES */}
            <tr className={styles.sectionRow}>
              <td className={styles.sectionTitle}>{t('dre_expenses')}</td>
              <td className={`${styles.amount} ${styles.negative}`}>
                - {summary.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {expenses.map(exp => (
              <tr key={exp.categoryId} className={styles.subItem}>
                <td>{exp.name}</td>
                <td className={styles.amount}>- {exp.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}

            {/* NET RESULT */}
            <tr className={styles.totalRow}>
              <td>{t('dre_net_result')}</td>
              <td className={`${styles.amount} ${summary.isProfitable ? styles.positive : styles.negative}`}>
                {summary.isProfitable ? '+' : '-'} {Math.abs(summary.netBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
