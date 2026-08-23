import React, { useState, useEffect } from 'react';
import { Plus, Upload, X, Download, Save, Trash2, Filter, CheckSquare, Edit3 } from 'lucide-react';
import { useI18nStore } from '../i18n';
import { useTransactions, type Transaction, type TransactionFilters } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useUpload } from '../hooks/useUpload';
import { fetchApi } from '../services/api';
import styles from './Transactions.module.css';

const Transactions: React.FC = () => {
  const { t } = useI18nStore();
  const { transactions, loading, createTransaction, batchCreateTransactions, deleteBatch, suggestCategory, uniqueDescriptions, refresh, applyFilters, page, totalPages, changePage } = useTransactions();
  const { categories, createCategory } = useCategories();
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
    type: 'EXPENSE' as 'EXPENSE' | 'INCOME',
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
  }, [formData.description, categories]);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

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
  const [previewNewCategoryType, setPreviewNewCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

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

    try {
      if (editingTransactionId) {
        // @ts-ignore
        await useTransactions().updateTransaction(editingTransactionId, {
          description: formData.description,
          amount: Number(formData.amount),
          categoryId: formData.categoryId || null,
          accountId: formData.accountId || undefined,
          type: typeToSave,
          date: new Date(formData.date).toISOString(),
          status: 'COMPLETED'
        });
        refresh(); // Refresh manually to see the update
      } else {
        if (!formData.categoryId) return; // Category required for new
        await createTransaction({
          description: formData.description,
          amount: Number(formData.amount),
          categoryId: formData.categoryId,
          accountId: formData.accountId || undefined,
          type: typeToSave,
          date: new Date(formData.date).toISOString(),
          status: 'COMPLETED'
        });
      }
      setIsModalOpen(false);
      setEditingTransactionId(null);
      setFormData({ description: '', amount: '', categoryId: '', accountId: '', type: 'EXPENSE', date: new Date().toISOString().split('T')[0] });
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
      type: tx.type,
      date: new Date(tx.date).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName) return;
    const cat = await createCategory(newCategoryName, newCategoryType);
    setFormData(prev => ({ ...prev, categoryId: cat.id }));
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    try {
      const data = await previewStatement(uploadFile, uploadBank || undefined);
      setPreviewData(data);
      setIsUploadModalOpen(false);
      setUploadFile(null);
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
    return categories;
  };

  const handleSaveBatch = async () => {
    if (!previewData) return;
    try {
      await batchCreateTransactions(previewData);
      setPreviewData(null);
      refresh();
    } catch (err) {
      alert("Error saving batch: " + err);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-main)' }}>Loading transactions...</div>;

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
              <Trash2 size={16} /> Excluir ({selectedIds.size})
            </button>
          )}
          <button 
            className={`${styles.secondaryButton} ${showFilters ? styles.activeFilter : ''}`} 
            onClick={() => setShowFilters(!showFilters)}
            id="btn-toggle-filters"
          >
            <Filter size={16} /> Filtros
          </button>
          <button className={styles.secondaryButton} onClick={() => exportCSV()} id="btn-export-csv">
            <Download size={18} /> Exportar
          </button>
          <button className={styles.secondaryButton} onClick={() => setIsUploadModalOpen(true)} id="btn-import-statement">
            <Upload size={18} /> Importar Extrato
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
                <option value="">Todas as contas</option>
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
              Aplicar Filtros
            </button>
            {hasActiveFilters && (
              <button className={styles.secondaryButton} onClick={handleClearFilters} id="btn-clear-filters">
                Limpar Filtros
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
              <th>Conta</th>
              <th>{t('col_date')}</th>
              <th>{t('col_status')}</th>
              <th style={{ textAlign: 'right' }}>{t('col_amount')}</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma transação encontrada</td></tr>
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
                <td style={{ fontWeight: 500 }}>{tx.description}</td>
                <td><span className={styles.badge}>{tx.category?.name || '---'}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tx.account?.name || '---'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString()}</td>
                <td>
                  <span style={{ 
                    color: tx.status === 'COMPLETED' ? 'var(--positive-color)' : 'var(--text-muted)',
                    fontSize: '0.875rem'
                  }}>
                    {tx.status === 'COMPLETED' ? t('status_completed') : t('status_pending')}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }} className={tx.type === 'INCOME' ? styles.incomeAmount : styles.expenseAmount}>
                  {tx.type === 'INCOME' ? '+' : '-'}R${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                {editingTransactionId ? 'Editar Transação' : t('new_transaction')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.formLabel}>Conta</label>
                <select
                  className={styles.formInput}
                  value={formData.accountId}
                  onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.formLabel}>Data</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className={styles.formLabel}>Tipo</label>
                <select
                  className={styles.formInput}
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'EXPENSE' | 'INCOME', categoryId: '' })}
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
              </div>

              <div>
                <label className={styles.formLabel}>Descrição</label>
                <input 
                  type="text" 
                  list="descriptions"
                  className={styles.formInput} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Ex: Supermercado"
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
                <label className={styles.formLabel}>Valor</label>
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
                <label className={styles.formLabel}>Categoria</label>
                {!isCreatingCategory ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      className={styles.formInput} 
                      value={formData.categoryId} 
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.filter(c => c.type === formData.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setIsCreatingCategory(true)} className={styles.secondaryButton}>
                      Nova
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
                    <select className={styles.formInput} value={newCategoryType} onChange={e => setNewCategoryType(e.target.value as 'INCOME'|'EXPENSE')} style={{ width: 'auto' }}>
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
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
      {previewData && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`} style={{ minWidth: '80%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)', zIndex: 10, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Revisar Importação ({previewData.length} itens)</h3>
                <small style={{ color: 'var(--text-muted)' }}>As categorias foram preenchidas automaticamente pela IA com base no seu histórico.</small>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setPreviewData(null)} className={styles.secondaryButton}>
                  Cancelar
                </button>
                <button onClick={handleSaveBatch} className={styles.primaryButton} id="btn-save-batch">
                  <Save size={18} style={{ marginRight: '0.5rem' }}/> Salvar Tudo
                </button>
              </div>
            </div>
            
            {/* GLOBAL SELECTORS */}
            <div className={styles.globalSelectors}>
              <div className={styles.globalSelectorItem}>
                <label className={styles.filterLabel}>
                  <CheckSquare size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  Aplicar Conta a todas:
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
                  Aplicar Categoria a todas:
                </label>
                <select 
                  value={globalCategoryId} 
                  onChange={e => handleApplyGlobalCategory(e.target.value)}
                  className={styles.filterInput}
                  id="global-category-selector"
                >
                  <option value="">— Selecionar —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type === 'INCOME' ? 'Receita' : 'Despesa'})</option>
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
                    <Plus size={14} /> Nova Categoria
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
                      onChange={e => setPreviewNewCategoryType(e.target.value as 'INCOME'|'EXPENSE')} 
                      style={{ width: 'auto' }}
                    >
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
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
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Data</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Descrição</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Valor</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Categoria</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Conta</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => {
                  const filteredCategories = getCategoriesForType(row.type);
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem' }}>{new Date(row.date as any).toLocaleDateString()}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <input 
                          type="text" 
                          value={row.description} 
                          onChange={e => handlePreviewRowChange(index, 'description', e.target.value)}
                          className={styles.formInput}
                          style={{ padding: '0.25rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', color: row.type === 'INCOME' ? 'var(--positive-color)' : 'var(--negative-color)', fontWeight: 600 }}>
                         {row.type === 'INCOME' ? '+' : '-'}R${Number(row.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
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
                          <option value="">Sem Categoria</option>
                          {filteredCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {row.type === 'EXPENSE' ? '🔴 Despesas' : '🟢 Receitas'}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
