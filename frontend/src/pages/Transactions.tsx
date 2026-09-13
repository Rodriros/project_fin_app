import React, { useState, useEffect } from 'react';
import { Plus, Upload, X, Download, Save, Trash2, Filter, CheckSquare, Edit3, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { useI18nStore } from '../i18n';
import { useTransactions, type Transaction, type TransactionFilters } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useUpload } from '../hooks/useUpload';
import { fetchApi } from '../services/api';
import styles from './Transactions.module.css';

function isInvoicePaymentDesc(desc: string): boolean {
  if (!desc) return false;
  const norm = desc
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  const paymentKeywords = [
    'pagamento on line',
    'pagamento online',
    'pagamento fatura',
    'pagamento de fatura',
    'pagamento da fatura',
    'pgto fatura',
    'pagto fatura',
    'pgto de fatura',
    'pagto de fatura',
    'pagamento recebido',
    'credito de pagamento',
    'crédito de pagamento',
    'pagamento efetuado',
    'liquidacao de fatura',
    'liquidacao fatura',
    'pagto debito',
    'pgto debito',
    'pagto eletron',
    'pagamento ficha compensacao',
    'pagamento cartao',
    'pagamento de cartao',
    'pgto cartao',
    'pagamento antecipado',
    'pagamento de boleto - fatura',
    'debito automatico fatura',
    'pgto titulo internet',
    'pagto titulo'
  ];

  for (const kw of paymentKeywords) {
    if (norm.includes(kw)) return true;
  }

  const hasPagto = norm.includes('pagamento') || norm.includes('pgto') || norm.includes('pagto');
  const hasTarget = norm.includes('fatura') || norm.includes('on line') || norm.includes('online');
  return hasPagto && hasTarget;
}

