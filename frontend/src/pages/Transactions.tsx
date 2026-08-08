import React, { useState } from 'react';
import { Plus, Upload, X, Download } from 'lucide-react';
import { useI18nStore } from '../i18n';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useUpload } from '../hooks/useUpload';
import styles from './Transactions.module.css';

const Transactions: React.FC = () => {
  const { t } = useI18nStore();
  const { transactions, loading, createTransaction, uniqueDescriptions, refresh } = useTransactions();
  const { categories, createCategory } = useCategories();
  const { uploadStatement, exportCSV, loading: uploadLoading } = useUpload();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });
  
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBank, setUploadBank] = useState('');

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.categoryId || !formData.date) return;

    const cat = categories.find(c => c.id === formData.categoryId);
    if (!cat) return;

    await createTransaction({
      description: formData.description,
      amount: Number(formData.amount),
      categoryId: formData.categoryId,
      type: cat.type,
      date: new Date(formData.date).toISOString(),
      status: 'COMPLETED'
    });

    setIsModalOpen(false);
    setFormData({ description: '', amount: '', categoryId: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName) return;
    const cat = await createCategory(newCategoryName, newCategoryType);
    setFormData(prev => ({ ...prev, categoryId: cat.id }));
    setIsCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    try {
      await uploadStatement(uploadFile, uploadBank || undefined);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      refresh();
    } catch (err) {
      alert("Error uploading file: " + err);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-main)' }}>Loading transactions...</div>;

  return (
    <div className={styles.transactionsPage}>
      <div className={styles.header}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{t('recent_transactions')}</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className={styles.secondaryButton} onClick={() => exportCSV()}>
            <Download size={18} /> Exportar
          </button>
          <button className={styles.secondaryButton} onClick={() => setIsUploadModalOpen(true)}>
            <Upload size={18} /> Importar Extrato
          </button>
          <button className={styles.primaryButton} onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> {t('add_new')}
          </button>
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        <table>
          <thead>
            <tr>
              <th>{t('col_description')}</th>
              <th>{t('col_category')}</th>
              <th>{t('col_date')}</th>
              <th>{t('col_status')}</th>
              <th style={{ textAlign: 'right' }}>{t('col_amount')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transactions yet</td></tr>
            ) : transactions.map((tx) => (
              <tr key={tx.id}>
                <td style={{ fontWeight: 500 }}>{tx.description}</td>
                <td><span className={styles.badge}>{tx.category?.name || '---'}</span></td>
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
                  {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Nova Transação</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.type === 'INCOME' ? 'Receita' : 'Despesa'})</option>
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

              {formData.categoryId && !isCreatingCategory && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Tipo Automático: <strong style={{ color: categories.find(c => c.id === formData.categoryId)?.type === 'INCOME' ? 'var(--accent-lime)' : 'var(--negative-color)' }}>
                    {categories.find(c => c.id === formData.categoryId)?.type === 'INCOME' ? 'Receita' : 'Despesa'}
                  </strong>
                </div>
              )}

              <button type="submit" className={styles.addButton} style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}>
                Salvar Transação
              </button>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Importar Extrato</h3>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                {uploadLoading ? 'Processando...' : 'Importar Dados'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
