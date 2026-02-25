import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/store';

const Layout = ({ children }) => {
  const location = useLocation();
  const isDevMode = useStore((state) => state.isDevMode);
  const toggleDevMode = useStore((state) => state.toggleDevMode);

  // Agent 3: Check for ?dev=true in URL (Case-Insensitive) or /dev path
  const searchParams = new URLSearchParams(window.location.search);
  const isDevUrl = searchParams.get('dev')?.toLowerCase() === 'true';
  const isDevPage = location.pathname === '/dev' || location.pathname === '/'; // Including / since home can be dev view
  const showDevToggle = true;

  const navItems = [
    { name: 'Coffee Journey', path: '/' },
    { name: 'Allocation', path: '/allocation' },
    { name: 'QC Reports', path: '/qc' },
    { name: 'Data Entry', path: '/entry' },

  ];

  if (isDevUrl) {
    navItems.push({ name: 'Admin Console', path: '/?dev=true' });
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col relative">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold tracking-tighter text-emerald-900 uppercase italic">Green Coffee ERP</span>
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
                        <span className="text-[10px] font-black uppercase tracking-widest">{isDevMode ? 'Unlocked' : 'Locked'}</span>
                    </button>
                )}

                {isDevMode && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded animate-pulse uppercase tracking-widest border border-red-200">
                        Admin
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
