import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  NodeProps,
  NodeTypes,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import logger from '../../utils/logger';
import ResponseNode from './ResponseNode';
import FollowUpNode, { FollowUpNodeData } from './FollowUpNode';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { NodeType, SynthesisArtifact } from '../../types';
import { claudeApi } from '../../services/api';
import './mindmap.css'; // We'll create this file next
import TopicNode from './TopicNode';

// Move nodeTypes outside the component to prevent re-creation on each render
const NODE_TYPES: NodeTypes = {
  response: ResponseNode,
  followUp: FollowUpNode,
  topic: TopicNode,
};

// Function to create a standard edge
const createEdge = (source: string, target: string) => {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    type: 'mindmap-edge'
  };
};

// Constants for dimensions and spacing
const NODE_WIDTH = 300; // Default width of nodes
const NODE_HEIGHT = 150; // Default height of nodes
const PADDING = 50; // Padding to avoid overlaps
const GRID_HORIZONTAL_SPACING = 250; // Spacing between nodes on X axis
const GRID_VERTICAL_SPACING = 200; // Spacing between nodes on Y axis
const MAX_SIBLINGS_PER_LEVEL = 3; // Maximum number of nodes per vertical level before wrapping

// Using a proper React ref to store the function reference safely
const topicClickRefHolder = { current: null as any };

// Helper function to calculate node positions
const calculateNodePositions = (
  parentNodeId: string | null,
  childrenCount: number,
  existingNodes: Node[],
  existingEdges: Edge[] = []
): { x: number; y: number }[] => {
  try {
    // Input validation
    if (childrenCount <= 0) {
      logger.warn('Invalid children count in calculateNodePositions', { childrenCount });
      childrenCount = 1; // Fallback to at least 1 child
    }
    
    if (!existingNodes || !Array.isArray(existingNodes)) {
      logger.warn('Invalid existingNodes in calculateNodePositions', { existingNodes });
      existingNodes = []; // Use empty array as fallback
    }
    
    // If no parent, this is the first node (positioned in the center)
    if (!parentNodeId) {
      return [{ x: 650, y: 400 }]; // Center the initial node more
    }
    
    // Find the parent node
    const parentNode = existingNodes.find(n => n && n.id === parentNodeId);
    if (!parentNode || !parentNode.position || typeof parentNode.position.x !== 'number' || typeof parentNode.position.y !== 'number') {
      logger.warn('Parent node not found or has invalid position', { parentNodeId });
      return [{ x: 650, y: 400 }];
    }
    
    // Calculate the parent's depth in the tree to determine positioning strategy
    const parentDepth = calculateNodeDepth(parentNode.id, existingNodes, existingEdges);
    
    // Find the depth of this parent from the root
    const positions: { x: number; y: number }[] = [];
    
    // Base x position is to the right of the parent
    const baseX = parentNode.position.x + GRID_HORIZONTAL_SPACING;
    
    // Calculate total height needed for child nodes
    const totalHeight = Math.min(childrenCount, MAX_SIBLINGS_PER_LEVEL) * GRID_VERTICAL_SPACING;
    
    // Start y position is offset from parent to center the children vertically
    let startY = parentNode.position.y;
    if (childrenCount > 1) {
      startY = parentNode.position.y - (totalHeight / 2) + (GRID_VERTICAL_SPACING / 2);
    }
    
    // For each child, calculate its position
    for (let i = 0; i < childrenCount; i++) {
      // Calculate position based on index
      // If we exceed MAX_SIBLINGS_PER_LEVEL, wrap to a new column
      const columnOffset = Math.floor(i / MAX_SIBLINGS_PER_LEVEL) * (NODE_WIDTH + PADDING);
      const rowIndex = i % MAX_SIBLINGS_PER_LEVEL;
      
      const position = { 
        x: baseX + columnOffset, 
        y: startY + (rowIndex * GRID_VERTICAL_SPACING)
      };
      
      // Check for overlap with any existing nodes
      const adjustedPosition = avoidOverlap(position, existingNodes);
      positions.push(adjustedPosition);
    }
    
    return positions;
  } catch (error) {
    logger.error('Error in calculateNodePositions', error);
    // Return a safe fallback position
    return Array(childrenCount).fill({ x: 650, y: 400 });
  }
};

// Calculate the depth of a node in the tree
const calculateNodeDepth = (nodeId: string, nodes: Node[], edges: Edge[]): number => {
  try {
    // Find all edges where this node is the target
    const parentEdge = edges.find(edge => edge.target === nodeId);
    
    // If no parent edge, this is a root node (depth 0)
    if (!parentEdge) {
      return 0;
    }
    
    // Get the parent's depth recursively
    return 1 + calculateNodeDepth(parentEdge.source, nodes, edges);
  } catch (error) {
    logger.error('Error calculating node depth', { nodeId, error });
    return 0; // Fallback
  }
};

// Helper function to check for node overlap and adjust if needed
const avoidOverlap = (
  position: { x: number, y: number },
  existingNodes: Node[],
  nodeWidth: number = NODE_WIDTH,
  nodeHeight: number = NODE_HEIGHT,
  padding: number = PADDING
) => {
  // Safety check for position
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    logger.warn('Invalid position provided to avoidOverlap, using fallback', { position });
    return { x: 200, y: 300 }; // Fallback position
  }
  
  // If there are no existing nodes, return the original position
  if (!existingNodes || existingNodes.length === 0) {
    return position;
  }
  
  // Filter out nodes with invalid positions
  const validNodes = existingNodes.filter(node => 
    node && node.position && 
    typeof node.position.x === 'number' && 
    typeof node.position.y === 'number'
  );
  
  if (validNodes.length === 0) {
    return position; // No valid nodes to check against
  }
  
  // Check if this position overlaps with any existing node
  const isOverlapping = (pos: { x: number, y: number }) => {
    return validNodes.some(node => {
      const horizontalOverlap = 
        Math.abs(node.position.x - pos.x) < (nodeWidth + padding) / 2;
      const verticalOverlap = 
        Math.abs(node.position.y - pos.y) < (nodeHeight + padding) / 2;
      return horizontalOverlap && verticalOverlap;
    });
  };
  
  // If no overlap, return the original position
  if (!isOverlapping(position)) {
    return position;
  }
  
  // If overlap, try to find a new position
  // We'll try positions in a grid pattern around the original position
  const maxAttempts = 20;
  let attempts = 0;
  
  // Try finding a position horizontally first (same row)
  let testPosition = { ...position };
  
  while (isOverlapping(testPosition) && attempts < maxAttempts) {
    if (attempts % 2 === 0) {
      // Move right by one grid step
      testPosition.x += GRID_HORIZONTAL_SPACING;
    } else {
      // Every other attempt, try a new row
      testPosition.x = position.x;
      testPosition.y += GRID_VERTICAL_SPACING;
    }
    attempts++;
  }
  
  // If we couldn't find a non-overlapping position, place it below all existing nodes
  if (attempts >= maxAttempts) {
    const maxY = Math.max(...validNodes.map(node => node.position.y)) + nodeHeight + padding;
    return { x: position.x, y: maxY };
  }
  
  return testPosition;
};

