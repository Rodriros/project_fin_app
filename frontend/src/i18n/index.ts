import { create } from 'zustand';

type Language = 'en' | 'pt-BR';

interface Translations {
  [key: string]: {
    en: string;
    'pt-BR': string;
  };
}

const translations: Translations = {
  // Navigation
  nav_overview: { en: 'Overview', 'pt-BR': 'Visão Geral' },
  nav_transactions: { en: 'Transactions', 'pt-BR': 'Transações' },
  nav_reports: { en: 'Reports (DRE)', 'pt-BR': 'Relatórios (DRE)' },
  nav_settings: { en: 'Settings', 'pt-BR': 'Configurações' },
  
  // Dashboard
  update_title: { en: 'Update', 'pt-BR': 'Atualização' },
  net_income_up: { en: 'Your net income increased', 'pt-BR': 'Seu saldo líquido aumentou' },
  in_one_week: { en: 'in 1 week', 'pt-BR': 'em 1 semana' },
  net_income: { en: 'Net Income', 'pt-BR': 'Saldo Líquido' },
  total_expenses: { en: 'Total Expenses', 'pt-BR': 'Despesas Totais' },
  from_last_month: { en: 'from last month', 'pt-BR': 'desde o último mês' },
  revenue_expenses: { en: 'Revenue & Expenses', 'pt-BR': 'Receitas x Despesas' },
  income_label: { en: 'Income', 'pt-BR': 'Receita' },
  expense_label: { en: 'Expenses', 'pt-BR': 'Despesa' },
  expenses_by_category: { en: 'Expenses by Category', 'pt-BR': 'Despesas por Categoria' },
  
  // Transactions
  recent_transactions: { en: 'Recent Transactions', 'pt-BR': 'Transações Recentes' },
  import_csv: { en: 'Import CSV', 'pt-BR': 'Importar CSV' },
  add_new: { en: 'Add New', 'pt-BR': 'Nova Transação' },
  col_description: { en: 'Description', 'pt-BR': 'Descrição' },
  col_category: { en: 'Category', 'pt-BR': 'Categoria' },
  col_date: { en: 'Date', 'pt-BR': 'Data' },
  col_status: { en: 'Status', 'pt-BR': 'Status' },
  col_amount: { en: 'Amount', 'pt-BR': 'Valor' },
  status_completed: { en: 'Completed', 'pt-BR': 'Concluído' },
  status_pending: { en: 'Pending', 'pt-BR': 'Pendente' },
  
  // Settings
  language_settings: { en: 'Language Settings', 'pt-BR': 'Idioma' },
  categories_settings: { en: 'Manage Categories', 'pt-BR': 'Gerenciar Categorias' },
  type_income: { en: 'Income', 'pt-BR': 'Receita' },
  type_expense: { en: 'Expense', 'pt-BR': 'Despesa' },
};

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: 'pt-BR', // Default to Portuguese
  setLanguage: (lang) => set({ language: lang }),
  t: (key) => {
    const lang = get().language;
    return translations[key as string]?.[lang] || key as string;
  },
}));
