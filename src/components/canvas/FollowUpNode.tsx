import React, { useState, useEffect, useRef } from 'react';
import { FiArrowRight, FiChevronDown, FiChevronUp, FiSend, FiMessageSquare } from 'react-icons/fi';
import { NodeProps, Handle, Position } from 'reactflow';
import logger from '../../utils/logger';

// Define our custom data properties
export interface FollowUpNodeData {
  id: string;
  question: string;
  isCustom?: boolean;
  isInput?: boolean; // New property to identify if this is an input node
  answer?: string;
  hasBeenAnswered?: boolean;
  childQuestions?: string[];
  onFollowUp?: (id: string, question: string) => void;
  onGenerateChildNodes?: (
    parentId: string, 
    parentQuestion: string, 
    answer: string, 
    childQuestions: string[]
  ) => void;
  expandOnAnswer?: boolean;
  onCreateCustomFollowUp?: (parentId: string) => void; // Add the callback for custom follow-up
  onResize?: (nodeId: string, expanded: boolean) => void; // Add callback for resizing
  onNodeHover?: (nodeId: string | null) => void; // Add callback for hover
  canvasId: string;
  isAnswered?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onTopicClick?: (nodeId: string, topic: string) => void;
}

// Our component props now extend ReactFlow's NodeProps
// and specify our custom data type
const FollowUpNode = ({ data, isConnectable }: NodeProps<FollowUpNodeData>) => {
  const [customQuestion, setCustomQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const { 
    id, 
    question, 
    isCustom = false,
    isInput = false, // Default to false for backward compatibility
    answer, 
    hasBeenAnswered = false,
    onFollowUp, 
    onGenerateChildNodes,
    expandOnAnswer = true, // Default to true for auto-expansion
    childQuestions,
    onCreateCustomFollowUp,
    onResize,
    onNodeHover,
    canvasId,
    isAnswered,
    isSelected,
    onSelect,
    onTopicClick
  } = data;
  
  // Effect to auto-expand when an answer is received
  useEffect(() => {
    if (hasBeenAnswered && answer && expandOnAnswer) {
      logger.debug('Auto-expanding node after receiving answer', { 
        id, 
        wasExpanded: isExpanded,
        isCustom,
        nodeHeight: nodeRef.current?.offsetHeight
      });
      
      // Force a slight delay to ensure DOM updates before expanding
      // This helps with animation and ensures the node is properly rendered
      setTimeout(() => setIsExpanded(true), 50);

      // Automatically generate child nodes when an answer is received
      // and if we have the callback available
      setTimeout(() => {
        if (answer && onGenerateChildNodes) {
          logger.debug('Automatically generating follow-up questions', { 
            id, 
            isCustom,
            hasAnswer: !!answer,
            hasCallback: !!onGenerateChildNodes
          });
          
          // For custom nodes, make sure we use the stored question from data
          const questionToUse = isCustom ? (question || '') : question;
          
          try {
            // Every node that has an answer should generate child questions
            // If childQuestions is not available, we'll use an empty array
            // which will effectively just mark this node as having been processed
            const questionsToGenerate = childQuestions || [];
            
            onGenerateChildNodes(
              id,
              questionToUse,
              answer,
              questionsToGenerate
            );
            logger.debug('Successfully triggered automatic follow-up generation', { 
              id,
              questionCount: questionsToGenerate.length
            });
          } catch (error) {
            logger.error('Error in automatic follow-up generation', { 
              id, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        } else {
          logger.debug('Not generating child nodes, missing requirements', { 
            id, 
            hasAnswer: !!answer, 
            hasCallback: !!onGenerateChildNodes
          });
        }
      }, 200); // Slight delay to ensure the node is fully expanded
    }
  }, [hasBeenAnswered, answer, id, expandOnAnswer, isExpanded, isCustom, childQuestions, question, onGenerateChildNodes]);
  
  // Additional effect to monitor for changes in hasBeenAnswered
  useEffect(() => {
    if (hasBeenAnswered && !isExpanded && expandOnAnswer) {
      logger.debug('Node was answered but not expanded, auto-expanding', { id, isCustom });
      setIsExpanded(true);
    }
  }, [hasBeenAnswered, isExpanded, id, expandOnAnswer, isCustom]);
  
  // Log each render to track state
  useEffect(() => {
    logger.debug('FollowUpNode render state', { 
      id, 
      hasBeenAnswered, 
      isExpanded, 
      hasAnswer: !!answer,
      expandOnAnswer,
      question,
      isCustom,
      isInput,
      nodeHeight: nodeRef.current?.offsetHeight,
      renderingAnswerBox: hasBeenAnswered && isExpanded && !!answer,
      renderingInputForm: isInput
    });
  }, [id, hasBeenAnswered, isExpanded, answer, expandOnAnswer, question, isCustom, isInput]);
  
  const handleClick = () => {
    if (isInput) return; // Input nodes don't expand on click
    
    if (hasBeenAnswered) {
      logger.debug(`Toggling expansion for node ${id}`);
      const newExpandedState = !isExpanded;
      setIsExpanded(newExpandedState);

      // Call the resize handler if provided
      if (onResize) {
        onResize(id, newExpandedState);
      }
      
      // If selected callback is provided, call it
      if (onSelect) {
        onSelect(id);
      }
    } else {
      if (isProcessing) {
        logger.warn('Ignoring click, already processing a follow-up request');
        return;
      }
      
      if (!isCustom && onFollowUp) {
        setIsProcessing(true);
        logger.debug('User clicked on follow-up question', { 
          id, 
          question,
          isCustom
        });
        
        try {
          logger.debug('Sending follow-up request with ID', { nodeId: id });
          
          if (!id) {
            logger.error('Missing node ID for follow-up click', { data });
            setIsProcessing(false);
            return;
          }
          
          setTimeout(() => {
            try {
              onFollowUp(id, question);
              setTimeout(() => setIsProcessing(false), 1000);
            } catch (callbackError) {
              logger.error('Error calling onFollowUp callback', { 
                id, 
                error: callbackError instanceof Error ? callbackError.message : 'Unknown error' 
              });
              setIsProcessing(false);
            }
          }, 100);
        } catch (error) {
          logger.error('Error in follow-up click handler', error);
          setIsProcessing(false);
        }
      }
    }
  };
  
  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessing) {
      logger.warn('Ignoring submission, already processing a follow-up request');
      return;
    }
    
    if (customQuestion.trim() && onFollowUp) {
      setIsProcessing(true);
      logger.debug('User submitted custom follow-up question', { 
        id, 
        question: customQuestion,
        questionLength: customQuestion.length,
        isCustom,
        isInput
      });
      
      try {
        logger.debug('Preparing to send custom follow-up request', { 
          nodeId: id,
          customQuestionEmpty: !customQuestion.trim()
        });
        
        if (!id) {
          logger.error('Missing node ID for custom follow-up', { data });
          setIsProcessing(false);
          return;
        }
        
        const questionToSubmit = customQuestion.trim();
        
        setTimeout(() => {
          try {
            logger.debug('Calling onFollowUp with custom question', {
              id,
              questionLength: questionToSubmit.length 
            });
            
            onFollowUp(id, questionToSubmit);
            logger.debug('onFollowUp call completed for custom question', { id });
            
            setCustomQuestion('');
            setTimeout(() => setIsProcessing(false), 1000);
          } catch (callbackError) {
            logger.error('Error calling onFollowUp callback for custom question', { 
              id, 
              error: callbackError instanceof Error ? callbackError.message : 'Unknown error' 
            });
            setIsProcessing(false);
          }
        }, 100);
      } catch (error) {
        logger.error('Error in custom follow-up submission handler', error);
        setIsProcessing(false);
      }
    } else {
      // Log why the submission is being ignored
      logger.warn('Custom submission ignored', { 
        id,
        isCustom,
        isInput,
        hasCallback: !!onFollowUp,
        questionEmpty: !customQuestion.trim()
      });
    }
  };
  
  const handleGenerateFollowups = () => {
    // NOTE: This function is no longer used as follow-up generation is now automatic.
    // It's kept for reference or potential future manual triggering if needed.
    if (!answer || !hasBeenAnswered || !onGenerateChildNodes) return;
    
    logger.debug('Generating child nodes from parent', { 
      id, 
      isCustom, 
      question: question || customQuestion,
      hasAnswer: !!answer
    });
    
    // Use the child questions from the data if available, or fall back to mock data
    const followUpQuestions = childQuestions || [
      "What are the practical applications of this concept?",
      "How does this relate to other topics we've discussed?",
      "Can you elaborate more on a specific aspect of this answer?"
    ];
    
    // For custom nodes, make sure we use the stored question from data
    // Custom nodes should have their question stored in the data after submission
    const questionToUse = isCustom ? (question || '') : question;
    
    try {
      onGenerateChildNodes(
        id,
        questionToUse,
        answer,
        followUpQuestions
      );
      logger.debug('Successfully called onGenerateChildNodes', { id });
    } catch (error) {
      logger.error('Error generating child nodes', { 
        id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };
  
  const handleCreateFollowUp = () => {
    if (onCreateCustomFollowUp) {
      onCreateCustomFollowUp(id);
      logger.debug('Creating custom follow-up input for answered node', { id });
    } else {
      logger.warn('No onCreateCustomFollowUp callback provided', { id });
    }
  };
  
  // Add hover handlers
  const handleMouseEnter = () => {
    if (onNodeHover) {
      onNodeHover(id);
    }
  };
  
  const handleMouseLeave = () => {
    if (onNodeHover) {
      onNodeHover(null);
    }
  };
  
  // Extract potential topics from content (reuse from ResponseNode)
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
  
  // Handle topic click
  const handleTopicClick = (topic: string) => {
    if (onTopicClick) {
      onTopicClick(id, topic);
    }
  };
  
  // Render content with highlighted topics
  const renderContentWithTopics = (text: string) => {
    if (!text) return <div></div>;
    
    const topics = extractTopics(text);
    
    if (topics.length === 0) {
      return <div>{text}</div>;
    }

    // Create a regex pattern to match all topics (case insensitive)
    const topicPattern = new RegExp(`\\b(${topics.join('|')})\\b`, 'gi');
    
    // Split the content based on topic matches
    const parts = text.split(topicPattern);
    
    // Create React elements with spans for topics
    return parts.map((part, index) => {
      // Check if this part is a topic (case insensitive match)
      const isTopic = topics.some(topic => topic.toLowerCase() === part.toLowerCase());
      
      if (isTopic && onTopicClick) {
        return (
          <span 
            key={index}
            className="topic-term"
            onClick={() => handleTopicClick(part)}
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
      ref={nodeRef}
      className={`bg-white rounded-lg shadow-sm border ${hasBeenAnswered ? 'border-indigo-200' : 'border-gray-200'} ${
        isExpanded ? 'w-[350px]' : 'w-60'
      } max-w-full follow-up-node ${isExpanded ? 'expanded' : ''} ${isInput ? 'border-indigo-300 shadow-md' : ''} overflow-hidden`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Input handle on the left side */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2"
        style={{ top: '50%' }}
      />
      
      <div className="p-3">
        {isInput ? (
          // This is a follow-up input node
          <form onSubmit={handleSubmitCustom} className="custom-followup-form">
            <label htmlFor="custom-followup" className="block text-xs font-medium text-gray-700 mb-1">
              Ask your follow-up question
            </label>
            <textarea
              id="custom-followup"
              placeholder="Type your question here..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-xs text-gray-900"
              rows={2}
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              disabled={isProcessing}
              autoFocus
              style={{ resize: "vertical", minHeight: "60px" }}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={!customQuestion.trim() || isProcessing}
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                  customQuestion.trim() && !isProcessing
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>{isProcessing ? 'Processing...' : 'Send'}</span>
                {!isProcessing && <FiSend size={12} className="ml-1" />}
              </button>
            </div>
          </form>
        ) : (
          // This is a regular follow-up question node
          <div>
            {/* Question part */}
            <button
              onClick={handleClick}
              className={`w-full text-left ${hasBeenAnswered ? 'font-medium text-indigo-700' : 'hover:bg-gray-50'} ${isProcessing ? 'bg-gray-100' : ''} p-1 rounded transition-colors`}
              disabled={isProcessing}
            >
              <div className="flex items-start">
                <div className={`flex-grow ${isProcessing ? 'text-gray-500' : 'text-gray-700'} text-xs break-words`}>
                  {question}
                </div>
                <div className="ml-2 mt-0.5 flex-shrink-0 text-indigo-600">
                  {isProcessing ? (
                    <span className="text-xs text-gray-500">Processing...</span>
                  ) : (
                    hasBeenAnswered ? (
                      isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    ) : (
                      <FiArrowRight size={14} />
                    )
                  )}
                </div>
              </div>
            </button>
            
            {/* Answer part (only if answered and expanded) */}
            {hasBeenAnswered && isExpanded && answer && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="text-sm text-gray-700 mb-2 break-words">
                  {renderContentWithTopics(answer)}
                </div>
                
                {/* Add "Ask follow-up" button for answered nodes */}
                {onCreateCustomFollowUp && (
                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={handleCreateFollowUp}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-full shadow-sm hover:bg-indigo-700 hover:shadow transition-all duration-150"
                    >
                      <FiMessageSquare size={12} className="mr-1" />
                      <span>Ask follow-up</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Output handle on the right side */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default FollowUpNode; 