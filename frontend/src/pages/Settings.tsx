import React from 'react';
import { useI18nStore } from '../i18n';
import { useCategories } from '../hooks/useCategories';
import styles from './Settings.module.css';

const Settings: React.FC = () => {
  const { language, setLanguage, t } = useI18nStore();
  const { categories, loading } = useCategories();

  return (
    <div className={styles.settingsPage}>
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
        <h3 className={styles.sectionTitle}>{t('categories_settings')}</h3>
        <div className={styles.categoryList}>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : categories.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No categories found</div>
          ) : (
            categories.map((cat, idx) => (
              <div key={idx} className={styles.categoryItem}>
                <span className={styles.settingLabel}>{cat.name}</span>
                <span className={styles.categoryBadge} style={{
                  backgroundColor: cat.type === 'INCOME' ? 'var(--positive-bg)' : 'var(--negative-bg)',
                  color: cat.type === 'INCOME' ? 'var(--positive-color)' : 'var(--negative-color)'
                }}>
                  {cat.type === 'INCOME' ? t('type_income') : t('type_expense')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
