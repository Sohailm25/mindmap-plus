import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiList, FiPlus, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import logger from '../../utils/logger';

// Mock data for canvas list
const mockCanvases = [
  { id: 'canvas-1', title: 'Understanding Climate Change', createdAt: '2023-04-15T10:30:00Z' },
  { id: 'canvas-2', title: 'Future of AI', createdAt: '2023-04-14T14:22:00Z' },
  { id: 'canvas-3', title: 'Personal Growth Goals', createdAt: '2023-04-12T09:15:00Z' },
  { id: 'canvas-4', title: 'Business Strategy Planning', createdAt: '2023-04-10T16:45:00Z' },
];

interface LeftSidebarProps {
  currentCanvasId?: string;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ currentCanvasId }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [canvases, setCanvases] = useState(mockCanvases);
  const [filteredCanvases, setFilteredCanvases] = useState(mockCanvases);
  const navigate = useNavigate();

  useEffect(() => {
    // Filter canvases based on search query
    if (searchQuery.trim() === '') {
      setFilteredCanvases(canvases);
    } else {
      const filtered = canvases.filter(canvas => 
        canvas.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCanvases(filtered);
      logger.debug('Filtered canvases based on search query', { query: searchQuery, results: filtered.length });
    }
  }, [searchQuery, canvases]);

  const handleNewCanvas = () => {
    navigate('/');
    logger.info('User clicked on New Mindmap button');
  };

  if (isCollapsed) {
    return (
      <div className="relative h-full bg-white shadow-sm w-12 transition-all duration-300 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-6 bg-white rounded-full p-1 shadow-md text-gray-500 hover:text-indigo-600"
          aria-label="Expand sidebar"
        >
          <FiChevronRight size={16} />
        </button>
        <div className="mt-8 flex flex-col items-center space-y-6">
          <button
            onClick={handleNewCanvas}
            className="p-2 text-gray-600 hover:text-indigo-600"
            title="New Mindmap"
          >
            <FiPlus size={20} />
          </button>
          <button
            className="p-2 text-gray-600 hover:text-indigo-600"
            title="View Mindmaps"
          >
            <FiList size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-white shadow-sm w-64 transition-all duration-300">
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Your Mindmaps</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-500 hover:text-indigo-600"
            aria-label="Collapse sidebar"
          >
            <FiChevronLeft size={20} />
          </button>
        </div>
        <button
          onClick={handleNewCanvas}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center mb-4"
        >
          <FiPlus size={16} className="mr-2" />
          New Mindmap
        </button>
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            placeholder="Search mindmaps..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-8rem)] pb-4">
        {filteredCanvases.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            {searchQuery ? 'No mindmaps found.' : 'You have no mindmaps yet.'}
          </div>
        ) : (
          <ul className="space-y-1 px-2">
            {filteredCanvases.map((canvas) => (
              <li key={canvas.id}>
                <Link
                  to={`/canvas/${canvas.id}`}
                  className={`block px-3 py-2 rounded-md ${
                    currentCanvasId === canvas.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">{canvas.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(canvas.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar; 