import React, { useState, useCallback } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { FiMaximize, FiMinimize } from 'react-icons/fi';
import logger from '../../utils/logger';

// Define the TopicNodeData interface
export interface TopicNodeData {
  id: string;
  topic: string;
  explanation: string;
  onNodeHover?: (nodeId: string | null) => void;
  onResize?: (nodeId: string, expanded: boolean) => void;
}

// The TopicNode component
export default function TopicNode({ data, id }: NodeProps<TopicNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const { topic, explanation, onNodeHover, onResize } = data;
  
  // Toggle expanded state
  const toggleExpand = useCallback(() => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    logger.debug('Topic node expand toggled', { id, expanded: newExpandedState });
    
    // Call the resize handler if provided
    if (onResize) {
      onResize(id, newExpandedState);
    }
  }, [isExpanded, onResize, id]);
  
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
  
  return (
    <div 
      className={`topic-node ${isHovered ? 'hovered' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="topic-node-handle"
        style={{ 
          background: '#6366f1',
          width: '8px',
          height: '8px',
          border: '2px solid white'
        }}
      />
      
      <div className="topic-node-header flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-indigo-800">{topic}</h3>
        <button 
          className="expand-button p-1 rounded-full hover:bg-indigo-100"
          onClick={toggleExpand}
          aria-label={isExpanded ? 'Collapse topic' : 'Expand topic'}
        >
          {isExpanded ? <FiMinimize size={14} /> : <FiMaximize size={14} />}
        </button>
      </div>
      
      <div className="topic-node-content">
        {isExpanded ? (
          <div className="full-content text-sm text-gray-700">
            {explanation}
          </div>
        ) : (
          <div className="truncated-content text-sm text-gray-600 italic">
            {explanation.slice(0, 80)}{explanation.length > 80 ? '...' : ''}
          </div>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="topic-node-handle"
        style={{ 
          background: '#6366f1',
          width: '8px',
          height: '8px',
          border: '2px solid white'
        }}
      />
    </div>
  );
} 