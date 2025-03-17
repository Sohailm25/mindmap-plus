import { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiX, FiDownload, FiShare2, FiFileText } from 'react-icons/fi';
import logger from '../../utils/logger';
import { SynthesisArtifact, Summary } from '../../types';
import { summaryApi } from '../../services/api';

interface RightSidebarProps {
  currentCanvasId?: string;
  onSynthesizeClick?: () => void;
  artifacts?: SynthesisArtifact[];
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  currentCanvasId, 
  onSynthesizeClick,
  artifacts = []
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedArtifactId, setExpandedArtifactId] = useState<string | null>(null);
  const [expandedSummaryIndex, setExpandedSummaryIndex] = useState<number | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Fetch summaries when canvas changes
  useEffect(() => {
    if (currentCanvasId) {
      fetchSummaries();
    }
  }, [currentCanvasId]);

  const fetchSummaries = async () => {
    if (!currentCanvasId) return;
    
    try {
      const response = await summaryApi.getSummaries(currentCanvasId);
      
      if (response.success && response.data) {
        setSummaries(response.data.summaries || []);
        logger.info('Fetched summaries successfully', { count: response.data.summaries?.length || 0 });
      } else {
        logger.error('Failed to fetch summaries', { error: response.error });
        setSummaryError('Failed to load summaries');
      }
    } catch (error) {
      logger.error('Error fetching summaries', error);
      setSummaryError('Failed to load summaries');
    }
  };

  const handleGenerateSummary = async () => {
    if (!currentCanvasId) return;
    
    setIsGeneratingSummary(true);
    setSummaryError(null);
    
    try {
      const response = await summaryApi.generateSummary(currentCanvasId);
      
      if (response.success && response.data) {
        // Add the new summary to the list
        setSummaries(prev => [...prev, response.data.summary]);
        logger.info('Generated summary successfully');
        
        // Expand the newly created summary
        setExpandedSummaryIndex(summaries.length);
      } else {
        logger.error('Failed to generate summary', { error: response.error });
        setSummaryError(response.error || 'Failed to generate summary');
      }
    } catch (error) {
      logger.error('Error generating summary', error);
      setSummaryError('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDeleteSummary = async (summaryIndex: number) => {
    if (!currentCanvasId) return;
    
    try {
      const response = await summaryApi.deleteSummary(currentCanvasId, summaryIndex);
      
      if (response.success) {
        // Remove the summary from the list
        setSummaries(prev => prev.filter((_, index) => index !== summaryIndex));
        logger.info('Deleted summary successfully');
        
        // Reset expanded summary if it was the one deleted
        if (expandedSummaryIndex === summaryIndex) {
          setExpandedSummaryIndex(null);
        }
      } else {
        logger.error('Failed to delete summary', { error: response.error });
      }
    } catch (error) {
      logger.error('Error deleting summary', error);
    }
  };

  const toggleArtifactExpand = (artifactId: string) => {
    if (expandedArtifactId === artifactId) {
      setExpandedArtifactId(null);
    } else {
      setExpandedArtifactId(artifactId);
      logger.debug('Expanded artifact', { artifactId });
    }
  };

  const toggleSummaryExpand = (index: number) => {
    if (expandedSummaryIndex === index) {
      setExpandedSummaryIndex(null);
    } else {
      setExpandedSummaryIndex(index);
      logger.debug('Expanded summary', { index });
    }
  };

  const handleExportArtifact = (artifact: SynthesisArtifact) => {
    try {
      // Create a blob with the content
      const blob = new Blob([`# ${artifact.title}\n\n${artifact.content}`], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.title.replace(/\s+/g, '-').toLowerCase()}-${artifact.id}.md`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.info('Exported artifact', { artifactId: artifact.id });
    } catch (error) {
      logger.error('Error exporting artifact', error);
    }
  };

  const handleExportSummary = (summary: Summary) => {
    try {
      // Create a blob with the content
      const blob = new Blob([`# ${summary.title}\n\n${summary.content}`], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.title.replace(/\s+/g, '-').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.info('Exported summary');
    } catch (error) {
      logger.error('Error exporting summary', error);
    }
  };

  if (isCollapsed) {
    return (
      <div className="relative h-full bg-white shadow-sm w-12 transition-all duration-300 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute -left-3 top-6 bg-white rounded-full p-1 shadow-md text-gray-500 hover:text-indigo-600"
          aria-label="Expand sidebar"
        >
          <FiChevronLeft size={16} />
        </button>
        <div className="mt-8 flex flex-col items-center space-y-6">
          <button
            onClick={onSynthesizeClick}
            className="p-2 text-gray-600 hover:text-indigo-600"
            title="Synthesize Insights"
          >
            <FiPlus size={20} />
          </button>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || !currentCanvasId}
            className="p-2 text-gray-600 hover:text-indigo-600 disabled:opacity-50"
            title="Generate Summary"
          >
            <FiFileText size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-white shadow-sm w-72 transition-all duration-300">
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Synthesis</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-gray-500 hover:text-indigo-600"
            aria-label="Collapse sidebar"
          >
            <FiChevronRight size={20} />
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={onSynthesizeClick}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
          >
            <FiPlus size={16} className="mr-2" />
            Synthesize Insights
          </button>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || !currentCanvasId}
            className="w-full py-2 px-4 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md hover:bg-indigo-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiFileText size={16} className="mr-2" />
            {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
          </button>
          {summaryError && (
            <div className="text-red-500 text-xs text-center">{summaryError}</div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-8rem)] px-4 pb-4">
        {/* Summaries Section */}
        {summaries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Summaries</h3>
            <div className="space-y-3">
              {summaries.map((summary, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                >
                  <div 
                    className="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleSummaryExpand(index)}
                  >
                    <h4 className="font-medium text-gray-800 truncate">{summary.title}</h4>
                    <span className="text-gray-500 text-xs">
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {expandedSummaryIndex === index && (
                    <div className="px-4 py-3">
                      <p className="text-gray-700 text-sm whitespace-pre-line mb-3">{summary.content}</p>
                      <div className="flex justify-between space-x-2">
                        <button 
                          className="text-red-600 hover:text-red-800 text-xs"
                          onClick={() => handleDeleteSummary(index)}
                        >
                          Delete
                        </button>
                        <button 
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                          onClick={() => handleExportSummary(summary)}
                        >
                          <FiDownload size={14} className="mr-1" />
                          Export
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artifacts Section */}
        <h3 className="text-sm font-medium text-gray-500 mb-3">Artifacts</h3>
        
        {artifacts.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            No synthesis artifacts yet.
          </div>
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <div 
                key={artifact.id} 
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                <div 
                  className="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleArtifactExpand(artifact.id)}
                >
                  <h4 className="font-medium text-gray-800 truncate">{artifact.title}</h4>
                  <span className="text-gray-500 text-xs">
                    {new Date(artifact.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {expandedArtifactId === artifact.id && (
                  <div className="px-4 py-3">
                    <p className="text-gray-700 text-sm whitespace-pre-line mb-3">{artifact.content}</p>
                    <div className="flex justify-end space-x-2">
                      <button 
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                        onClick={() => handleExportArtifact(artifact)}
                      >
                        <FiDownload size={14} className="mr-1" />
                        Export
                      </button>
                      <button 
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                        onClick={() => {
                          // In a real app, we would implement sharing functionality
                          logger.info('Share button clicked', { artifactId: artifact.id });
                        }}
                      >
                        <FiShare2 size={14} className="mr-1" />
                        Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar; 