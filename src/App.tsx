import { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import MindMapCanvas from './components/canvas/MindMapCanvas';
import logger from './utils/logger';

function App() {
  const [query, setQuery] = useState<string>('');
  const [currentCanvasId, setCurrentCanvasId] = useState<string | undefined>(undefined);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const handleCreateNewCanvas = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      logger.warn('Empty query submitted');
      return;
    }
    
    logger.info('Creating new canvas with query', { query });
    setIsCreatingNew(true);
    setCurrentCanvasId(undefined);
  };

  const handleCanvasSelected = (canvasId: string) => {
    logger.info('Selecting existing canvas', { canvasId });
    setCurrentCanvasId(canvasId);
    setIsCreatingNew(false);
    setQuery('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">MindMap+</h1>
          
          {/* New Canvas Form */}
          <form onSubmit={handleCreateNewCanvas} className="flex-1 max-w-2xl mx-4">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a question or topic to explore..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 px-4 text-white bg-indigo-600 rounded-r-md hover:bg-indigo-700"
              >
                Create
              </button>
            </div>
          </form>
          
          <div>
            {/* User profile or additional actions could go here */}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <MindMapCanvas 
            initialQuery={isCreatingNew ? query : undefined} 
            canvasId={currentCanvasId}
          />
        </ReactFlowProvider>
      </main>
    </div>
  );
}

export default App;
