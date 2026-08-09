import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, PieChart, Settings, Sun, Moon, Wallet } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useI18nStore } from '../../i18n';
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { isDark, toggleTheme } = useThemeStore();
  const { t } = useI18nStore();
  const location = useLocation();

  const navLinks = [
    { name: t('nav_overview'), path: '/', icon: <LayoutDashboard size={20} /> },
    { name: t('nav_transactions'), path: '/transactions', icon: <Receipt size={20} /> },
    { name: t('nav_reports'), path: '/reports', icon: <PieChart size={20} /> },
    { name: t('nav_accounts'), path: '/accounts', icon: <Wallet size={20} /> },
    { name: t('nav_settings'), path: '/settings', icon: <Settings size={20} /> },
  ];

  const getPageTitle = () => {
    const currentLink = navLinks.find(link => link.path === location.pathname);
    return currentLink ? currentLink.name : '';
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>✤</div>
          FinApp
        </div>
        
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              {link.icon}
              <span>{link.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>{getPageTitle()}</div>
          
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle Theme">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {/* User Profile Mock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--accent-lime)' }}></div>
              <span style={{ fontWeight: 500 }}>User</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className={styles.contentArea}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
