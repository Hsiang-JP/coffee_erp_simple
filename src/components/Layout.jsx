import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/store';
import { useTranslation } from 'react-i18next';

const Layout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isDevMode = useStore((state) => state.isDevMode);
  const toggleDevMode = useStore((state) => state.toggleDevMode);

  // Use URLSearchParams on location.search from React Router
  const searchParams = new URLSearchParams(location.search);
  const isDevUrl = searchParams.get('dev')?.toLowerCase() === 'true';
  const isDevPage = location.pathname === '/dev'; 
  const showDevToggle = true;

  const navItems = [
    { name: t('nav.coffeeJourney'), path: '/' },
    { name: t('nav.allocation'), path: '/allocation' },
    { name: t('nav.qcReports'), path: '/qc' },
    { name: t('nav.dataEntry'), path: '/entry' },
  ];

  if (isDevUrl || isDevPage) {
    // Navigate to current path with the dev=true param preserved if we are already on a dev-enabled route
    navItems.push({ name: t('nav.adminConsole'), path: '/?dev=true' });
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es-PE' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col relative">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold tracking-tighter text-emerald-900 uppercase italic">{t('nav.title')}</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-emerald-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button
                  onClick={toggleLanguage}
                  className="px-3 py-1.5 rounded-xl transition-all border bg-white border-stone-200 text-stone-600 hover:border-emerald-500 hover:text-emerald-600 text-xs font-bold uppercase tracking-wider"
                  title="Toggle Language"
                >
                  {i18n.language === 'en' ? 'ES' : 'EN'}
                </button>

                {/* DEV MODE TOGGLE - Moved to Navbar to avoid obscuring table rows */}
                {showDevToggle && (
                    <button
                        onClick={toggleDevMode}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${
                            isDevMode 
                                ? 'bg-stone-900 border-emerald-500 text-emerald-500 shadow-lg' 
                                : 'bg-white border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-600'
                        }`}
                        title="Toggle Management Mode"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.756 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.756 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.756 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.756 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.756 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.756 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.756 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest">{isDevMode ? t('nav.unlocked') : t('nav.locked')}</span>
                    </button>
                )}

                {isDevMode && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded animate-pulse uppercase tracking-widest border border-red-200">
                        {t('nav.admin')}
                    </span>
                )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
