import { useState, useRef, useMemo, useCallback } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { 
  FiMaximize2, 
  FiMinimize2, 
  FiCheckSquare, 
  FiSquare, 
  FiMessageSquare, 
  FiEdit2, 
  FiSave, 
  FiX,
  FiPaperclip,
  FiLink,
  FiMaximize,
  FiMinimize,
  FiPlus
} from 'react-icons/fi';
import logger from '../../utils/logger';
import { Attachment, Source } from '../../types';
import { nodeApi } from '../../services/api';

// Define our custom data properties
interface ResponseNodeProps {
  id: string;
  content: string;
  query: string;
  isSelected: boolean;
  canvasId: string;
  isEdited?: boolean;
  originalContent?: string;
  lastEditedAt?: string;
  attachments?: Attachment[];
  sources?: Source[];
  onSelect: (id: string, selected: boolean) => void;
  onCreateCustomFollowUp?: (parentId: string) => void;
  onNodeUpdated?: (nodeId: string, newData: any) => void;
  onResize?: (nodeId: string, expanded: boolean) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onTopicClick?: (nodeId: string, topic: string) => void;
}

// Our component props now extend ReactFlow's NodeProps
// and specify our custom data type
const ResponseNode = ({ data, isConnectable }: NodeProps<ResponseNodeProps>) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [newSource, setNewSource] = useState({ text: '', url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { 
    id, 
    content, 
    query, 
    isSelected, 
    canvasId,
    isEdited, 
    attachments = [], 
    sources = [],
    onSelect, 
    onCreateCustomFollowUp,
    onNodeUpdated,
    onResize,
    onNodeHover,
    onTopicClick
  } = data;
  
  // Function to extract potential topics from content
  const extractTopics = (text: string): string[] => {
    // For a basic implementation, we'll identify capitalized terms that are likely to be topics
    // More sophisticated NLP could be integrated for better topic identification
    const potentialTopics = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    
    // Filter out common words and duplicates
    const commonWords = ['The', 'This', 'That', 'These', 'Those', 'They', 'Their', 'When', 'Where', 'What', 'Why', 'How'];
    const uniqueTopics = [...new Set(potentialTopics)].filter(
      topic => !commonWords.includes(topic)
    );
    
    return uniqueTopics;
  };
  
  // Extract topics from content
  const topics = useMemo(() => extractTopics(content), [content]);
  
  // Toggle expanded state
  const toggleExpand = useCallback(() => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    logger.debug('Response node expand toggled', { id, expanded: newExpandedState });
    
    // Call the resize handler if available
    if (onResize) {
      onResize(id, newExpandedState);
    }
  }, [isExpanded, onResize, id]);
  
  // Handle selection for synthesis
  const handleSelect = () => {
    onSelect(id, !isSelected);
    logger.debug('Response node selection changed', { id, selected: !isSelected });
  };
  
  // Handle creating a custom follow-up input node
  const handleCreateFollowUp = () => {
    if (onCreateCustomFollowUp) {
      onCreateCustomFollowUp(id);
      logger.debug('Creating custom follow-up input for node', { id });
    } else {
      logger.warn('No onCreateCustomFollowUp callback provided', { id });
    }
  };

  // Toggle edit mode
  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
    } else {
      // Start editing
      setEditedContent(content);
      setIsEditing(true);
    }
  };

  // Save edited content
  const handleSaveEdit = async () => {
    try {
      if (editedContent.trim() === content.trim()) {
        // No changes made
        setIsEditing(false);
        return;
      }

      const response = await nodeApi.updateNodeContent(canvasId, id, editedContent);
      
      if (response.success && response.data && onNodeUpdated) {
        onNodeUpdated(id, response.data.node);
        logger.info('Node content updated successfully', { nodeId: id });
      }
      
      setIsEditing(false);
    } catch (error) {
      logger.error('Error saving node content', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await nodeApi.addAttachment(canvasId, id, formData);
      
      if (response.success && response.data && onNodeUpdated) {
        const newAttachments = [...attachments, response.data.attachment];
        onNodeUpdated(id, { attachments: newAttachments });
        logger.info('Attachment added successfully', { nodeId: id, fileName: file.name });
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      logger.error('Error uploading file', error);
    }
  };

  // Remove attachment
  const handleRemoveAttachment = async (attachmentIndex: number) => {
    try {
      const response = await nodeApi.removeAttachment(canvasId, id, attachmentIndex);
      
      if (response.success && onNodeUpdated) {
        const newAttachments = [...attachments];
        newAttachments.splice(attachmentIndex, 1);
        onNodeUpdated(id, { attachments: newAttachments });
        logger.info('Attachment removed successfully', { nodeId: id });
      }
    } catch (error) {
      logger.error('Error removing attachment', error);
    }
  };

  // Add source
  const handleAddSource = async () => {
    try {
      if (!newSource.text.trim()) return;
      
      const response = await nodeApi.addSource(canvasId, id, newSource);
      
      if (response.success && response.data && onNodeUpdated) {
        const newSources = [...sources, response.data.source];
        onNodeUpdated(id, { sources: newSources });
        logger.info('Source added successfully', { nodeId: id });
        
        // Reset form
        setNewSource({ text: '', url: '' });
      }
    } catch (error) {
      logger.error('Error adding source', error);
    }
  };

  // Remove source
  const handleRemoveSource = async (sourceIndex: number) => {
    try {
      const response = await nodeApi.removeSource(canvasId, id, sourceIndex);
      
      if (response.success && onNodeUpdated) {
        const newSources = [...sources];
        newSources.splice(sourceIndex, 1);
        onNodeUpdated(id, { sources: newSources });
        logger.info('Source removed successfully', { nodeId: id });
      }
    } catch (error) {
      logger.error('Error removing source', error);
    }
  };

  // Add hover handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (onNodeHover) {
      onNodeHover(id);
    }
  }, [onNodeHover, id]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (onNodeHover) {
      onNodeHover(null);
    }
  }, [onNodeHover]);

  // Handle topic click
  const handleTopicClick = (topic: string) => {
    if (onTopicClick) {
      onTopicClick(topic, id);
    }
  };
  
  // Function to render content with topic highlighting
  const renderContentWithTopics = (content: string, topics: string[], onTopicClick?: (topic: string, nodeId: string) => void, nodeId?: string): React.ReactNode => {
    if (!topics || topics.length === 0 || !content) {
      return content;
    }

    // Create a regex pattern to match all topics (case insensitive)
    const topicPattern = new RegExp(`\\b(${topics.join('|')})\\b`, 'gi');
    
    // Split the content based on topic matches
    const parts = content.split(topicPattern);
    
    // Create React elements with spans for topics
    return parts.map((part, index) => {
      // Check if this part is a topic (case insensitive match)
      const isTopic = topics.some(topic => topic.toLowerCase() === part.toLowerCase());
      
      if (isTopic && onTopicClick && nodeId) {
        return (
          <span 
            key={index}
            className="topic-term"
            onClick={() => onTopicClick(part, nodeId)}
          >
            {part}
          </span>
        );
      }
      
      return part;
    });
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-xl border ${
        isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
      } p-6 transition-all duration-200 ${
        isExpanded ? 'w-[700px] max-w-full' : 'w-[450px] max-w-full'
      } overflow-hidden response-node ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Input handle on the left side */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3"
        style={{ top: '50%' }}
      />
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="font-medium text-gray-900 mb-2 text-lg">
            {query}
            {isEdited && (
              <span className="ml-2 text-xs text-gray-500">(edited)</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Edit button */}
          <button
            onClick={handleToggleEdit}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-500"
            aria-label={isEditing ? "Cancel edit" : "Edit node"}
          >
            {isEditing ? <FiX size={20} /> : <FiEdit2 size={20} />}
          </button>
          
          {/* Selection button */}
          <button
            onClick={handleSelect}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${
              isSelected ? 'text-indigo-600' : 'text-gray-500'
            }`}
            aria-label={isSelected ? 'Deselect node' : 'Select node for synthesis'}
          >
            {isSelected ? <FiCheckSquare size={20} /> : <FiSquare size={20} />}
          </button>
          
          {/* Expand/collapse button */}
          <button
            onClick={toggleExpand}
            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-500"
            aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
          >
            {isExpanded ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
          </button>
        </div>
      </div>
      
      {isEditing ? (
        <div className="mb-4">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-3 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            rows={8}
            style={{ minHeight: "120px", resize: "vertical" }}
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSaveEdit}
              className="inline-flex items-center px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <FiSave size={16} className="mr-2" />
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="prose prose-lg prose-indigo max-w-none mb-4 text-base break-words">
          {renderContentWithTopics(content, topics, onTopicClick, id)}
        </div>
      )}
      
      {/* Attachments Section */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <button
          onClick={() => setShowAttachments(!showAttachments)}
          className="text-base flex items-center text-gray-500 hover:text-indigo-600"
        >
          <FiPaperclip size={16} className="mr-2" />
          {attachments.length > 0 ? `${attachments.length} Attachment${attachments.length !== 1 ? 's' : ''}` : 'Add Attachment'}
        </button>
        
        {showAttachments && (
          <div className="mt-3 space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                <a 
                  href={`/api/file/${attachment.filePath}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline truncate flex-1"
                >
                  {attachment.fileName}
                </a>
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="text-gray-500 hover:text-red-500 ml-2"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
            
            <div className="flex items-center mt-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id={`file-upload-${id}`}
              />
              <label
                htmlFor={`file-upload-${id}`}
                className="cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded text-sm"
              >
                Choose file
              </label>
            </div>
          </div>
        )}
      </div>
      
      {/* Sources Section */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <button
          onClick={() => setShowSources(!showSources)}
          className="text-base flex items-center text-gray-500 hover:text-indigo-600"
        >
          <FiLink size={16} className="mr-2" />
          {sources.length > 0 ? `${sources.length} Source${sources.length !== 1 ? 's' : ''}` : 'Add Source'}
        </button>
        
        {showSources && (
          <div className="mt-3 space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                <div className="flex-1 truncate">
                  <span className="text-gray-700">{source.text}</span>
                  {source.url && (
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-indigo-600 hover:underline"
                    >
                      Link
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveSource(index)}
                  className="text-gray-500 hover:text-red-500 ml-2"
                >
                  <FiX size={16} />
                </button>
              </div>
            ))}
            
            <div className="space-y-2 mt-3">
              <input
                type="text"
                value={newSource.text}
                onChange={(e) => setNewSource({ ...newSource, text: e.target.value })}
                placeholder="Source citation"
                className="w-full text-sm p-2 border border-gray-300 rounded"
              />
              <div className="flex">
                <input
                  type="text"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  placeholder="URL (optional)"
                  className="flex-1 text-sm p-2 border border-gray-300 rounded-l"
                />
                <button
                  onClick={handleAddSource}
                  className="bg-indigo-600 text-white text-sm px-3 py-2 rounded-r"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add the "Ask follow-up" button */}
      <div className="mt-5 flex justify-center">
        <button
          onClick={handleCreateFollowUp}
          className="inline-flex items-center px-5 py-2.5 text-sm bg-indigo-600 text-white rounded-full shadow-sm hover:bg-indigo-700 hover:shadow transition-all duration-150"
        >
          <FiPlus size={18} className="mr-2" />
          <span>Ask follow-up</span>
        </button>
      </div>
      
      {/* Output handle on the right side */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default ResponseNode; 