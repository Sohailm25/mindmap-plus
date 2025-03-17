// User type
export interface User {
  id: string;
  name: string;
  email: string;
}

// Node types
export enum NodeType {
  RESPONSE = 'response',
  FOLLOW_UP = 'followUp'
}

// Attachment interface
export interface Attachment {
  id?: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

// Source interface
export interface Source {
  id?: string;
  text: string;
  url?: string;
  addedAt: string;
}

// Node interface
export interface MindMapNode {
  id: string;
  type: NodeType;
  content: string;
  position: {
    x: number;
    y: number;
  };
  isEdited?: boolean;
  originalContent?: string;
  lastEditedAt?: string;
  attachments?: Attachment[];
  sources?: Source[];
  data?: any;
}

// Summary interface
export interface Summary {
  id?: string;
  title: string;
  content: string;
  createdAt: string;
}

// Canvas (Mind Map) interface
export interface Canvas {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  initialQuery: string;
  summaries?: Summary[];
}

// Synthesis Artifact interface
export interface SynthesisArtifact {
  id: string;
  title: string;
  content: string;
  canvasId: string;
  createdAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Claude API request types
export interface ClaudeQueryRequest {
  query: string;
  context?: string;
}

export interface ClaudeFollowUpRequest {
  query: string;
  context: string[];
}

export interface ClaudeSynthesisRequest {
  contexts: string[];
  customPrompt?: string;
}

export interface ClaudeResponse {
  answer: string;
  followUpQuestions: string[];
}

export interface ResponseData {
  answer: string;
  followUpQuestions: string[];
} 