import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, PieChart, Settings, Sun, Moon, Wallet, LogOut, Target, Clover } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useI18nStore } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { InstallPrompt } from '../PWA/InstallPrompt';
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
    { name: t('nav_budgets'), path: '/budgets', icon: <Target size={20} /> },
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
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Clover size={26} strokeWidth={2.4} />
          </div>
          FinRod APP
        </div>
        
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.navIconContainer}>{link.icon}</div>
              <span className={styles.navText}>{link.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Topbar */}
        <header className={styles.topbar}>
          {/* Mobile Logo Brand */}
          <div className={styles.mobileLogo}>
            <div className={styles.logoIcon}>
              <Clover size={22} strokeWidth={2.4} />
            </div>
            <span className={styles.mobileBrandName}>FinRod APP</span>
          </div>

          <div className={styles.pageTitle}>{getPageTitle()}</div>
          
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle Theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* User Profile */}
            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className={styles.userName}>{user?.name || 'Usuário'}</span>
              <button 
                className={styles.iconBtn} 
                onClick={handleLogout} 
                title="Sair"
                id="btn-logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className={styles.contentArea}>
          <Outlet />
        </div>
      </main>

      {/* PWA Mobile Installation Prompt */}
      <InstallPrompt />
    </div>
  );
};

export default Layout;