const Transactions: React.FC = () => {
  const { t } = useI18nStore();
  const { transactions, loading, createTransaction, updateTransaction, batchCreateTransactions, deleteBatch, suggestCategory, uniqueDescriptions, refresh, applyFilters, page, totalPages, changePage } = useTransactions();
  const { categories, createCategory, refresh: refreshCategories } = useCategories();
  const { previewStatement, exportCSV, loading: uploadLoading } = useUpload();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  
  useEffect(() => {
    fetchApi('/accounts').then(setAccounts).catch(console.error);
    fetchApi('/user/me').then(setCurrentUser).catch(console.error);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterImportStartDate, setFilterImportStartDate] = useState('');
  const [filterImportEndDate, setFilterImportEndDate] = useState('');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create Manual Tx State
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    categoryId: '',
    accountId: '',
    destinationAccountId: '',
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME' | 'TRANSFER',
    date: new Date().toISOString().split('T')[0],
  });
  
  // Heuristic for manual entry
  useEffect(() => {
    const fetchSuggestion = async () => {
      if (formData.description.length > 2) {
        const catId = await suggestCategory(formData.description);
        if (catId) {
          const suggestedCat = categories.find(c => c.id === catId);
          if (suggestedCat) {
            setFormData(prev => ({ ...prev, categoryId: catId, type: suggestedCat.type }));
          } else {
            setFormData(prev => ({ ...prev, categoryId: catId }));
          }
        }
      }
    };
    const timer = setTimeout(fetchSuggestion, 500); // debounce
    return () => clearTimeout(timer);
  }, [formData.description, categories, suggestCategory]);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');

  // Upload/Preview State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBank, setUploadBank] = useState('');
  const [previewData, setPreviewData] = useState<Partial<Transaction>[] | null>(null);
  
  // Preview - batch apply state
  const [globalCategoryId, setGlobalCategoryId] = useState('');
  const [globalAccountId, setGlobalAccountId] = useState('');
  
  // Preview - inline category creation state
  const [previewCreatingCategory, setPreviewCreatingCategory] = useState(false);
  const [previewNewCategoryName, setPreviewNewCategoryName] = useState('');
  const [previewNewCategoryType, setPreviewNewCategoryType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');

  const handleApplyFilters = async () => {
    const newFilters: TransactionFilters = {};
    if (filterAccountId) newFilters.accountId = filterAccountId;
    if (filterStartDate) newFilters.startDate = filterStartDate;
    if (filterEndDate) newFilters.endDate = filterEndDate;
    if (filterImportStartDate) newFilters.importStartDate = filterImportStartDate;
    if (filterImportEndDate) newFilters.importEndDate = filterImportEndDate;
    await applyFilters(newFilters);
    setSelectedIds(new Set());
  };

  const handleClearFilters = async () => {
    setFilterAccountId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterImportStartDate('');
    setFilterImportEndDate('');
    await applyFilters({});
    setSelectedIds(new Set());
  };

  const hasActiveFilters = filterAccountId || filterStartDate || filterEndDate || filterImportStartDate || filterImportEndDate;

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(tx => tx.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      await deleteBatch(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsDeleteConfirmOpen(false);
    } catch (err) {
      alert("Erro ao excluir: " + err);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) return;
    
    // Fallback to type from form if category not found, or user is editing and keeping it.
    let typeToSave = formData.type;
    if (formData.categoryId) {
      const cat = categories.find(c => c.id === formData.categoryId);
      if (cat) typeToSave = cat.type;
    }

    if (typeToSave === 'TRANSFER') {
      if (!formData.destinationAccountId) {
        alert(t('destination_account_required'));
        return;
      }
      if (formData.destinationAccountId === formData.accountId) {
        alert(t('different_accounts_required'));
        return;
      }
    }

    try {
      if (editingTransactionId) {
        await updateTransaction(editingTransactionId, {
          description: formData.description,
          amount: Number(formData.amount),
          categoryId: formData.categoryId || null,
          accountId: formData.accountId || undefined,
          destinationAccountId: typeToSave === 'TRANSFER' ? formData.destinationAccountId : null,
          type: typeToSave,
          date: new Date(formData.date).toISOString(),
          status: 'COMPLETED'
        });
      } else {
        if (!formData.categoryId) return; // Category required for new
        await createTransaction({
          description: formData.description,
          amount: Number(formData.amount),
          categoryId: formData.categoryId,
          accountId: formData.accountId || undefined,
          destinationAccountId: typeToSave === 'TRANSFER' ? formData.destinationAccountId : undefined,
          type: typeToSave,
          date: new Date(formData.date).toISOString(),
          status: 'COMPLETED'
        });
      }
      setIsModalOpen(false);
      setEditingTransactionId(null);
      setFormData({ 
        description: '', 
        amount: '', 
        categoryId: '', 
        accountId: '', 
        destinationAccountId: '',
        type: 'EXPENSE', 
        date: new Date().toISOString().split('T')[0] 
      });
    } catch (err: any) {
      alert("Error saving transaction: " + err.message);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTransactionId(tx.id);
    setFormData({
      description: tx.description,
      amount: tx.amount.toString(),
      categoryId: tx.categoryId || '',
      accountId: tx.accountId,
      destinationAccountId: tx.destinationAccountId || '',
      type: tx.type,
      date: new Date(tx.date).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const cat = await createCategory(newCategoryName.trim(), newCategoryType);
      setFormData(prev => ({ ...prev, categoryId: cat.id }));
      setIsCreatingCategory(false);
      setNewCategoryName('');
    } catch (err: any) {
      alert("Erro ao criar categoria: " + (err.message || err));
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    try {
      const data = await previewStatement(uploadFile, uploadBank || undefined);
      setPreviewData(data);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      refreshCategories();
      // Reset global selectors
      setGlobalCategoryId('');
      setGlobalAccountId('');
    } catch (err) {
      alert("Error parsing file: " + err);
    }
  };

  const handlePreviewRowChange = (index: number, field: keyof Transaction, value: any) => {
    setPreviewData(prev => {
      if (!prev) return prev;
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Apply global category to all preview rows
  const handleApplyGlobalCategory = (catId: string) => {
    setGlobalCategoryId(catId);
    if (!catId || !previewData) return;
    setPreviewData(prev => {
      if (!prev) return prev;
      return prev.map(row => ({ ...row, categoryId: catId }));
    });
  };

  // Apply global account to all preview rows
  const handleApplyGlobalAccount = (accId: string) => {
    setGlobalAccountId(accId);
    if (!accId || !previewData) return;
    setPreviewData(prev => {
      if (!prev) return prev;
      return prev.map(row => ({ ...row, accountId: accId }));
    });
  };

  // Create category inline in preview
  const handlePreviewCreateCategory = async () => {
    if (!previewNewCategoryName) return;
    await createCategory(previewNewCategoryName, previewNewCategoryType);
    setPreviewCreatingCategory(false);
    setPreviewNewCategoryName('');
  };

  // Get filtered categories based on transaction type
  const getCategoriesForType = (type?: string) => {
    if (type === 'EXPENSE') return categories.filter(c => c.type === 'EXPENSE');
    if (type === 'INCOME') return categories.filter(c => c.type === 'INCOME');
    if (type === 'TRANSFER') return categories.filter(c => c.type === 'TRANSFER');
    return categories;
  };

  // Excluir uma linha específica da pré-visualização de importação
  const handleDeletePreviewRow = (index: number) => {
    setPreviewData(prev => (prev ? prev.filter((_, i) => i !== index) : null));
  };

  // Excluir todas as linhas identificadas como pagamento de fatura
  const handleDeleteAllInvoicePayments = () => {
    setPreviewData(prev => {
      if (!prev) return null;
      return prev.filter(row => !row.isInvoicePayment && !isInvoicePaymentDesc(row.description || ''));
    });
  };

  // Converter todas as linhas de pagamento de fatura em Transferência
  const handleConvertAllInvoicePaymentsToTransfer = () => {
    const invoiceCat = categories.find(c => c.type === 'TRANSFER' && c.name.toLowerCase().includes('fatura')) 
      || categories.find(c => c.type === 'TRANSFER');

    setPreviewData(prev => {
      if (!prev) return null;
      return prev.map(row => {
        if (row.isInvoicePayment || isInvoicePaymentDesc(row.description || '')) {
          return {
            ...row,
            type: 'TRANSFER',
            categoryId: invoiceCat ? invoiceCat.id : row.categoryId,
          };
        }
        return row;
      });
    });
  };

  const handleSaveBatch = async () => {
    if (!previewData) return;
    
    // Check if any transfer is missing destination account
    const invalidTransfers = previewData.filter(r => r.type === 'TRANSFER' && (!r.destinationAccountId || r.destinationAccountId === r.accountId));
    if (invalidTransfers.length > 0) {
      alert("Existem transferências na lista sem conta de destino definida ou com origem igual ao destino. Por favor selecione a conta de destino antes de salvar.");
      return;
    }

    try {
      await batchCreateTransactions(previewData);
      setPreviewData(null);
      refresh();
    } catch (err) {
      alert("Error saving batch: " + err);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-main)' }}>Carregando transações...</div>;

  return (
    <div className={styles.transactionsPage}>
      <div className={styles.header}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{t('recent_transactions')}</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <button 
              className={styles.dangerButton} 
              onClick={() => setIsDeleteConfirmOpen(true)}
              id="btn-delete-selected"
            >
              <Trash2 size={16} /> {t('delete_selected')} ({selectedIds.size})
            </button>
          )}
          <button 
            className={`${styles.secondaryButton} ${showFilters ? styles.activeFilter : ''}`} 
            onClick={() => setShowFilters(!showFilters)}
            id="btn-toggle-filters"
          >
            <Filter size={16} /> {t('filters')}
          </button>
          <button className={styles.secondaryButton} onClick={() => exportCSV()} id="btn-export-csv">
            <Download size={18} /> {t('export_btn')}
          </button>
          <button className={styles.secondaryButton} onClick={() => setIsUploadModalOpen(true)} id="btn-import-statement">
            <Upload size={18} /> {t('import_statement')}
          </button>
          <button className={styles.primaryButton} onClick={() => {
            setFormData(prev => ({ ...prev, accountId: accounts[0]?.id || '' }));
            setIsModalOpen(true);
          }} id="btn-add-transaction">
            <Plus size={18} /> {t('add_new')}
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      {showFilters && (
        <div className={`glass-panel ${styles.filterBar}`}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Conta</label>
              <select 
                className={styles.filterInput}
                value={filterAccountId}
                onChange={e => setFilterAccountId(e.target.value)}
                id="filter-account"
              >
                <option value="">{t('all_accounts')}</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Data Transação (De)</label>
              <input 
                type="date" 
                className={styles.filterInput}
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                id="filter-start-date"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Data Transação (Até)</label>
              <input 
                type="date" 
                className={styles.filterInput}
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                id="filter-end-date"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Data Importação (De)</label>
              <input 
                type="date" 
                className={styles.filterInput}
                value={filterImportStartDate}
                onChange={e => setFilterImportStartDate(e.target.value)}
                id="filter-import-start-date"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Data Importação (Até)</label>
              <input 
                type="date" 
                className={styles.filterInput}
                value={filterImportEndDate}
                onChange={e => setFilterImportEndDate(e.target.value)}
                id="filter-import-end-date"
              />
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.primaryButton} onClick={handleApplyFilters} id="btn-apply-filters">
              {t('apply_filters')}
            </button>
            {hasActiveFilters && (
              <button className={styles.secondaryButton} onClick={handleClearFilters} id="btn-clear-filters">
                {t('clear_filters')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={transactions.length > 0 && selectedIds.size === transactions.length}
                  onChange={toggleSelectAll}
                  className={styles.checkbox}
                  id="checkbox-select-all"
                  title="Selecionar todas"
                />
              </th>
              <th>{t('col_description')}</th>
              <th>{t('col_category')}</th>
              <th>{t('col_account')}</th>
              <th>{t('col_date')}</th>
              <th>{t('col_status')}</th>
              <th style={{ textAlign: 'right' }}>{t('col_amount')}</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('no_transactions_found')}</td></tr>
            ) : transactions.map((tx) => (
              <tr key={tx.id} className={selectedIds.has(tx.id) ? styles.selectedRow : ''}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelectOne(tx.id)}
                    className={styles.checkbox}
                  />
                </td>
                <td style={{ fontWeight: 500 }}>
                  {tx.description}
                  {tx.type === 'TRANSFER' && (
                    <div style={{ marginTop: '2px' }}>
                      <span className={styles.transferBadge}>
                        <ArrowRightLeft size={11} />
                        {t('type_transfer')}
                      </span>
                    </div>
                  )}
                </td>
                <td>
                  <span className={tx.type === 'TRANSFER' ? styles.transferBadge : styles.badge}>
                    {tx.category?.name || (tx.type === 'TRANSFER' ? t('type_transfer') : '---')}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {tx.type === 'TRANSFER' ? (
                    <div className={styles.transferAccountFlow} title={`${tx.account?.name || 'Origem'} ➔ ${tx.destinationAccount?.name || 'Destino'}`}>
                      <span>{tx.account?.name || '---'}</span>
                      <span className={styles.transferArrow}>➔</span>
                      <span>{tx.destinationAccount?.name || '---'}</span>
                    </div>
                  ) : (
                    tx.account?.name || '---'
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {new Date(tx.date).toLocaleDateString('pt-BR')}
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${tx.status === 'COMPLETED' ? styles.statusCompleted : styles.statusPending}`}>
                    {tx.status === 'COMPLETED' ? t('status_completed') : t('status_pending')}
                  </span>
                </td>
                <td 
                  style={{ textAlign: 'right', fontWeight: 600 }}
                  className={
                    tx.type === 'TRANSFER' 
                      ? styles.transferAmount 
                      : (tx.type === 'INCOME' ? styles.incomeAmount : styles.expenseAmount)
                  }
                >
                  {tx.type === 'TRANSFER' ? '' : (tx.type === 'INCOME' ? '+' : '-')}R${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <button 
                    className={styles.iconBtn} 
                    onClick={() => handleEditClick(tx)}
                    title="Editar transação"
                  >
                    <Edit3 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Feed View */}
      <div className={styles.mobileCardList}>
        {transactions.length === 0 ? (
          <div className={`glass-panel ${styles.mobileEmpty}`}>
            {t('no_transactions_found')}
          </div>
        ) : (
          transactions.map((tx) => (
            <div 
              key={tx.id} 
              className={`glass-panel ${styles.mobileTxCard} ${tx.type === 'TRANSFER' ? styles.mobileTransferCard : ''} ${selectedIds.has(tx.id) ? styles.selectedRow : ''}`}
            >
              <div className={styles.mobileTxHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(tx.id)}
                    onChange={() => toggleSelectOne(tx.id)}
                    className={styles.checkbox}
                  />
                  {tx.type === 'TRANSFER' ? (
                    <span className={styles.transferBadge}>
                      <ArrowRightLeft size={11} /> {t('type_transfer')}
                    </span>
                  ) : (
                    <span className={styles.badge}>
                      {tx.category?.name || '---'}
                    </span>
                  )}
                </div>
                <span className={styles.mobileTxDate}>
                  {new Date(tx.date).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className={styles.mobileTxBody}>
                <div className={styles.mobileTxMain}>
                  <span className={styles.mobileTxDesc}>{tx.description}</span>
                  <div className={styles.mobileTxAccount}>
                    {tx.type === 'TRANSFER' ? (
                      <span className={styles.transferAccountFlow}>
                        {tx.account?.name || '---'} <span className={styles.transferArrow}>➔</span> {tx.destinationAccount?.name || '---'}
                      </span>
                    ) : (
                      <span>{tx.account?.name || '---'}</span>
                    )}
                  </div>
                </div>

                <div 
                  className={
                    tx.type === 'TRANSFER' 
                      ? styles.transferAmount 
                      : (tx.type === 'INCOME' ? styles.incomeAmount : styles.expenseAmount)
                  }
                  style={{ fontSize: '1.05rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  {tx.type === 'TRANSFER' ? '' : (tx.type === 'INCOME' ? '+' : '-')}R${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className={styles.mobileTxFooter}>
                <span className={`${styles.statusBadge} ${tx.status === 'COMPLETED' ? styles.statusCompleted : styles.statusPending}`}>
                  {tx.status === 'COMPLETED' ? t('status_completed') : t('status_pending')}
                </span>
                <button 
                  className={styles.mobileEditBtn}
                  onClick={() => handleEditClick(tx)}
                  title="Editar transação"
                >
                  <Edit3 size={14} />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            className={styles.pageBtn} 
            disabled={page === 1}
            onClick={() => changePage(page - 1)}
          >
            Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <button 
            className={styles.pageBtn} 
            disabled={page === totalPages}
            onClick={() => changePage(page + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--negative-color)' }}>
                <Trash2 size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Confirmar Exclusão
              </h3>
              <button onClick={() => setIsDeleteConfirmOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.deleteWarning}>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Você está prestes a excluir <strong>{selectedIds.size}</strong> transação(ões).
              </p>
              <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                As transações serão movidas para a Lixeira e poderão ser restauradas em até <strong>30 dias</strong>.
              </p>
              <div className={styles.userBadge}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuário responsável:</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {currentUser ? `${currentUser.name} (${currentUser.email})` : 'Carregando...'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className={styles.secondaryButton} onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancelar
              </button>
              <button className={styles.dangerButton} onClick={handleDeleteSelected} id="btn-confirm-delete">
                <Trash2 size={16} /> Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ENTRY MODAL */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>
                {editingTransactionId ? t('edit_transaction') : t('new_transaction')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.formLabel}>Tipo</label>
                <select
                  className={styles.formInput}
                  value={formData.type}
                  onChange={e => setFormData({ 
                    ...formData, 
                    type: e.target.value as 'EXPENSE' | 'INCOME' | 'TRANSFER', 
                    categoryId: '',
                    destinationAccountId: e.target.value === 'TRANSFER' ? formData.destinationAccountId : ''
                  })}
                >
                  <option value="EXPENSE">{t('type_expense')}</option>
                  <option value="INCOME">{t('type_income')}</option>
                  <option value="TRANSFER">{t('type_transfer')}</option>
                </select>
              </div>

              <div>
                <label className={styles.formLabel}>
                  {formData.type === 'TRANSFER' ? t('col_source_account') : t('col_account')}
                </label>
                <select
                  className={styles.formInput}
                  value={formData.accountId}
                  onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                  required
                >
                  <option value="">{t('select_account')}</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {formData.type === 'TRANSFER' && (
                <div>
                  <label className={styles.formLabel}>{t('col_destination_account')}</label>
                  <select
                    className={styles.formInput}
                    value={formData.destinationAccountId}
                    onChange={e => setFormData({ ...formData, destinationAccountId: e.target.value })}
                    required
                  >
                    <option value="">{t('select_account')}</option>
                    {accounts.filter(acc => acc.id !== formData.accountId).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={styles.formLabel}>{t('col_date')}</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className={styles.formLabel}>{t('col_description')}</label>
                <input 
                  type="text" 
                  list="descriptions"
                  className={styles.formInput} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder={formData.type === 'TRANSFER' ? "Ex: Transferência para Cartão" : "Ex: Supermercado"}
                  required 
                />
                <datalist id="descriptions">
                  {uniqueDescriptions.map((desc, i) => (
                    <option key={i} value={desc} />
                  ))}
                </datalist>
                <small style={{ color: 'var(--text-muted)' }}>* Ao digitar, a IA local tenta sugerir a categoria baseada no seu histórico.</small>
              </div>

              <div>
                <label className={styles.formLabel}>{t('col_amount')}</label>
                <input 
                  type="number" 
                  step="0.01"
                  className={styles.formInput} 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  placeholder="0.00"
                  required 
                />
              </div>

              <div>
                <label className={styles.formLabel}>{t('col_category')}</label>
                {!isCreatingCategory ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      className={styles.formInput} 
                      value={formData.categoryId} 
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      required
                    >
                      <option value="">{t('select_category')}</option>
                      {categories.filter(c => c.type === formData.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setIsCreatingCategory(true)} className={styles.secondaryButton}>
                      {t('new_category')}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="Nome"
                      className={styles.formInput} 
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                    />
                    <select className={styles.formInput} value={newCategoryType} onChange={e => setNewCategoryType(e.target.value as 'INCOME'|'EXPENSE'|'TRANSFER')} style={{ width: 'auto' }}>
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
                      <option value="TRANSFER">Transferência</option>
                    </select>
                    <button type="button" onClick={handleCreateCategory} className={styles.primaryButton} style={{ padding: '0.5rem 1rem' }}>Salvar</button>
                    <button type="button" onClick={() => setIsCreatingCategory(false)} className={styles.secondaryButton}>Cancelar</button>
                  </div>
                )}
              </div>

              {/* Automatic Type label removed since it's now explicit */}

              <button type="submit" className={styles.addButton} style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
                Salvar Transação
              </button>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Importar Extrato</h3>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePreview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.formLabel}>Arquivo (.csv, .xls, .xlsx, .ofx, .pdf)</label>
                <input 
                  type="file" 
                  accept=".csv, .xls, .xlsx, .ofx, .pdf"
                  className={styles.formInput} 
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  required 
                />
              </div>

              {uploadFile?.name.toLowerCase().endsWith('.pdf') && (
                <div>
                  <label className={styles.formLabel}>Qual Banco? (Somente para PDF)</label>
                  <select 
                    className={styles.formInput} 
                    value={uploadBank} 
                    onChange={e => setUploadBank(e.target.value)}
                    required
                  >
                    <option value="">Selecione o Banco</option>
                    <option value="itau">Itaú</option>
                    <option value="inter">Inter</option>
                    <option value="bb">Banco do Brasil</option>
                    <option value="picpay">PicPay</option>
                  </select>
                </div>
              )}

              <button type="submit" className={styles.primaryButton} disabled={uploadLoading} style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                {uploadLoading ? 'Processando...' : 'Verificar Dados'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewData && (() => {
        const detectedInvoicePaymentsCount = previewData.filter(row => row.isInvoicePayment || isInvoicePaymentDesc(row.description || '')).length;

        return (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} glass-panel`} style={{ minWidth: '85%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)', zIndex: 10, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{t('review_import')} ({previewData.length} {previewData.length === 1 ? 'item' : 'itens'})</h3>
                  <small style={{ color: 'var(--text-muted)' }}>Revise os lançamentos, ajuste categorias ou remova linhas indesejadas antes de salvar.</small>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setPreviewData(null)} className={styles.secondaryButton}>
                    {t('cancel')}
                  </button>
                  <button onClick={handleSaveBatch} className={styles.primaryButton} id="btn-save-batch">
                    <Save size={18} style={{ marginRight: '0.5rem' }}/> {t('save_all')}
                  </button>
                </div>
              </div>

              {/* INVOICE PAYMENT ALERT BANNER */}
              {detectedInvoicePaymentsCount > 0 && (
                <div className={styles.invoicePaymentAlertBanner}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} style={{ color: '#eab308' }} />
                    <span>
                      {t('invoice_payment_banner')} (<strong>{detectedInvoicePaymentsCount}</strong> {detectedInvoicePaymentsCount === 1 ? 'lançamento identificado' : 'lançamentos identificados'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleConvertAllInvoicePaymentsToTransfer}
                      className={styles.primaryButton}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: '#3b82f6' }}
                      title={t('btn_convert_to_transfer')}
                    >
                      <ArrowRightLeft size={14} /> {t('btn_convert_to_transfer')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAllInvoicePayments}
                      className={styles.excludeInvoiceBtn}
                      title={t('btn_exclude_invoice_payments')}
                    >
                      <Trash2 size={14} /> {t('btn_exclude_invoice_payments')}
                    </button>
                  </div>
                </div>
              )}
              
              {/* GLOBAL SELECTORS */}
              <div className={styles.globalSelectors}>
                <div className={styles.globalSelectorItem}>
                  <label className={styles.filterLabel}>
                    <CheckSquare size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {t('apply_account_all')}
                  </label>
                  <select 
                    value={globalAccountId} 
                    onChange={e => handleApplyGlobalAccount(e.target.value)}
                    className={styles.filterInput}
                    id="global-account-selector"
                  >
                    <option value="">— Selecionar —</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.globalSelectorItem}>
                  <label className={styles.filterLabel}>
                    <CheckSquare size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {t('apply_category_all')}
                  </label>
                  <select 
                    value={globalCategoryId} 
                    onChange={e => handleApplyGlobalCategory(e.target.value)}
                    className={styles.filterInput}
                    id="global-category-selector"
                  >
                    <option value="">— Selecionar —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'INCOME' ? 'Receita' : (c.type === 'TRANSFER' ? 'Transferência' : 'Despesa')})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.globalSelectorItem}>
                  {!previewCreatingCategory ? (
                    <button 
                      className={styles.secondaryButton} 
                      onClick={() => setPreviewCreatingCategory(true)}
                      style={{ whiteSpace: 'nowrap' }}
                      id="btn-preview-new-category"
                    >
                      <Plus size={14} /> {t('new_category')}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Nome da categoria"
                        className={styles.filterInput} 
                        value={previewNewCategoryName}
                        onChange={e => setPreviewNewCategoryName(e.target.value)}
                        style={{ minWidth: '140px' }}
                      />
                      <select 
                        className={styles.filterInput} 
                        value={previewNewCategoryType} 
                        onChange={e => setPreviewNewCategoryType(e.target.value as 'INCOME'|'EXPENSE'|'TRANSFER')} 
                        style={{ width: 'auto' }}
                      >
                        <option value="EXPENSE">Despesa</option>
                        <option value="INCOME">Receita</option>
                        <option value="TRANSFER">Transferência</option>
                      </select>
                      <button onClick={handlePreviewCreateCategory} className={styles.primaryButton} style={{ padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}>Salvar</button>
                      <button onClick={() => setPreviewCreatingCategory(false)} className={styles.secondaryButton} style={{ padding: '0.4rem 0.75rem' }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('col_date')}</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('col_description')}</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>{t('col_amount')}</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('col_category')}</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('col_account')}</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem', width: '60px' }}>{t('col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        Nenhum item restante na pré-visualização.
                      </td>
                    </tr>
                  ) : previewData.map((row, index) => {
                    const filteredCategories = getCategoriesForType(row.type);
                    const isPayment = Boolean(row.isInvoicePayment || isInvoicePaymentDesc(row.description || ''));

                    return (
                      <tr 
                        key={index} 
                        className={isPayment ? styles.invoicePaymentRow : ''}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>{new Date(row.date as any).toLocaleDateString()}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                          <input 
                            type="text" 
                            value={row.description} 
                            onChange={e => handlePreviewRowChange(index, 'description', e.target.value)}
                            className={styles.formInput}
                            style={{ padding: '0.25rem' }}
                          />
                          {isPayment && (
                            <div className={styles.invoicePaymentBadge}>
                              ⚡ {t('invoice_payment_detected')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ 
                            fontWeight: 600, 
                            color: row.type === 'TRANSFER' 
                              ? '#3b82f6' 
                              : (row.type === 'INCOME' ? 'var(--positive-color)' : 'var(--negative-color)') 
                          }}>
                            {row.type === 'TRANSFER' ? '' : (row.type === 'INCOME' ? '+' : '-')}R${Number(row.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <select
                            value={row.type || 'EXPENSE'}
                            onChange={e => {
                              const newType = e.target.value as 'INCOME' | 'EXPENSE' | 'TRANSFER';
                              handlePreviewRowChange(index, 'type', newType);
                              // Clear category if not valid for new type
                              const validForType = getCategoriesForType(newType);
                              if (!validForType.some(c => c.id === row.categoryId)) {
                                handlePreviewRowChange(index, 'categoryId', validForType[0]?.id || '');
                              }
                            }}
                            className={styles.formInput}
                            style={{ padding: '0.15rem 0.3rem', fontSize: '0.7rem', marginTop: '4px', width: 'auto', display: 'inline-block' }}
                          >
                            <option value="EXPENSE">Despesa</option>
                            <option value="INCOME">Receita</option>
                            <option value="TRANSFER">Transferência</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                          <select 
                            value={row.categoryId || ''} 
                            onChange={e => handlePreviewRowChange(index, 'categoryId', e.target.value)}
                            className={styles.formInput}
                            style={{ 
                              padding: '0.25rem', 
                              borderColor: row.categoryId ? 'var(--accent-lime)' : 'var(--negative-color)',
                              fontSize: '0.8rem'
                            }}
                          >
                            <option value="">{t('uncategorized')}</option>
                            {filteredCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {row.type === 'EXPENSE' ? '🔴 Despesas' : (row.type === 'INCOME' ? '🟢 Receitas' : '🔄 Transferência')}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>
                              {row.type === 'TRANSFER' && <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Origem:</label>}
                              <select 
                                value={row.accountId || ''} 
                                onChange={e => handlePreviewRowChange(index, 'accountId', e.target.value)}
                                className={styles.formInput}
                                style={{ padding: '0.25rem', fontSize: '0.8rem' }}
                              >
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                              </select>
                            </div>
                            {row.type === 'TRANSFER' && (
                              <div>
                                <label style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600, display: 'block' }}>Destino:</label>
                                <select 
                                  value={row.destinationAccountId || ''} 
                                  onChange={e => handlePreviewRowChange(index, 'destinationAccountId', e.target.value)}
                                  className={styles.formInput}
                                  style={{ 
                                    padding: '0.25rem', 
                                    fontSize: '0.8rem', 
                                    borderColor: row.destinationAccountId ? 'var(--accent-lime)' : '#ef4444' 
                                  }}
                                >
                                  <option value="">— Selecione o Destino —</option>
                                  {accounts.filter(acc => acc.id !== row.accountId).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'top' }}>
                          <button
                            type="button"
                            onClick={() => handleDeletePreviewRow(index)}
                            className={styles.previewDeleteBtn}
                            title={t('delete_row_tooltip')}
                            aria-label="Excluir lançamento da importação"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Transactions;
