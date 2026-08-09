import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wallet, X } from 'lucide-react';
import { useI18nStore } from '../i18n';
import { fetchApi } from '../services/api';
import styles from './Accounts.module.css';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  initialBalance: number;
}

const Accounts: React.FC = () => {
  const { t } = useI18nStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHECKING',
    customType: '',
    initialBalance: 0
  });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/accounts');
      setAccounts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({ name: '', type: 'CHECKING', customType: '', initialBalance: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    // Determine if it's a standard type
    const standardTypes = ['CHECKING', 'CREDIT_CARD', 'SAVINGS', 'CASH'];
    if (standardTypes.includes(acc.type)) {
      setFormData({ name: acc.name, type: acc.type, customType: '', initialBalance: acc.initialBalance || 0 });
    } else {
      setFormData({ name: acc.name, type: 'OTHER', customType: acc.type, initialBalance: acc.initialBalance || 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const finalType = formData.type === 'OTHER' ? (formData.customType || 'OTHER') : formData.type;

    try {
      if (editingAccount) {
        await fetchApi(`/accounts/${editingAccount.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: formData.name, type: finalType, initialBalance: Number(formData.initialBalance) })
        });
      } else {
        await fetchApi('/accounts', {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, type: finalType, initialBalance: Number(formData.initialBalance) })
        });
      }
      setIsModalOpen(false);
      loadAccounts();
    } catch (err) {
      alert("Error saving account");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('delete_confirm'))) return;
    try {
      await fetchApi(`/accounts/${id}`, { method: 'DELETE' });
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir conta.');
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-main)' }}>Carregando...</div>;

  return (
    <div className={styles.accountsPage}>
      <div className={styles.header}>
        <h2>{t('my_accounts')}</h2>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          <Plus size={18} /> {t('new_account')}
        </button>
      </div>

      <div className={styles.grid}>
        {accounts.length === 0 ? (
          <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma conta cadastrada.</div>
        ) : accounts.map(acc => (
          <div key={acc.id} className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.accountName}>{acc.name}</div>
                <span className={styles.accountType}>
                  {acc.type === 'CHECKING' ? t('type_checking') : 
                   acc.type === 'CREDIT_CARD' ? t('type_credit') : 
                   acc.type === 'SAVINGS' ? t('type_savings') : 
                   acc.type === 'CASH' ? t('type_cash') : acc.type}
                </span>
              </div>
              <Wallet size={24} color="var(--text-muted)" />
            </div>
            
            <div>
              <div className={styles.balanceLabel}>{t('balance')}</div>
              <div className={`${styles.balanceAmount} ${acc.balance >= 0 ? styles.positive : styles.negative}`}>
                R$ {Math.abs(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className={styles.cardActions}>
              <button className={styles.iconBtn} onClick={() => openEditModal(acc)} title={t('edit_account')}>
                <Edit2 size={16} />
              </button>
              <button className={styles.iconBtn} onClick={() => handleDelete(acc.id)} title="Excluir">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {editingAccount ? t('edit_account') : t('new_account')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.formLabel}>{t('account_name')}</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Nubank, Bradesco..."
                  required 
                />
              </div>

              <div>
                <label className={styles.formLabel}>{t('account_type')}</label>
                <select 
                  className={styles.formInput}
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="CHECKING">{t('type_checking')}</option>
                  <option value="CREDIT_CARD">{t('type_credit')}</option>
                  <option value="SAVINGS">{t('type_savings')}</option>
                  <option value="CASH">{t('type_cash')}</option>
                  <option value="OTHER">{t('type_other')}</option>
                </select>
              </div>

              <div>
                <label className={styles.formLabel}>Saldo Inicial (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className={styles.formInput} 
                  value={formData.initialBalance} 
                  onChange={e => setFormData({...formData, initialBalance: Number(e.target.value)})} 
                  placeholder="0.00"
                />
              </div>

              {formData.type === 'OTHER' && (
                <div>
                  <label className={styles.formLabel}>{t('custom_type')}</label>
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    value={formData.customType} 
                    onChange={e => setFormData({...formData, customType: e.target.value})} 
                    placeholder="Ex: Investimento, Vale Alimentação..."
                    required 
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.iconBtn} style={{ flex: 1, padding: '0.75rem' }}>
                  {t('btn_cancel')}
                </button>
                <button type="submit" className={styles.primaryButton} style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}>
                  {t('btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
