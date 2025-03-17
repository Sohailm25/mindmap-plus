import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import logger from '../utils/logger';

const CanvasPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('query');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Log canvas initialization
    logger.info('Initializing canvas', { id, initialQuery });
    
    // Simulate loading canvas data
    const loadCanvas = async () => {
      try {
        // In a real app, we would fetch canvas data from an API
        // For now, just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
        logger.info('Canvas loaded successfully', { id });
      } catch (error) {
        logger.error('Error loading canvas', { id, error });
        setIsLoading(false);
      }
    };
    
    loadCanvas();
  }, [id, initialQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Loading your mindmap...</h2>
          <p className="mt-2 text-gray-500">This will just take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900">Canvas: {id}</h1>
        {initialQuery && (
          <p className="mt-2 text-gray-700">Initial Query: {initialQuery}</p>
        )}
        
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
          <p className="text-gray-500">
            This is a placeholder for the canvas interface. We will implement the full React Flow canvas here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CanvasPage; 