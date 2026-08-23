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
  nav_accounts: { en: 'Accounts', 'pt-BR': 'Contas' },
  
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
  
  // Accounts
  my_accounts: { en: 'My Accounts', 'pt-BR': 'Minhas Contas' },
  new_account: { en: 'New Account', 'pt-BR': 'Nova Conta' },
  edit_account: { en: 'Edit Account', 'pt-BR': 'Editar Conta' },
  account_name: { en: 'Account Name', 'pt-BR': 'Nome da Conta' },
  account_type: { en: 'Account Type', 'pt-BR': 'Tipo de Conta' },
  balance: { en: 'Balance', 'pt-BR': 'Saldo' },
  btn_save: { en: 'Save', 'pt-BR': 'Salvar' },
  btn_cancel: { en: 'Cancel', 'pt-BR': 'Cancelar' },
  delete_confirm: { en: 'Are you sure you want to delete this account?', 'pt-BR': 'Tem certeza que deseja excluir esta conta?' },
  type_checking: { en: 'Checking Account', 'pt-BR': 'Conta Corrente' },
  type_credit: { en: 'Credit Card', 'pt-BR': 'Cartão de Crédito' },
  type_savings: { en: 'Savings', 'pt-BR': 'Poupança' },
  type_cash: { en: 'Cash', 'pt-BR': 'Dinheiro / Carteira' },
  type_other: { en: 'Other (Specify)', 'pt-BR': 'Outro (Especificar)' },
  custom_type: { en: 'Custom Type', 'pt-BR': 'Tipo Personalizado' },
  
  // DRE
  dre_title: { en: 'Income Statement (DRE)', 'pt-BR': 'Demonstrativo de Resultado (DRE)' },
  dre_revenues: { en: 'Revenues', 'pt-BR': 'Receitas' },
  dre_expenses: { en: 'Expenses', 'pt-BR': 'Despesas' },
  dre_net_result: { en: 'Net Result', 'pt-BR': 'Resultado Líquido' },
};

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

import { persist } from 'zustand/middleware';

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'pt-BR', // Default to Portuguese
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const lang = get().language;
        return translations[key as string]?.[lang] || key as string;
      },
    }),
    {
      name: 'finapp-i18n',
    }
  )
);
