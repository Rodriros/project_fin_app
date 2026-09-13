import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'pt-BR' | 'es';

interface Translations {
  [key: string]: {
    en: string;
    'pt-BR': string;
    es: string;
  };
}

const translations: Translations = {
  // Navigation
  nav_overview: { en: 'Overview', 'pt-BR': 'Visão Geral', es: 'Visión General' },
  nav_transactions: { en: 'Transactions', 'pt-BR': 'Transações', es: 'Transacciones' },
  nav_budgets: { en: 'Budgets & Goals', 'pt-BR': 'Metas & Orçamentos', es: 'Presupuestos y Metas' },
  nav_reports: { en: 'Reports (DRE)', 'pt-BR': 'Relatórios (DRE)', es: 'Informes (DRE)' },
  nav_settings: { en: 'Settings', 'pt-BR': 'Configurações', es: 'Configuración' },
  nav_accounts: { en: 'Accounts', 'pt-BR': 'Contas', es: 'Cuentas' },
  
  // Dashboard
  update_title: { en: 'Update', 'pt-BR': 'Atualização', es: 'Actualización' },
  net_income_up: { en: 'Your net income increased', 'pt-BR': 'Seu saldo líquido aumentou', es: 'Tu saldo neto aumentó' },
  in_one_week: { en: 'in 1 week', 'pt-BR': 'em 1 semana', es: 'en 1 semana' },
  net_income: { en: 'Net Income', 'pt-BR': 'Saldo Líquido', es: 'Saldo Neto' },
  total_expenses: { en: 'Total Expenses', 'pt-BR': 'Despesas Totais', es: 'Gastos Totales' },
  from_last_month: { en: 'from last month', 'pt-BR': 'desde o último mês', es: 'desde el mes pasado' },
  revenue_expenses: { en: 'Revenue & Expenses', 'pt-BR': 'Receitas x Despesas', es: 'Ingresos vs Gastos' },
  income_label: { en: 'Income', 'pt-BR': 'Receita', es: 'Ingresos' },
  expense_label: { en: 'Expenses', 'pt-BR': 'Despesa', es: 'Gastos' },
  expenses_by_category: { en: 'Expenses by Category', 'pt-BR': 'Despesas por Categoria', es: 'Gastos por Categoría' },
  filter_monthly: { en: 'Monthly', 'pt-BR': 'Mensal', es: 'Mensual' },
  filter_custom: { en: 'Custom', 'pt-BR': 'Personalizado', es: 'Personalizado' },
  export_btn: { en: 'Export', 'pt-BR': 'Exportar', es: 'Exportar' },
  
  // Transactions
  new_transaction: { en: 'New Transaction', 'pt-BR': 'Nova Transação', es: 'Nueva Transacción' },
  edit_transaction: { en: 'Edit Transaction', 'pt-BR': 'Editar Transação', es: 'Editar Transacción' },
  recent_transactions: { en: 'Recent Transactions', 'pt-BR': 'Transações Recentes', es: 'Transacciones Recientes' },
  import_csv: { en: 'Import Statement', 'pt-BR': 'Importar Extrato', es: 'Importar Extracto' },
  import_statement: { en: 'Import Statement', 'pt-BR': 'Importar Extrato', es: 'Importar Extracto' },
  add_new: { en: 'New Transaction', 'pt-BR': 'Nova Transação', es: 'Nueva Transacción' },
  filters: { en: 'Filters', 'pt-BR': 'Filtros', es: 'Filtros' },
  apply_filters: { en: 'Apply Filters', 'pt-BR': 'Aplicar Filtros', es: 'Aplicar Filtros' },
  clear_filters: { en: 'Clear Filters', 'pt-BR': 'Limpar Filtros', es: 'Limpiar Filtros' },
  delete_selected: { en: 'Delete Selected', 'pt-BR': 'Excluir Selecionadas', es: 'Eliminar Seleccionadas' },
  col_description: { en: 'Description', 'pt-BR': 'Descrição', es: 'Descripción' },
  col_category: { en: 'Category', 'pt-BR': 'Categoria', es: 'Categoría' },
  col_account: { en: 'Account', 'pt-BR': 'Conta', es: 'Cuenta' },
  col_date: { en: 'Date', 'pt-BR': 'Data', es: 'Fecha' },
  col_status: { en: 'Status', 'pt-BR': 'Status', es: 'Estado' },
  col_amount: { en: 'Amount', 'pt-BR': 'Valor', es: 'Monto' },
  col_actions: { en: 'Actions', 'pt-BR': 'Ações', es: 'Acciones' },
  status_completed: { en: 'Completed', 'pt-BR': 'Concluído', es: 'Completado' },
  status_pending: { en: 'Pending', 'pt-BR': 'Pendente', es: 'Pendiente' },
  no_transactions_found: { en: 'No transactions found', 'pt-BR': 'Nenhuma transação encontrada', es: 'No se encontraron transacciones' },
  select_account: { en: 'Select an account', 'pt-BR': 'Selecione uma conta', es: 'Seleccione una cuenta' },
  select_category: { en: 'Select a category', 'pt-BR': 'Selecione uma categoria', es: 'Seleccione una categoría' },
  all_accounts: { en: 'All accounts', 'pt-BR': 'Todas as contas', es: 'Todas las cuentas' },
  uncategorized: { en: 'Uncategorized', 'pt-BR': 'Sem Categoria', es: 'Sin Categoría' },
  
  // Import Preview & Invoice Payment Handling
  review_import: { en: 'Review Import', 'pt-BR': 'Revisar Importação', es: 'Revisar Importación' },
  save_all: { en: 'Save All', 'pt-BR': 'Salvar Tudo', es: 'Guardar Todo' },
  cancel: { en: 'Cancel', 'pt-BR': 'Cancelar', es: 'Cancelar' },
  apply_account_all: { en: 'Apply Account to all:', 'pt-BR': 'Aplicar Conta a todas:', es: 'Aplicar Cuenta a todas:' },
  apply_category_all: { en: 'Apply Category to all:', 'pt-BR': 'Aplicar Categoria a todas:', es: 'Aplicar Categoría a todas:' },
  new_category: { en: 'New Category', 'pt-BR': 'Nova Categoria', es: 'Nueva Categoría' },
  invoice_payment_detected: { en: 'Bill Payment (Ignore)', 'pt-BR': 'Pagamento de Fatura (Não contabilizar)', es: 'Pago de Factura (No contabilizar)' },
  invoice_payment_banner: { 
    en: 'We detected bill payment entries that should not be counted as expenses.', 
    'pt-BR': 'Identificamos lançamentos de pagamento de fatura que não devem ser contabilizados como despesa.',
    es: 'Identificamos pagos de factura que no deben contabilizarse como gastos.'
  },
  btn_exclude_invoice_payments: { en: 'Remove Detected Bill Payments', 'pt-BR': 'Excluir Pagamentos de Fatura Detectados', es: 'Eliminar Pagos de Factura Detectados' },
  delete_row_tooltip: { en: 'Remove this transaction from import', 'pt-BR': 'Remover esta transação da importação', es: 'Eliminar esta transacción de la importación' },
  
  // Settings
  language_settings: { en: 'Language Settings', 'pt-BR': 'Idioma', es: 'Idioma' },
  select_language: { en: 'Select Interface Language', 'pt-BR': 'Selecione o Idioma da Interface', es: 'Seleccione el Idioma de la Interfaz' },
  categories_settings: { en: 'Manage Categories', 'pt-BR': 'Gerenciar Categorias', es: 'Administrar Categorías' },
  type_income: { en: 'Income', 'pt-BR': 'Receita', es: 'Ingreso' },
  type_expense: { en: 'Expense', 'pt-BR': 'Despesa', es: 'Gasto' },
  type_transfer: { en: 'Transfer', 'pt-BR': 'Transferência', es: 'Transferencia' },
  col_source_account: { en: 'Source Account', 'pt-BR': 'Conta de Origem', es: 'Cuenta de Origen' },
  col_destination_account: { en: 'Destination Account', 'pt-BR': 'Conta de Destino', es: 'Cuenta de Destino' },
  destination_account_required: { en: 'Destination account is required', 'pt-BR': 'Selecione a conta de destino', es: 'Seleccione la cuenta de destino' },
  different_accounts_required: { en: 'Origin and destination accounts must be different', 'pt-BR': 'A conta de destino deve ser diferente da conta de origem', es: 'Las cuentas de origen y destino deben ser diferentes' },
  transfer_tag: { en: 'Transfer', 'pt-BR': 'Transferência', es: 'Transferencia' },
  btn_convert_to_transfer: { en: 'Convert to Transfer', 'pt-BR': 'Converter em Transferência', es: 'Convertir a Transferencia' },
  dre_transfers: { en: 'Transfers between accounts', 'pt-BR': 'Transferências entre Contas', es: 'Transferencias entre Cuentas' },
  general_settings: { en: 'General Settings', 'pt-BR': 'Configurações Gerais', es: 'Configuración General' },
  trash_title: { en: 'Transactions Trash', 'pt-BR': 'Lixeira de Transações', es: 'Papelera de Transacciones' },
  restore_selected: { en: 'Restore Selected', 'pt-BR': 'Restaurar Selecionadas', es: 'Restaurar Seleccionadas' },
  
  // Accounts
  my_accounts: { en: 'My Accounts', 'pt-BR': 'Minhas Contas', es: 'Mis Cuentas' },
  new_account: { en: 'New Account', 'pt-BR': 'Nova Conta', es: 'Nueva Cuenta' },
  edit_account: { en: 'Edit Account', 'pt-BR': 'Editar Conta', es: 'Editar Cuenta' },
  account_name: { en: 'Account Name', 'pt-BR': 'Nome da Conta', es: 'Nombre de la Cuenta' },
  account_type: { en: 'Account Type', 'pt-BR': 'Tipo de Conta', es: 'Tipo de Cuenta' },
  balance: { en: 'Balance', 'pt-BR': 'Saldo', es: 'Saldo' },
  btn_save: { en: 'Save', 'pt-BR': 'Salvar', es: 'Guardar' },
  btn_cancel: { en: 'Cancel', 'pt-BR': 'Cancelar', es: 'Cancelar' },
  delete_confirm: { en: 'Are you sure you want to delete this account?', 'pt-BR': 'Tem certeza que deseja excluir esta conta?', es: '¿Está seguro de que desea eliminar esta cuenta?' },
  type_checking: { en: 'Checking Account', 'pt-BR': 'Conta Corrente', es: 'Cuenta Corriente' },
  type_credit: { en: 'Credit Card', 'pt-BR': 'Cartão de Crédito', es: 'Tarjeta de Crédito' },
  type_savings: { en: 'Savings', 'pt-BR': 'Poupança', es: 'Caja de Ahorros' },
  type_cash: { en: 'Cash', 'pt-BR': 'Dinheiro / Carteira', es: 'Efectivo / Billetera' },
  type_other: { en: 'Other (Specify)', 'pt-BR': 'Outro (Especificar)', es: 'Otro (Especificar)' },
  custom_type: { en: 'Custom Type', 'pt-BR': 'Tipo Personalizado', es: 'Tipo Personalizado' },
  
  // DRE
  dre_title: { en: 'Income Statement (DRE)', 'pt-BR': 'Demonstrativo de Resultado (DRE)', es: 'Estado de Resultados (DRE)' },
  dre_revenues: { en: 'Revenues', 'pt-BR': 'Receitas', es: 'Ingresos' },
  dre_expenses: { en: 'Expenses', 'pt-BR': 'Despesas', es: 'Gastos' },
  dre_net_result: { en: 'Net Result', 'pt-BR': 'Resultado Líquido', es: 'Resultado Neto' },
};

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations | string) => string;
}

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
      name: 'finrod-i18n',
    }
  )
);
