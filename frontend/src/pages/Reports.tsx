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

  const renderDRE = (title: string, dreData: any, isConsolidated: boolean = false) => {
    if (!dreData) return null;
    return (
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ padding: '1.25rem', margin: 0, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', fontSize: '1.1rem' }}>
          {title}
        </h3>
        <table className={styles.dreTable}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th className={styles.amount}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.sectionRow}>
              <td className={styles.sectionTitle}>Saldo Anterior</td>
              <td className={`${styles.amount} ${dreData.priorBalance >= 0 ? styles.positive : styles.negative}`}>
                {dreData.priorBalance >= 0 ? '+' : '-'} {Math.abs(dreData.priorBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>

            {/* INCOMES */}
            <tr className={styles.sectionRow}>
              <td className={styles.sectionTitle}>{t('dre_revenues')} do Período</td>
              <td className={`${styles.amount} ${styles.positive}`}>
                + {dreData.periodIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {dreData.incomeByCategory.map((inc: any) => (
              <tr key={inc.categoryId} className={styles.subItem}>
                <td>{inc.name}</td>
                <td className={styles.amount}>{inc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}

            {/* EXPENSES */}
            <tr className={styles.sectionRow}>
              <td className={styles.sectionTitle}>{t('dre_expenses')} do Período</td>
              <td className={`${styles.amount} ${styles.negative}`}>
                - {dreData.periodExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            {dreData.expenseByCategory.map((exp: any) => (
              <tr key={exp.categoryId} className={styles.subItem}>
                <td>{exp.name}</td>
                <td className={styles.amount}>- {exp.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}

            {/* RESULTADO DO PERÍODO */}
            <tr className={styles.subItem} style={{ fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <td>Resultado do Período</td>
              <td className={`${styles.amount} ${dreData.periodIncome - dreData.periodExpense >= 0 ? styles.positive : styles.negative}`}>
                {dreData.periodIncome - dreData.periodExpense >= 0 ? '+' : '-'} {Math.abs(dreData.periodIncome - dreData.periodExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>

            {/* NET RESULT / FINAL BALANCE */}
            <tr className={styles.totalRow}>
              <td>{isConsolidated ? 'Saldo Final Consolidado' : 'Saldo Final da Conta'}</td>
              <td className={`${styles.amount} ${dreData.finalBalance >= 0 ? styles.positive : styles.negative}`}>
                {dreData.finalBalance >= 0 ? '+' : '-'} {Math.abs(dreData.finalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

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
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>Carregando...</span>}
          {error && <span style={{ color: 'var(--negative-color)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>Erro ao carregar dados</span>}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        {data?.accounts?.map((acc: any) => (
          <React.Fragment key={acc.accountId}>
            {renderDRE(`Relatório: ${acc.accountName}`, acc)}
          </React.Fragment>
        ))}

        {data?.consolidated && renderDRE('Relatório Consolidado (Todas as Contas)', data.consolidated, true)}
      </div>
    </div>
  );
};

export default Reports;
