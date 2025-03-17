import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

const LandingPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!query.trim()) {
      logger.warn('Query is empty');
      return;
    }
    
    // Log the query
    logger.info('Starting new mindmap with query', { query });
    
    // Simulate API call
    setIsLoading(true);
    
    try {
      // In a real app, we would call an API here to create a new mindmap
      // For now, just simulate a delay
      setTimeout(() => {
        // Navigate to the canvas page with a temporary ID
        // In a real app, we would get the ID from the API response
        const tempId = 'new-' + Date.now();
        navigate(`/canvas/${tempId}?query=${encodeURIComponent(query)}`);
      }, 800);
    } catch (error) {
      logger.error('Error creating new mindmap', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MindMap+</h1>
          <p className="text-lg text-gray-600">
            Explore and expand your thoughts on an infinite canvas
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="query" className="sr-only">Your question or reflection</label>
            <textarea
              id="query"
              name="query"
              rows={4}
              className="shadow-sm block w-full border-gray-300 p-4 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              placeholder="Enter your question or reflection here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="text-center">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className={`py-3 px-6 rounded-md text-white text-lg font-medium ${
                isLoading || !query.trim() 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } transition-colors`}
            >
              {isLoading ? 'Creating your mindmap...' : 'Explore this thought'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LandingPage; 