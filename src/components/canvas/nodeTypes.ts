import ResponseNode from './ResponseNode';
import FollowUpNode from './FollowUpNode';
import TopicNode from './TopicNode';
import { NodeTypes, EdgeTypes } from 'reactflow';

// Define nodeTypes as a singleton
export const nodeTypes: NodeTypes = {
  response: ResponseNode,
  followUp: FollowUpNode,
  topic: TopicNode,
} as const;

// Define edgeTypes as a singleton
export const edgeTypes: EdgeTypes = {} as const; 