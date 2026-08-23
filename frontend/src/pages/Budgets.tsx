import React, { useState, useEffect } from 'react';
import { Plus, Target, PiggyBank, Edit3, Trash2, X, AlertTriangle } from 'lucide-react';
import { fetchApi } from '../services/api';
import { useCategories } from '../hooks/useCategories';
import styles from './Budgets.module.css';

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: string;
  spent: number; // dynamically injected by backend
  category: {
    id: string;
    name: string;
  };
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
}

const Budgets: React.FC = () => {
  const { categories } = useCategories();
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  
  // Data
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [budgetForm, setBudgetForm] = useState({ categoryId: '', amount: '' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '', color: '#6366f1' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetsData, goalsData] = await Promise.all([
        fetchApi('/budgets'),
        fetchApi('/goals')
      ]);
      setBudgets(budgetsData);
      setGoals(goalsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Budget Handlers ---
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetchApi(`/budgets/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ amount: Number(budgetForm.amount) })
        });
      } else {
        await fetchApi('/budgets', {
          method: 'POST',
          body: JSON.stringify({ 
            categoryId: budgetForm.categoryId, 
            amount: Number(budgetForm.amount) 
          })
        });
      }
      setIsBudgetModalOpen(false);
      setBudgetForm({ categoryId: '', amount: '' });
      setEditingId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar orçamento');
    }
  };

  const deleteBudget = async (id: string) => {
    if (!confirm('Deseja excluir este orçamento?')) return;
    try {
      await fetchApi(`/budgets/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Goal Handlers ---
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        currentAmount: goalForm.currentAmount ? Number(goalForm.currentAmount) : 0,
        targetDate: goalForm.targetDate || undefined,
        color: goalForm.color
      };

      if (editingId) {
        await fetchApi(`/goals/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/goals', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsGoalModalOpen(false);
      setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', color: '#6366f1' });
      setEditingId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar meta');
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;
    try {
      await fetchApi(`/goals/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const addProgressToGoal = async (id: string, current: number, addition: number) => {
    try {
      await fetchApi(`/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ currentAmount: current + addition })
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Render Helpers ---
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const availableCategories = expenseCategories.filter(c => !budgets.some(b => b.categoryId === c.id) || editingId);

  return (
    <div className={styles.budgetsPage}>
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'budgets' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('budgets')}
          >
            <Target size={18} /> Orçamentos Mensais
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'goals' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            <PiggyBank size={18} /> Metas de Economia
          </button>
        </div>
        
        {activeTab === 'budgets' ? (
          <button 
            className={styles.addButton}
            onClick={() => {
              setEditingId(null);
              setBudgetForm({ categoryId: '', amount: '' });
              setIsBudgetModalOpen(true);
            }}
          >
            <Plus size={18} /> Novo Orçamento
          </button>
        ) : (
          <button 
            className={styles.addButton}
            onClick={() => {
              setEditingId(null);
              setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', color: '#6366f1' });
              setIsGoalModalOpen(true);
            }}
          >
            <Plus size={18} /> Nova Meta
          </button>
        )}
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Carregando...</div>
      ) : activeTab === 'budgets' ? (
        // BUDGETS VIEW
        <div className={styles.grid}>
          {budgets.length === 0 ? (
            <div className={styles.emptyState}>Nenhum orçamento definido.</div>
          ) : (
            budgets.map(budget => {
              const progress = Math.min((budget.spent / budget.amount) * 100, 100);
              const isOver = budget.spent > budget.amount;
              const remaining = budget.amount - budget.spent;

              return (
                <div key={budget.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{budget.category.name}</h3>
                    <div className={styles.cardActions}>
                      <button className={styles.iconBtn} onClick={() => {
                        setEditingId(budget.id);
                        setBudgetForm({ categoryId: budget.categoryId, amount: budget.amount.toString() });
                        setIsBudgetModalOpen(true);
                      }}>
                        <Edit3 size={16} />
                      </button>
                      <button className={styles.iconBtn} onClick={() => deleteBudget(budget.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={styles.amounts}>
                    <span className={styles.spentAmount}>R$ {budget.spent.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    <span className={styles.totalAmount}> / R$ {budget.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className={styles.progressBarBg}>
                    <div 
                      className={`${styles.progressBarFill} ${isOver ? styles.progressOver : progress > 80 ? styles.progressWarning : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className={styles.cardFooter}>
                    {isOver ? (
                      <span className={styles.statusDanger}>
                        <AlertTriangle size={14} /> Excedeu R$ {Math.abs(remaining).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </span>
                    ) : (
                      <span className={styles.statusSafe}>
                        Disponível: R$ {remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </span>
                    )}
                    <span className={styles.percentage}>{progress.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        // GOALS VIEW
        <div className={styles.grid}>
          {goals.length === 0 ? (
            <div className={styles.emptyState}>Nenhuma meta definida.</div>
          ) : (
            goals.map(goal => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const remaining = goal.targetAmount - goal.currentAmount;
              const isCompleted = progress >= 100;

              return (
                <div key={goal.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className={styles.colorDot} style={{ backgroundColor: goal.color }} />
                      <h3 className={styles.cardTitle}>{goal.name}</h3>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.iconBtn} onClick={() => {
                        setEditingId(goal.id);
                        setGoalForm({
                          name: goal.name,
                          targetAmount: goal.targetAmount.toString(),
                          currentAmount: goal.currentAmount.toString(),
                          targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
                          color: goal.color
                        });
                        setIsGoalModalOpen(true);
                      }}>
                        <Edit3 size={16} />
                      </button>
                      <button className={styles.iconBtn} onClick={() => deleteGoal(goal.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className={styles.amounts}>
                    <span className={styles.spentAmount}>R$ {goal.currentAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    <span className={styles.totalAmount}> / R$ {goal.targetAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className={styles.progressBarBg}>
                    <div 
                      className={styles.progressBarFill}
                      style={{ width: `${progress}%`, backgroundColor: isCompleted ? 'var(--positive-color)' : goal.color }}
                    />
                  </div>

                  <div className={styles.cardFooter}>
                    {isCompleted ? (
                      <span className={styles.statusSafe}>🎉 Meta Alcançada!</span>
                    ) : (
                      <span className={styles.statusSafe}>
                        Falta: R$ {remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </span>
                    )}
                    <span className={styles.percentage}>{progress.toFixed(1)}%</span>
                  </div>

                  {!isCompleted && (
                    <div className={styles.quickAdd}>
                      <button onClick={() => addProgressToGoal(goal.id, goal.currentAmount, 50)}>+ R$50</button>
                      <button onClick={() => addProgressToGoal(goal.id, goal.currentAmount, 100)}>+ R$100</button>
                      <button onClick={() => addProgressToGoal(goal.id, goal.currentAmount, 500)}>+ R$500</button>
                    </div>
                  )}
                  
                  {goal.targetDate && (
                    <div className={styles.targetDate}>
                      Alvo: {new Date(goal.targetDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* BUDGET MODAL */}
      {isBudgetModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>
                {editingId ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h3>
              <button onClick={() => setIsBudgetModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!editingId && (
                <div>
                  <label className={styles.formLabel}>Categoria (Despesa)</label>
                  <select 
                    className={styles.formInput} 
                    value={budgetForm.categoryId} 
                    onChange={e => setBudgetForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione uma categoria...</option>
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={styles.formLabel}>Limite Mensal (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  className={styles.formInput} 
                  value={budgetForm.amount} 
                  onChange={e => setBudgetForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className={styles.addButton} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
                Salvar Orçamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GOAL MODAL */}
      {isGoalModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>
                {editingId ? 'Editar Meta' : 'Nova Meta'}
              </h3>
              <button onClick={() => setIsGoalModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={styles.formLabel}>Nome da Meta</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={goalForm.name} 
                  onChange={e => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Ex: Viagem, Carro Novo..."
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className={styles.formLabel}>Valor Alvo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className={styles.formInput} 
                    value={goalForm.targetAmount} 
                    onChange={e => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className={styles.formLabel}>Valor Atual (Opcional)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className={styles.formInput} 
                    value={goalForm.currentAmount} 
                    onChange={e => setGoalForm(prev => ({ ...prev, currentAmount: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className={styles.formLabel}>Data Alvo (Opcional)</label>
                  <input 
                    type="date" 
                    className={styles.formInput} 
                    value={goalForm.targetDate} 
                    onChange={e => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Cor</label>
                  <input 
                    type="color" 
                    className={styles.formInput} 
                    style={{ padding: '0.2rem', height: '42px', width: '60px' }}
                    value={goalForm.color} 
                    onChange={e => setGoalForm(prev => ({ ...prev, color: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className={styles.addButton} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
                Salvar Meta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
