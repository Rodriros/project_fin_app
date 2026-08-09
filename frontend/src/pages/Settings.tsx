import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, X, Plus } from 'lucide-react';
import { useI18nStore } from '../i18n';
import { useCategories } from '../hooks/useCategories';
import { useTrash } from '../hooks/useTrash';
import styles from './Settings.module.css';

const Settings: React.FC = () => {
  const { language, setLanguage, t } = useI18nStore();
  const { categories, loading, createCategory, deleteCategory } = useCategories();
  const { trashItems, loading: trashLoading, loadTrash, restoreItem, restoreBatch } = useTrash();
  
  const [activeTab, setActiveTab] = useState<'settings' | 'trash'>('settings');
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);

  // Category management state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [catError, setCatError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash();
    }
  }, [activeTab, loadTrash]);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setCatError(null);
    try {
      await createCategory(newCatName.trim(), newCatType);
      setNewCatName('');
      setNewCatType('EXPENSE');
      setIsAddingCategory(false);
    } catch (err: any) {
      setCatError(err.message || 'Erro ao criar categoria');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCatError(null);
    try {
      await deleteCategory(id);
      setDeletingCatId(null);
    } catch (err: any) {
      setCatError(err.message || 'Erro ao excluir categoria');
      setDeletingCatId(null);
    }
  };

  const toggleTrashSelect = (id: string) => {
    setSelectedTrashIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllTrash = () => {
    if (selectedTrashIds.size === trashItems.length) {
      setSelectedTrashIds(new Set());
    } else {
      setSelectedTrashIds(new Set(trashItems.map(t => t.id)));
    }
  };

  const handleRestore = async (id: string) => {
    setRestoring(true);
    try {
      await restoreItem(id);
      selectedTrashIds.delete(id);
      setSelectedTrashIds(new Set(selectedTrashIds));
    } catch (err: any) {
      alert('Erro ao restaurar: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleRestoreBatch = async () => {
    if (selectedTrashIds.size === 0) return;
    setRestoring(true);
    try {
      await restoreBatch(Array.from(selectedTrashIds));
      setSelectedTrashIds(new Set());
    } catch (err: any) {
      alert('Erro ao restaurar: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 30);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  return (
    <div className={styles.settingsPage}>
      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button 
          className={`${styles.tab} ${activeTab === 'settings' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('settings')}
          id="tab-settings"
        >
          Configurações
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'trash' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('trash')}
          id="tab-trash"
        >
          <Trash2 size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Lixeira
          {trashItems.length > 0 && (
            <span className={styles.trashBadgeCount}>{trashItems.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'settings' && (
        <>
          {/* Language Settings */}
          <div className={`glass-panel ${styles.section}`}>
            <h3 className={styles.sectionTitle}>{t('language_settings')}</h3>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>{t('language_settings')}</span>
              <select 
                className={styles.selectInput}
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
              >
                <option value="pt-BR">Português (BR)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Categories Management */}
          <div className={`glass-panel ${styles.section}`}>
            <div className={styles.categoryHeader}>
              <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>{t('categories_settings')}</h3>
              {!isAddingCategory && (
                <button 
                  className={styles.addCategoryButton} 
                  onClick={() => { setIsAddingCategory(true); setCatError(null); }}
                  id="btn-add-category"
                >
                  <Plus size={16} /> Nova Categoria
                </button>
              )}
            </div>

            {/* Error message */}
            {catError && (
              <div className={styles.catErrorMessage}>
                <span>{catError}</span>
                <button onClick={() => setCatError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 0.25rem' }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Add Category Form */}
            {isAddingCategory && (
              <div className={styles.addCategoryForm}>
                <input
                  type="text"
                  placeholder="Nome da categoria"
                  className={styles.catFormInput}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                  autoFocus
                  id="input-new-category-name"
                />
                <select 
                  className={styles.catFormSelect}
                  value={newCatType} 
                  onChange={e => setNewCatType(e.target.value as 'INCOME' | 'EXPENSE')}
                  id="select-new-category-type"
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="INCOME">Receita</option>
                </select>
                <button className={styles.catFormSaveBtn} onClick={handleAddCategory} id="btn-save-category">
                  Salvar
                </button>
                <button 
                  className={styles.catFormCancelBtn} 
                  onClick={() => { setIsAddingCategory(false); setNewCatName(''); setCatError(null); }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className={styles.categoryList}>
              {loading ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
              ) : categories.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma categoria encontrada. Clique em "Nova Categoria" para criar.</div>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className={styles.categoryItem}>
                    <div className={styles.categoryInfo}>
                      <span className={styles.settingLabel}>{cat.name}</span>
                      <span className={styles.categoryBadge} style={{
                        backgroundColor: cat.type === 'INCOME' ? 'var(--positive-bg)' : 'var(--negative-bg)',
                        color: cat.type === 'INCOME' ? 'var(--positive-color)' : 'var(--negative-color)'
                      }}>
                        {cat.type === 'INCOME' ? t('type_income') : t('type_expense')}
                      </span>
                    </div>
                    <div className={styles.categoryActions}>
                      {deletingCatId === cat.id ? (
                        <div className={styles.deleteConfirmInline}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Excluir?</span>
                          <button 
                            className={styles.deleteConfirmYes} 
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            Sim
                          </button>
                          <button 
                            className={styles.deleteConfirmNo} 
                            onClick={() => setDeletingCatId(null)}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button 
                          className={styles.deleteCategoryBtn} 
                          onClick={() => { setDeletingCatId(cat.id); setCatError(null); }}
                          title="Excluir categoria"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'trash' && (
        <div className={`glass-panel ${styles.section}`}>
          <div className={styles.trashHeader}>
            <div>
              <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.25rem' }}>
                <Trash2 size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Lixeira de Transações
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                As transações excluídas são mantidas por até 30 dias antes de serem removidas permanentemente.
              </p>
            </div>
            {selectedTrashIds.size > 0 && (
              <button 
                className={styles.restoreButton} 
                onClick={handleRestoreBatch}
                disabled={restoring}
                id="btn-restore-batch"
              >
                <RotateCcw size={16} /> Restaurar ({selectedTrashIds.size})
              </button>
            )}
          </div>

          {trashLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando lixeira...</div>
          ) : trashItems.length === 0 ? (
            <div className={styles.emptyTrash}>
              <Trash2 size={48} strokeWidth={1} />
              <p>A lixeira está vazia</p>
            </div>
          ) : (
            <div className={styles.trashTable}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', padding: '0.75rem 0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={trashItems.length > 0 && selectedTrashIds.size === trashItems.length}
                        onChange={toggleSelectAllTrash}
                        className={styles.checkbox}
                        id="checkbox-select-all-trash"
                      />
                    </th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Descrição</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Valor</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Conta</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Excluído por</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Data Exclusão</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Dias Restantes</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {trashItems.map(item => {
                    const daysLeft = getDaysRemaining(item.deletedAt);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }} className={selectedTrashIds.has(item.id) ? styles.selectedRow : ''}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedTrashIds.has(item.id)}
                            onChange={() => toggleTrashSelect(item.id)}
                            className={styles.checkbox}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, color: 'var(--text-main)' }}>
                          {item.description}
                          {item.categoryName && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.categoryName}</span>
                          )}
                        </td>
                        <td style={{ 
                          padding: '0.75rem 0.5rem', 
                          textAlign: 'right', 
                          fontWeight: 600,
                          color: item.type === 'INCOME' ? 'var(--positive-color)' : 'var(--negative-color)'
                        }}>
                          {item.type === 'INCOME' ? '+' : '-'}R${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {item.accountName || '---'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {item.deletedByName}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {new Date(item.deletedAt).toLocaleDateString('pt-BR')} {new Date(item.deletedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <span className={`${styles.daysLeftBadge} ${daysLeft <= 5 ? styles.daysLeftCritical : daysLeft <= 15 ? styles.daysLeftWarning : ''}`}>
                            {daysLeft}d
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <button 
                            className={styles.restoreButtonSmall} 
                            onClick={() => handleRestore(item.id)}
                            disabled={restoring}
                            title="Restaurar transação"
                          >
                            <RotateCcw size={14} /> Restaurar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
