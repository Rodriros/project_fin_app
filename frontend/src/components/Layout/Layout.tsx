import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, PieChart, Settings, Sun, Moon, Wallet, LogOut, Target } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useI18nStore } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { isDark, toggleTheme } = useThemeStore();
  const { t } = useI18nStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: t('nav_overview'), path: '/', icon: <LayoutDashboard size={20} /> },
    { name: t('nav_transactions'), path: '/transactions', icon: <Receipt size={20} /> },
    { name: 'Metas & Orçamentos', path: '/budgets', icon: <Target size={20} /> },
    { name: t('nav_reports'), path: '/reports', icon: <PieChart size={20} /> },
    { name: t('nav_accounts'), path: '/accounts', icon: <Wallet size={20} /> },
    { name: t('nav_settings'), path: '/settings', icon: <Settings size={20} /> },
  ];

  const getPageTitle = () => {
    const currentLink = navLinks.find(link => link.path === location.pathname);
    return currentLink ? currentLink.name : '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
            {/* User Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' }}>
              <div style={{ 
                width: 36, height: 36, borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 600, fontSize: '0.85rem'
              }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span style={{ fontWeight: 500 }}>{user?.name || 'Usuário'}</span>
              <button 
                className={styles.iconBtn} 
                onClick={handleLogout} 
                title="Sair"
                id="btn-logout"
              >
                <LogOut size={18} />
              </button>
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
