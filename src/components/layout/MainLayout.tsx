import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';

interface MainLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, showNav = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logger.info('User logged out (simulated)');
    // In a real app, we would call an API to log out
    // For now, just redirect to the auth page
    navigate('/auth');
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {showNav && (
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-indigo-600">
                    MindMap+
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className={`${
                      location.pathname === '/'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Home
                  </Link>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      
      <main className="flex-grow">{children}</main>
      
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} MindMap+. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout; 