interface MindMapCanvasProps {
  initialQuery?: string;
  canvasId?: string;
}

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ initialQuery, canvasId }) => {
  // React Flow initialization
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isSynthesizeMode, setIsSynthesizeMode] = useState(false);
  const [isProcessingSynthesis, setIsProcessingSynthesis] = useState(false);
  const [customSynthesisPrompt, setCustomSynthesisPrompt] = useState('');
  const [synthesisFeedback, setSynthesisFeedback] = useState('');
  const [artifacts, setArtifacts] = useState<SynthesisArtifact[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  const { project, getNodes, getEdges } = useReactFlow();

  // Keep track of which nodes have already generated child nodes to prevent duplicates
  const nodesWithGeneratedChildren = useRef(new Set<string>());

  // Add these state variables to the MindMapCanvas component
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  // Load or initialize the canvas
  useEffect(() => {
    if (initialQuery) {
      // This is a new canvas, initialize with the query
      logger.info('Initializing new canvas with query', { initialQuery });
      initializeCanvas(initialQuery);
    } else if (canvasId) {
      // Load existing canvas
      logger.info('Loading existing canvas', { canvasId });
      loadCanvas(canvasId);
      
      // Load artifacts for this canvas
      loadArtifacts(canvasId);
    }
  }, [initialQuery, canvasId]);

  // Add an effect to detect and clean up duplicate edges
  useEffect(() => {
    // This effect runs after edges have been updated
    // and cleans up any duplicate source/target edge combinations
    
    // First check if we have duplicate edges
    const sourceTargetCombos = new Map<string, Edge[]>();
    
    // Group edges by source-target combination
    edges.forEach(edge => {
      const combo = `${edge.source}-${edge.target}`;
      if (!sourceTargetCombos.has(combo)) {
        sourceTargetCombos.set(combo, []);
      }
      sourceTargetCombos.get(combo)?.push(edge);
    });
    
    // Find combinations with more than one edge
    let hasDuplicates = false;
    sourceTargetCombos.forEach((edgeGroup, combo) => {
      if (edgeGroup.length > 1) {
        hasDuplicates = true;
        logger.warn('Found duplicate edges', { 
          combo, 
          count: edgeGroup.length, 
          edgeIds: edgeGroup.map(e => e.id).join(', ')
        });
      }
    });
    
    // If duplicates exist, clean them up
    if (hasDuplicates) {
      logger.info('Cleaning up duplicate edges');
      
      setEdges(currentEdges => {
        const uniqueEdges: Edge[] = [];
        const seenCombos = new Set<string>();
        
        // Keep only one edge for each source-target combination
        for (const edge of currentEdges) {
          const combo = `${edge.source}-${edge.target}`;
          if (!seenCombos.has(combo)) {
            seenCombos.add(combo);
            uniqueEdges.push(edge);
          }
        }
        
        logger.debug('Edge cleanup complete', {
          originalCount: currentEdges.length,
          newCount: uniqueEdges.length,
          removed: currentEdges.length - uniqueEdges.length
        });
        
        return uniqueEdges;
      });
    }
  }, [edges]);

  // Replace the findPathToRoot function with a memoized version
  const findPathToRoot = useCallback((nodeId: string): Set<string> => {
    const edgeSet = new Set<string>();
    const visited = new Set<string>();
    
    // Use getNodes() and getEdges() to get current snapshots
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    const traverseUp = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      // Find all edges where this node is the target
      const incomingEdges = currentEdges.filter(e => e.target === id);
      
      for (const edge of incomingEdges) {
        edgeSet.add(edge.id);
        traverseUp(edge.source);
      }
    };
    
    traverseUp(nodeId);
    return edgeSet;
  }, [getNodes, getEdges]);

  // Update the effect to track hovered node
  useEffect(() => {
    if (hoveredNodeId) {
      setHighlightedEdgeIds(findPathToRoot(hoveredNodeId));
    } else {
      setHighlightedEdgeIds(new Set());
    }
  }, [hoveredNodeId, findPathToRoot]);

  // Add this effect to update edge styling when highlighted edges change
  useEffect(() => {
    // Only update edges when highlightedEdgeIds actually changes and contains IDs
    if (edges.length > 0) {
      // Create an object to quickly look up if an edge ID is highlighted
      const highlightedEdgesMap = Array.from(highlightedEdgeIds).reduce((acc, id) => {
        acc[id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      
      // Check if we need to update any edges
      const needsUpdate = edges.some(edge => 
        (!!highlightedEdgesMap[edge.id]) !== (edge.className === 'highlighted-path')
      );
      
      // Only update if necessary
      if (needsUpdate) {
        setEdges(currentEdges => 
          currentEdges.map(edge => {
            const isHighlighted = !!highlightedEdgesMap[edge.id];
            
            // Only create a new edge object if the highlight state changed
            if ((isHighlighted && edge.className !== 'highlighted-path') || 
                (!isHighlighted && edge.className === 'highlighted-path')) {
              return {
                ...edge,
                className: isHighlighted ? 'highlighted-path' : '',
                animated: isHighlighted,
                style: {
                  ...edge.style,
                  stroke: isHighlighted ? '#22c55e' : edge.style?.stroke || '#cbd5e0',
                  strokeWidth: isHighlighted ? 2.5 : edge.style?.strokeWidth || 1.5,
                }
              };
            }
            return edge;
          })
        );
      }
    }
  }, [highlightedEdgeIds, edges, setEdges]);

  // Add the onNodeHover handler
  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const initializeCanvas = async (query: string) => {
    try {
      // Call Claude API for initial response instead of using mock data
      let response;
      try {
        logger.info('Calling Claude API for initial response', { query });
        const apiResponse = await claudeApi.processQuery(query);
        
        if (!apiResponse.success || !apiResponse.data) {
          throw new Error(apiResponse.error || 'API returned unsuccessful response');
        }
        
        response = apiResponse.data;
        logger.debug('Received Claude API response', { 
          questionLength: query.length,
          answerLength: response.answer.length,
          followUpCount: response.followUpQuestions.length
        });
      } catch (apiError) {
        // Fallback to mock data if API call fails
        logger.error('Error calling Claude API, using mock data', { 
          query, 
          error: apiError instanceof Error ? apiError.message : 'Unknown error' 
        });
        
        // Provide mock data as fallback
        response = {
          answer: "This is a mock answer to the query. It's designed to simulate what Claude would return for the initial query. The answer is detailed and provides thoughtful insight into the question or reflection that was posed.",
          followUpQuestions: [
            "What specific aspects of this topic interest you the most?",
            "How does this relate to your personal experiences?",
            "What other perspectives might be valuable to consider on this topic?",
          ]
        };
      }
      
      logger.debug('Initializing canvas with data', { questionCount: response.followUpQuestions.length });
      
      // Create nodes and edges
      const initialNodes: Node[] = [];
      const initialEdges: Edge[] = [];
      
      try {
        // Add initial response node (positioned on the left side)
        const initialPosition = { x: 250, y: 300 };
        const responseId = 'response-1';
        
        const responseNode: Node = {
          id: responseId,
          type: 'response',
          position: initialPosition,
          data: { 
            id: responseId,
            content: response.answer,
            query: query,
            isSelected: false,
            onSelect: handleNodeSelection,
            onCreateCustomFollowUp: handleCreateCustomFollowUp,
            onNodeHover: handleNodeHover,
            canvasId: canvasId || '',
            onTopicClick: handleTopicClick,
            onResize: handleNodeResize
          }
        };
        initialNodes.push(responseNode);
        
        // Calculate positions for follow-up questions
        const followUpCount = response.followUpQuestions.length + 1; // +1 for custom follow-up
        const followUpPositions = calculateNodePositions(
          responseId,
          followUpCount,
          initialNodes,
          initialEdges
        );
        
        // Add follow-up question nodes
        response.followUpQuestions.forEach((question, index) => {
          try {
            // Create stable, predictable IDs for initial follow-ups
            const id = `followup-${index + 1}`;
            
            logger.debug('Creating follow-up node', { id, question, index });
            
            // Get position using the calculated positions
            const position = followUpPositions[index] || { x: 600, y: 300 + (index * 150) };
            
            const followUpNode: Node = {
              id,
              type: 'followUp',
              position: position,
              data: {
                id,
                question, 
                isCustom: false,
                hasBeenAnswered: false,
                onFollowUp: handleFollowUpQuestion,
                onGenerateChildNodes: handleGenerateChildNodes,
                onCreateCustomFollowUp: handleCreateCustomFollowUp,
                onResize: handleNodeResize,
                onNodeHover: handleNodeHover,
                onTopicClick: handleTopicClick
              }
            };
            initialNodes.push(followUpNode);
            
            // Connect the edge from the response node to each follow up
            initialEdges.push(createEdge(responseId, id));
          } catch (followUpError) {
            logger.error('Error creating follow-up node', { index, question, error: followUpError });
            // Continue with other nodes, don't let one bad node block the canvas creation
          }
        });
        
        try {
          // Add custom follow-up node
          const customFollowUpId = 'custom-followup';
          const customPosition = followUpPositions[response.followUpQuestions.length] || 
            { x: 600, y: 300 + (response.followUpQuestions.length * 150) };
          
          logger.debug('Creating custom follow-up node', { id: customFollowUpId });
          
          const customFollowUpNode: Node = {
            id: customFollowUpId,
            type: 'followUp',
            position: customPosition,
            data: { 
              id: customFollowUpId,
              question: '', 
              isCustom: true,
              hasBeenAnswered: false,
              onFollowUp: handleFollowUpQuestion,
              onGenerateChildNodes: handleGenerateChildNodes,
              onCreateCustomFollowUp: handleCreateCustomFollowUp,
              onResize: handleNodeResize,
              onNodeHover: handleNodeHover
            }
          };
          initialNodes.push(customFollowUpNode);
          
          // Connect the edge from the response node to custom follow-up
          initialEdges.push(createEdge(responseId, customFollowUpId));
        } catch (customFollowUpError) {
          logger.error('Error creating custom follow-up node', { error: customFollowUpError });
          // If custom follow-up fails, canvas can still work with other nodes
        }
        
        logger.debug('Created initial nodes and edges', { 
          nodeCount: initialNodes.length, 
          edgeCount: initialEdges.length,
          nodeIds: initialNodes.map(n => n.id).join(', ')
        });
        
        // Set nodes and edges in state
        setNodes(initialNodes);
        setEdges(initialEdges);
        
        // Auto-fit view after initializing
        setTimeout(() => fitView(), 300);
        
        return responseId; // For any post-processing
      } catch (nodeCreationError) {
        logger.error('Error creating initial nodes', nodeCreationError);
        throw new Error(`Failed to create initial nodes: ${nodeCreationError instanceof Error ? nodeCreationError.message : 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error initializing canvas', { query, error: error instanceof Error ? { message: error.message, stack: error.stack } : error });
    }
  };

  const loadCanvas = async (id: string) => {
    try {
      // Mock loading canvas from API
      logger.info('Mock loading canvas data from API', { id });
      // In a real app, we would fetch the canvas data from the API
      // For now, just call initializeCanvas with a placeholder query
      initializeCanvas('This is a previously saved canvas');
    } catch (error) {
      logger.error('Error loading canvas', { id, error });
    }
  };

  const loadArtifacts = async (canvasId: string) => {
    try {
      // In a real app, we would fetch the artifacts from the API
      // For now, use mock data
      const mockArtifacts: SynthesisArtifact[] = [
        { 
          id: 'artifact-1', 
          title: 'Key Insights on Climate Change', 
          content: 'Climate change is accelerating at an unprecedented rate. The global temperature is rising, causing sea levels to increase and weather patterns to become more extreme. This has significant implications for agriculture, coastal communities, and biodiversity. Addressing this issue requires international cooperation and substantial changes to how we produce and consume energy.',
          canvasId: canvasId,
          createdAt: new Date().toISOString()
        },
        { 
          id: 'artifact-2', 
          title: 'Future Directions for Research', 
          content: 'Based on the analysis, several promising research directions emerge: 1) Developing more efficient carbon capture technologies, 2) Exploring the viability of alternative energy sources beyond solar and wind, 3) Studying the psychological factors that influence individual and collective action on climate issues, 4) Creating more accurate climate models that can predict local impacts.',
          canvasId: canvasId,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setArtifacts(mockArtifacts);
      logger.debug('Loaded artifacts for canvas', { canvasId, count: mockArtifacts.length });
    } catch (error) {
      logger.error('Error loading artifacts', { canvasId, error });
    }
  };

  // Function to build context from ancestor nodes
  const buildAncestorContext = async (nodeId: string): Promise<string[]> => {
    const context: string[] = [];
    const visitedNodes = new Set<string>();
    
    // Get current nodes and edges
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    // Recursive function to traverse up the node tree
    const getParentContext = (currentNodeId: string) => {
      if (visitedNodes.has(currentNodeId)) return; // Prevent cycles
      visitedNodes.add(currentNodeId);
      
      // Find the node
      const node = currentNodes.find(n => n.id === currentNodeId);
      if (!node) return;
      
      // Add this node's content to context if it exists
      if (node.data.question) {
        context.push(`Question: ${node.data.question}`);
      }
      if (node.data.answer || node.data.content) {
        context.push(`Answer: ${node.data.answer || node.data.content}`);
      }
      
      // Find parent edges and traverse up
      const parentEdges = currentEdges.filter(edge => edge.target === currentNodeId);
      parentEdges.forEach(edge => {
        getParentContext(edge.source);
      });
    };
    
    // Start from the given node
    getParentContext(nodeId);
    
    return context;
  };

  const handleFollowUpQuestion = async (nodeId: string, question: string, isCustom = false) => {
    try {
      logger.info('Processing follow-up question', { 
        nodeId, 
        questionLength: question.length,
        isCustom
      });
      
      // Find the node's ancestors to use as context
      const ancestorContext = await buildAncestorContext(nodeId);
      
      logger.debug('Built ancestor context for query', { 
        nodeId, 
        contextLength: ancestorContext.length
      });
      
      // Make the API call to Claude
      logger.debug('Making API call to Claude for follow-up', {
        nodeId,
        questionLength: question.length,
        contextLength: ancestorContext.length
      });
      
      const response = await claudeApi.processFollowUp(question, ancestorContext);
      
      // Log response details for debugging
      logger.debug('Received response from Claude API', {
        nodeId,
        success: response.success,
        hasAnswer: response.success && !!response.data?.answer,
        answerLength: response.success && response.data?.answer ? response.data.answer.length : 0,
        followUpCount: response.success && response.data?.followUpQuestions ? response.data.followUpQuestions.length : 0,
        isMockData: !response.success || !response.data,
      });
      
      // If the API call wasn't successful, use mock data
      if (!response.success || !response.data) {
        logger.warn('API call failed, using mock data for follow-up', { nodeId, isCustom });
        
        // Create mock response
        const mockAnswer = `This is a mock answer for "${question}" because the Claude API server isn't running. Start the API server to get actual AI responses.`;
        const mockFollowUps = ["Question 1 about the topic?", "Question 2 expanding on details?", "Question 3 exploring implications?"];
        
        // Update node with mock data
        setNodes(currentNodes => {
          const targetNode = currentNodes.find(node => node.id === nodeId);
          if (!targetNode) {
            logger.error('Node disappeared from state when updating with mock answer', { nodeId });
            return currentNodes;
          }
          
          const updatedNodes = currentNodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  answer: mockAnswer,
                  hasBeenAnswered: true,
                  childQuestions: mockFollowUps,
                  expandOnAnswer: true,
                  question: isCustom ? question : node.data.question,
                  onCreateCustomFollowUp: handleCreateCustomFollowUp,
                  onNodeHover: handleNodeHover
                }
              };
            }
            return node;
          });
          
          // Auto-fit view after updating nodes
          setTimeout(() => fitView(), 300);
          
          // Explicitly generate child nodes for mock data after a short delay
          setTimeout(() => {
            try {
              logger.debug('Explicitly generating child nodes for mock data', { nodeId });
              handleGenerateChildNodes(
                nodeId,
                isCustom ? question : question,
                mockAnswer,
                mockFollowUps
              );
            } catch (error) {
              logger.error('Error generating child nodes for mock data', { 
                nodeId, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
          }, 500);
          
          return updatedNodes;
        });
        
        return;
      } else {
        // API call was successful, response.data exists
        const responseData = response.data;
        const answer = responseData.answer;
        const followUpQuestions = responseData.followUpQuestions;
        
        // Update node with API response
        setNodes(currentNodes => {
          const targetNode = currentNodes.find(node => node.id === nodeId);
          if (!targetNode) {
            logger.error('Node disappeared from state when updating with API response', { nodeId });
            return currentNodes;
          }
          
          const updatedNodes = currentNodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  answer,
                  hasBeenAnswered: true,
                  childQuestions: followUpQuestions,
                  expandOnAnswer: true,
                  question: isCustom ? question : node.data.question,
                  onCreateCustomFollowUp: handleCreateCustomFollowUp,
                  onNodeHover: handleNodeHover
                }
              };
            }
            return node;
          });
          
          return updatedNodes;
        });
        
        // Auto-fit view after updating nodes
        setTimeout(() => fitView(), 300);
        
        // Explicitly generate child nodes for API response after a short delay
        setTimeout(() => {
          try {
            logger.debug('Explicitly generating child nodes for API response', { nodeId });
            handleGenerateChildNodes(
              nodeId,
              isCustom ? question : question,
              answer,
              followUpQuestions
            );
          } catch (error) {
            logger.error('Error generating child nodes for API response', { 
              nodeId, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }, 500);
      }
    } catch (error) {
      logger.error('Error processing follow-up question', { 
        nodeId, 
        question, 
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error 
      });
    }
  };

  const handleGenerateChildNodes = (
    parentId: string, 
    parentQuestion: string, 
    parentAnswer: string, 
    followUpQuestions: string[]
  ) => {
    // Add detailed debug logging for the input parameters
    logger.debug('handleGenerateChildNodes called with:', {
      parentId,
      parentQuestionLength: parentQuestion.length,
      parentAnswerLength: parentAnswer.length,
      followUpQuestionsCount: followUpQuestions.length,
      followUpQuestions: followUpQuestions.map(q => q.substring(0, 30) + (q.length > 30 ? '...' : '')),
      isInTrackingSet: nodesWithGeneratedChildren.current.has(parentId)
    });
    
    // Check if this node has already generated children to prevent duplicates
    // Only skip if there are actual follow-up questions AND the node is already tracked
    if (nodesWithGeneratedChildren.current.has(parentId) && followUpQuestions.length > 0) {
      logger.info('Node has already generated children, skipping', { parentId });
      // MODIFICATION: Print the current tracking set for debugging
      logger.debug('Current tracking set:', { 
        size: nodesWithGeneratedChildren.current.size,
        trackedIds: Array.from(nodesWithGeneratedChildren.current).join(', ')
      });
      return;
    }
    
    // If there are no follow-up questions, log and return
    if (followUpQuestions.length === 0) {
      logger.info('No follow-up questions to generate for node', { parentId });
      // Still mark as processed to prevent further attempts
      nodesWithGeneratedChildren.current.add(parentId);
      return;
    }
    
    // Log before generating
    logger.info('Generating child nodes for parent node', { 
      parentId, 
      questionCount: followUpQuestions.length
    });
  
    // Array to track created node IDs for edge creation
    const newNodeIds: string[] = [];
    
    // IMPORTANT: Mark as generated now to prevent race conditions
    // Add this node to tracking set BEFORE processing to prevent duplicate generation
    nodesWithGeneratedChildren.current.add(parentId);
    logger.debug('Marked node for child generation:', { 
      parentId, 
      trackedNodesCount: nodesWithGeneratedChildren.current.size
    });
    
    // Calculate positions for child nodes
    setNodes(currentNodes => {
      try {
        // Find the parent node to determine where to position children
        const parentNode = currentNodes.find(node => node.id === parentId);
        
        if (!parentNode) {
          logger.error('Parent node not found for generating children', { 
            parentId, 
            availableIds: currentNodes.map(n => n.id).join(', ') 
          });
          return currentNodes;
        }
        
        // Calculate positions for child nodes
        const childPositions = calculateNodePositions(
          parentId,
          followUpQuestions.length,
          currentNodes,
          edges
        );
        
        if (!childPositions || childPositions.length === 0) {
          logger.error('Failed to calculate child positions', { parentId });
          return currentNodes;
        }
        
        // Create an array for the new nodes we'll add
        const newNodes: Node[] = [];
        
        // Add follow-up question nodes
        followUpQuestions.forEach((question, index) => {
          try {
            // Generate a unique, stable ID for each child node
            const childId = `followup-${parentId}-${index}`;
            
            // Store the ID for edge creation later
            newNodeIds.push(childId);
            
            // Create the follow-up node with appropriate position from our calculated positions
            const childNode = {
              id: childId,
              type: 'followUp',
              position: childPositions[index] || { x: 0, y: 0 },
              data: {
                id: childId,
                question,
                parentQuestion,
                parentAnswer,
                onFollowUp: handleFollowUpQuestion,
                onGenerateChildNodes: handleGenerateChildNodes,
                onCreateCustomFollowUp: handleCreateCustomFollowUp,
                onResize: handleNodeResize,
                onNodeHover: handleNodeHover,
                onTopicClick: handleTopicClick
              }
            };
            
            // Add the new node to our array
            newNodes.push(childNode);
            
            logger.debug('Created follow-up node', {
              id: childId,
              question: question.substring(0, 20) + (question.length > 20 ? '...' : ''),
              position: childPositions[index]
            });
          } catch (nodeCreationError) {
            logger.error('Error creating follow-up node', {
              question,
              index,
              error: nodeCreationError instanceof Error ? nodeCreationError.message : 'Unknown error'
            });
          }
        });
        
        // Log counts for debugging
        logger.debug('Generated child nodes', {
          parentId,
          childCount: newNodes.length,
          positions: childPositions.length
        });
        
        // Successful node creation - now we can mark the parent as having generated children
        if (newNodes.length > 0) {
          // Mark this node as having generated children AFTER successful node creation
          nodesWithGeneratedChildren.current.add(parentId);
          
          logger.debug('Marked node as having generated children', { 
            parentId, 
            childCount: newNodes.length
          });
        }
        
        // Apply changes to state
        setNodes(prev => [...prev, ...newNodes]);
        setEdges(prev => [...prev, ...newNodes.map(node => createEdge(parentId, node.id))]);
        
        // Auto-fit view to include the new nodes
        setTimeout(() => fitView(), 300);
        
        logger.debug('Successfully generated child nodes', { count: newNodes.length });
        
        return newNodes.length > 0 ? [...currentNodes, ...newNodes] : currentNodes;
      } catch (nodesError) {
        logger.error('Error in node creation', {
          parentId,
          error: nodesError instanceof Error ? nodesError.message : 'Unknown error'
        });
        return currentNodes; // Return unchanged if error
      }
    });
    
    // Create new edges connecting parent to all child nodes
    setTimeout(() => {
      setEdges(currentEdges => {
        try {
          const newEdges = [...currentEdges];
          
          // Create edges from parent to each new child node
          newNodeIds.forEach(childId => {
            const edgeId = `edge-${parentId}-to-${childId}`;
            
            // Check if edge already exists to prevent duplicates
            if (!currentEdges.some(edge => edge.id === edgeId)) {
              newEdges.push(createEdge(parentId, childId));
            }
          });
          
          logger.debug('Created edges for child nodes', {
            parentId,
            edgeCount: newEdges.length - currentEdges.length,
            nodeIds: newNodeIds.join(', ')
          });
          
          return newEdges;
        } catch (error) {
          logger.error('Error creating edges for child nodes', { 
            parentId, 
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error 
          });
          return currentEdges;
        }
      });
      
      // Auto-fit view to ensure all nodes are visible
      setTimeout(() => fitView(), 300);
    }, 100);
  };

  const handleNodeSelection = (nodeId: string, selected: boolean) => {
    setSelectedNodes(prev => {
      if (selected) {
        // Add node to selection
        return [...prev, nodeId];
      } else {
        // Remove node from selection
        return prev.filter(id => id !== nodeId);
      }
    });
  };

  // Create a custom follow-up input node when the "Ask follow-up" button is clicked
  const handleCreateCustomFollowUp = (parentId: string) => {
    logger.info('Creating custom follow-up input node', { parentId });
    
    try {
      // Generate a unique ID for the new node
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000000); // Add randomness for unique IDs
      const newNodeId = `follow-up-input-${parentId}-${timestamp}-${randomSuffix}`;
      
      // Instead of trying to find the parent node from the current state, 
      // we'll use the currentNodes parameter inside the setNodes function
      setNodes(currentNodes => {
        try {
          // Find parent node in the current state
          const parentNode = currentNodes.find(node => node.id === parentId);
          
          // Default position in case parent node is not found
          let position = { x: 400, y: 300 };
          
          if (!parentNode) {
            // Log the error and available nodes to help diagnose the issue
            logger.error('Parent node not found for custom follow-up', { 
              parentId, 
              availableNodeIds: currentNodes.map(n => n.id)
            });
            
            // Try to find any existing nodes to position relative to them
            if (currentNodes.length > 0) {
              // Get the rightmost node as a reference point
              const rightmostNode = currentNodes.reduce((maxNode, node) => 
                node.position.x > maxNode.position.x ? node : maxNode, currentNodes[0]);
              
              // Position to the right of the rightmost node
              position = { 
                x: rightmostNode.position.x + GRID_HORIZONTAL_SPACING, 
                y: rightmostNode.position.y 
              };
              
              logger.debug('Using fallback position based on rightmost node', {
                nodeId: rightmostNode.id,
                position
              });
            } else {
              logger.debug('Using default fallback position', { position });
            }
          } else {
            // Calculate position based on the parent node (normal case)
            position = { 
              x: parentNode.position.x + GRID_HORIZONTAL_SPACING, 
              y: parentNode.position.y 
            };
          }
          
          // Check for overlaps with existing nodes and adjust if needed
          const adjustedPosition = avoidOverlap(position, currentNodes);
          
          // Create the new follow-up input node
          const newNode: Node = {
            id: newNodeId,
            type: 'followUp',
            position: adjustedPosition,
            data: {
              id: newNodeId,
              question: '',
              isInput: true, // Mark this as an input node
              isCustom: true,
              hasBeenAnswered: false,
              onFollowUp: handleFollowUpQuestion,
              onGenerateChildNodes: handleGenerateChildNodes,
              onCreateCustomFollowUp: handleCreateCustomFollowUp,
              onResize: handleNodeResize,
              onNodeHover: handleNodeHover
            }
          };
          
          logger.debug('Created follow-up input node', { 
            id: newNodeId, 
            position: adjustedPosition,
            parentId
          });
          
          // Create an edge connecting the parent to the new node after the node is added
          setTimeout(() => {
            try {
              // Only create an edge if the parent node exists
              if (parentNode) {
                // Add uniqueness with timestamp and random number to prevent collisions
                const uniqueEdgeId = `edge-${parentId}-to-${newNodeId}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
                
                setEdges(currentEdges => {
                  try {
                    // Check if an edge with similar source/target already exists to prevent duplicates
                    const existingEdge = currentEdges.find(edge => 
                      edge.source === parentId && edge.target === newNodeId);
                    
                    // If edge already exists, don't create another one
                    if (existingEdge) {
                      logger.warn('Edge already exists, not creating duplicate', {
                        existing: existingEdge.id,
                        source: parentId,
                        target: newNodeId
                      });
                      return currentEdges;
                    }
                    
                    const newEdge: Edge = {
                      id: uniqueEdgeId,
                      source: parentId,
                      target: newNodeId,
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: '#6366F1'
                      },
                      animated: true,
                      style: { 
                        stroke: '#6366F1',
                        strokeWidth: 2,
                        opacity: 0.8
                      },
                      type: 'smoothstep'
                    };
                    
                    logger.debug('Created edge to follow-up input node', { 
                      edgeId: uniqueEdgeId, 
                      parentId, 
                      targetId: newNodeId 
                    });
                    
                    return [...currentEdges, newEdge];
                  } catch (edgeError) {
                    logger.error('Error creating edge for follow-up input node', {
                      parentId,
                      targetId: newNodeId,
                      error: edgeError instanceof Error ? edgeError.message : 'Unknown error'
                    });
                    return currentEdges; // Return unchanged edges if error
                  }
                });
              } else {
                logger.warn('Edge not created since parent node was not found', {
                  parentId,
                  targetId: newNodeId
                });
              }
              
              // Auto-fit view to ensure the new node is visible
              if (reactFlowInstance) {
                reactFlowInstance.fitView({ 
                  padding: 0.3,
                  includeHiddenNodes: false,
                  duration: 500
                });
              }
            } catch (edgeSetupError) {
              logger.error('Error in edge creation process', {
                parentId,
                targetId: newNodeId,
                error: edgeSetupError instanceof Error ? edgeSetupError.message : 'Unknown error'
              });
            }
          }, 50); // Short delay to ensure node is in state
          
          // Return the updated nodes with the new node added
          return [...currentNodes, newNode];
        } catch (nodeCreationError) {
          logger.error('Error in node creation process', {
            parentId,
            error: nodeCreationError instanceof Error ? nodeCreationError.message : 'Unknown error'
          });
          return currentNodes; // Return unchanged nodes if error
        }
      });
      
    } catch (error) {
      logger.error('Error creating custom follow-up input node', { 
        parentId, 
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error 
      });
    }
  };

  const handleSynthesizeClick = () => {
    if (selectedNodes.length === 0) {
      // Enter selection mode
      setIsSynthesizeMode(true);
      logger.info('Entered synthesize mode');
    } else {
      // Perform synthesis with selected nodes
      synthesizeNodes();
    }
  };

  const extractNodeContents = (nodeIds: string[]): string[] => {
    return nodeIds.map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      
      // Check for both traditional response nodes and answered follow-up nodes
      if (node) {
        if (node.type === 'response' && node.data) {
          return `Question: ${node.data.query}\nAnswer: ${node.data.content}`;
        } else if (node.type === 'followUp' && node.data && node.data.hasBeenAnswered) {
          return `Question: ${node.data.question}\nAnswer: ${node.data.answer}`;
        }
      }
      return '';
    }).filter(content => content !== '');
  };

  const synthesizeNodes = async () => {
    if (selectedNodes.length === 0) {
      setSynthesisFeedback('Please select at least one node for synthesis.');
      return;
    }
    
    setIsProcessingSynthesis(true);
    setSynthesisFeedback('Processing synthesis...');
    
    try {
      logger.info('Synthesizing selected nodes', { selectedNodes });
      
      // Extract content from selected nodes
      const nodeContents = extractNodeContents(selectedNodes);
      
      if (nodeContents.length === 0) {
        throw new Error('No valid content found in selected nodes');
      }
      
      // Call Claude API for synthesis
      try {
        logger.info('Calling Claude API for synthesis', { 
          selectedNodesCount: selectedNodes.length,
          hasCustomPrompt: !!customSynthesisPrompt
        });
        
        const apiResponse = await claudeApi.synthesize(nodeContents, customSynthesisPrompt || undefined);
        
        if (!apiResponse.success || !apiResponse.data) {
          throw new Error(apiResponse.error || 'API returned unsuccessful response');
        }
        
        // Create a new artifact from the API response
        const newArtifact: SynthesisArtifact = {
          id: `artifact-${Date.now()}`,
          title: apiResponse.data.title,
          content: apiResponse.data.content,
          canvasId: canvasId || 'temp-canvas',
          createdAt: new Date().toISOString()
        };
        
        // Add to artifacts list
        setArtifacts(prev => [newArtifact, ...prev]);
        
        logger.info('Synthesis complete', { artifactId: newArtifact.id });
      } catch (apiError) {
        logger.error('Error calling Claude API for synthesis', { 
          error: apiError instanceof Error ? apiError.message : 'Unknown error' 
        });
        
        // Fallback to mock data if API call fails
        logger.info('Using mock synthesis response as fallback');
        
        // In a real app, we would call the API
        // For now, simulate a delay and return mock data
        const mockSynthesisResponse = await new Promise<{title: string, content: string}>((resolve) => {
          setTimeout(() => {
            resolve({
              title: "Synthesis of Selected Insights",
              content: "This synthesis combines the key points from the selected nodes:\n\n" +
                "1. The primary challenge identified relates to understanding complex systems.\n\n" +
                "2. Multiple approaches can be effective, including analytical and holistic methods.\n\n" +
                "3. Further exploration should focus on integrating diverse perspectives.\n\n" +
                "These insights suggest that a comprehensive approach is needed that acknowledges both the details and the broader context."
            });
          }, 2000);
        });
        
        // Create a new artifact from the mock response
        const newArtifact: SynthesisArtifact = {
          id: `artifact-${Date.now()}`,
          title: mockSynthesisResponse.title,
          content: mockSynthesisResponse.content,
          canvasId: canvasId || 'temp-canvas',
          createdAt: new Date().toISOString()
        };
        
        // Add to artifacts list
        setArtifacts(prev => [newArtifact, ...prev]);
        
        setSynthesisFeedback('Using mock data due to API error.');
        logger.info('Synthesis complete (using mock data)', { artifactId: newArtifact.id });
      }
      
      // Reset synthesis state
      setIsSynthesizeMode(false);
      setSelectedNodes([]);
      setCustomSynthesisPrompt('');
      setSynthesisFeedback('');
    } catch (error) {
      logger.error('Error synthesizing nodes', error);
      setSynthesisFeedback('Failed to synthesize: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessingSynthesis(false);
    }
  };

  // Handle the node drag
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Update node selection state in ReactFlow nodes
  useEffect(() => {
    setNodes(nds => 
      nds.map(node => {
        if (node.type === 'response') {
          return {
            ...node,
            data: {
              ...node.data,
              isSelected: selectedNodes.includes(node.id)
            }
          };
        }
        return node;
      })
    );
  }, [selectedNodes, setNodes]);

  // Cancel synthesize mode if escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSynthesizeMode) {
        setIsSynthesizeMode(false);
        setSelectedNodes([]);
        logger.info('Synthesize mode canceled');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSynthesizeMode]);

  // Make sure there's an onInit handler in the ReactFlow component
  const onInit = (instance: ReactFlowInstance) => {
    logger.debug('ReactFlow initialized');
    setReactFlowInstance(instance);
  };

  // Reset tracked nodes when the canvas is reset
  const resetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    nodesWithGeneratedChildren.current.clear(); // Clear the tracked nodes
  }, []);

  // Add this function inside the MindMapCanvas component
  const handleNodeUpdate = (nodeId: string, updatedData: any) => {
    logger.info('Updating node data', { nodeId, updatedData });
    
    setNodes(nds => 
      nds.map(node => {
        if (node.id === nodeId) {
          // Update node data while preserving existing properties
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedData,
              isEdited: true,
              lastEditedAt: new Date().toISOString(),
            }
          };
        }
        return node;
      })
    );
  };

  // Add a function to fit the view
  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      // Add a slight delay to allow for transitions/animations to complete
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.2, 
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5
        });
        logger.debug('Auto-fitted view after canvas change');
      }, 100);
    }
  }, [reactFlowInstance]);
  
  // Handle node resize events
  const handleNodeResize = useCallback((nodeId: string, expanded: boolean) => {
    logger.debug('Node resize detected', { nodeId, expanded });
    fitView();
  }, [fitView]);

  // Function to create a response node
  const createResponseNode = useCallback((parentId: string, content: string, position: { x: number, y: number }) => {
    const nodeId = `response-${Date.now()}`;
    logger.debug('Creating response node', { nodeId, parentId, contentLength: content.length });
    
    const responseNode = {
      id: nodeId,
      type: 'response',
      position,
      data: {
        id: nodeId,
        content,
        onCreateFollowup: handleFollowUpQuestion,
        onNodeHover: handleNodeHover,
        onResize: handleNodeResize,
        onTopicClick: (topic: string, nodeId: string) => {
          // Safe access via ref
          if (topicClickRefHolder.current) {
            topicClickRefHolder.current(nodeId, topic);
          }
        }
      }
    };
    
    setNodes(currentNodes => [...currentNodes, responseNode]);
    
    // If there's a parent ID, create an edge connecting the parent to this node
    if (parentId) {
      const newEdge = {
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'mindmap-edge'
      };
      
      setEdges(currentEdges => {
        // Check if this edge already exists to prevent duplicates
        const edgeExists = currentEdges.some(
          edge => edge.source === parentId && edge.target === nodeId
        );
        
        if (edgeExists) {
          logger.warn('Prevented duplicate edge creation', { parentId, nodeId });
          return currentEdges;
        }
        
        logger.debug('Created edge', { source: parentId, target: nodeId });
        return [...currentEdges, newEdge];
      });
    }
    
    return nodeId;
  }, [handleFollowUpQuestion, handleNodeHover, handleNodeResize]);

  // Then define the handleTopicClick function and store it in the ref (around line 1489):
  const handleTopicClick = useCallback((parentNodeId: string, topic: string) => {
    logger.debug('Topic clicked:', { parentNodeId, topic });
    
    // Generate a unique ID for the topic node
    const topicNodeId = `topic-${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    // For demo purposes, create a placeholder explanation
    // In a real app, this would come from an API call to Claude
    const explanation = `This is a placeholder explanation for the topic "${topic}". In a full implementation, this would be generated by calling Claude API to get a detailed explanation of the topic.`;
    
    // Find the parent node to position the topic node relative to it
    // Use getNodes() to get the current nodes instead of using the nodes from the dependency array
    const nodesSnapshot = getNodes();
    const foundParentNode = nodesSnapshot.find(n => n.id === parentNodeId);
    if (!foundParentNode) {
      logger.error('Parent node not found', { parentNodeId });
      return;
    }
    
    // Calculate an angle and distance for a natural-looking placement
    // This will place the topic node in a semi-random position around the parent
    const angle = Math.random() * Math.PI * 2; // Random angle around the circle
    const distance = 300 + Math.random() * 100; // Distance from parent node
    
    const topicNodePosition = {
      x: foundParentNode.position.x + Math.cos(angle) * distance,
      y: foundParentNode.position.y + Math.sin(angle) * distance,
    };
    
    // Create the topic node
    const topicNode = {
      id: topicNodeId,
      type: 'topic',
      position: topicNodePosition,
      data: {
        id: topicNodeId,
        topic,
        explanation,
        canvasId,
        onSelect: handleNodeSelection,
        onNodeHover: handleNodeHover,
        onResize: handleNodeResize
      },
    };
    
    // Add the node to the canvas
    setNodes((currentNodes) => [...currentNodes, topicNode]);
    
    // Add an edge from the parent to the topic node
    const topicEdgeId = `edge-${parentNodeId}-to-${topicNodeId}`;
    const topicEdge = {
      id: topicEdgeId,
      source: parentNodeId,
      target: topicNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 }, // Indigo color for topic connections
    };
    
    setEdges((currentEdges) => [...currentEdges, topicEdge]);
    
    // Fit the view to make sure the new node is visible
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false });
      }
    }, 100);
  }, [canvasId, handleNodeHover, handleNodeResize, handleNodeSelection, getNodes, reactFlowInstance, setEdges, setNodes]);

  // Store the function in the ref
  useEffect(() => {
    topicClickRefHolder.current = handleTopicClick;
  }, [handleTopicClick]);

  // Make sure nodeTypes are memoized - add this at the top-level of the component
  // Right below the const declarations for dimensions around line 40
  const memoizedNodeTypes = useMemo(() => NODE_TYPES, []);

  // Define edge types and memoize them to prevent re-renders
  const EDGE_TYPES = {};
  const memoizedEdgeTypes = useMemo(() => EDGE_TYPES, []);

  return (
    <div className="h-full flex">
      {/* Left Sidebar */}
      <LeftSidebar currentCanvasId={canvasId} />
      
      {/* Main Canvas */}
      <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={memoizedNodeTypes}
          edgeTypes={memoizedEdgeTypes}
          onDragOver={onDragOver}
          fitView
          onInit={onInit}
        >
          <Background />
          <Controls />
        </ReactFlow>
        
        {/* Synthesize UI */}
        {isSynthesizeMode && (
          <div className="absolute bottom-4 right-4 left-4 bg-white p-4 rounded-lg shadow-lg border border-indigo-200">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-gray-800">Select response nodes to synthesize</span>
              <button
                onClick={() => {
                  setIsSynthesizeMode(false);
                  setSelectedNodes([]);
                  setCustomSynthesisPrompt('');
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              {selectedNodes.length === 0 
                ? 'Click on response nodes to select them for synthesis' 
                : `Selected ${selectedNodes.length} node(s)`}
            </p>
            
            {selectedNodes.length > 0 && (
              <div className="mb-4">
                <label htmlFor="synthesis-prompt" className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Synthesis Prompt (optional)
                </label>
                <textarea
                  id="synthesis-prompt"
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Enter a custom prompt for synthesis or leave blank to use the default prompt..."
                  value={customSynthesisPrompt}
                  onChange={(e) => setCustomSynthesisPrompt(e.target.value)}
                ></textarea>
              </div>
            )}
            
            {synthesisFeedback && (
              <div className="text-sm text-amber-600 mb-4">
                {synthesisFeedback}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsSynthesizeMode(false);
                  setSelectedNodes([]);
                  setCustomSynthesisPrompt('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isProcessingSynthesis}
              >
                Cancel
              </button>
              <button
                onClick={synthesizeNodes}
                disabled={selectedNodes.length === 0 || isProcessingSynthesis}
                className={`px-4 py-2 rounded-md ${
                  selectedNodes.length > 0 && !isProcessingSynthesis
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessingSynthesis ? 'Synthesizing...' : 'Synthesize Now!'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Sidebar */}
      <RightSidebar 
        currentCanvasId={canvasId} 
        onSynthesizeClick={handleSynthesizeClick}
        artifacts={artifacts}
      />
    </div>
  );
};

export default MindMapCanvas; 