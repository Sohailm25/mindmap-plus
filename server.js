import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './server/config/db.js';
import localDB from './server/config/localDB.js';
import claudeService from './server/services/claudeService.js';
import nodeRoutes from './server/routes/nodeRoutes.js';
import summaryRoutes from './server/routes/summaryRoutes.js';
import claudeRoutes from './server/routes/claudeRoutes.js';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const initializeDB = async () => {
  if (process.env.NODE_ENV === 'production') {
    await connectDB();
  } else {
    console.log('Using local in-memory database for development');
  }
};

// Call the database initialization
initializeDB();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, { 
    ip: req.ip, 
    userAgent: req.headers['user-agent'] 
  });
  next();
});

// API routes
app.use('/api/node', nodeRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/claude', claudeRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'MindMap+ API Server',
    version: '1.0.0',
    endpoints: {
      test: '/api/test',
      claudeQuery: '/api/claude/query',
      claudeFollowUp: '/api/claude/follow-up',
      claudeSynthesize: '/api/claude/synthesize',
      canvas: '/api/canvas',
      synthesis: '/api/synthesis',
      node: '/api/node',
      summary: '/api/summary'
    }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Claude API routes
app.post('/api/claude/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }
    
    const response = await claudeService.processInitialQuery(query);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process query'
    });
  }
});

app.post('/api/claude/follow-up', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }
    
    if (!context || !Array.isArray(context)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Context must be an array' 
      });
    }
    
    const response = await claudeService.processFollowUpQuery(query, context);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing follow-up query:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process follow-up query'
    });
  }
});

app.post('/api/claude/synthesize', async (req, res) => {
  try {
    const { contexts, customPrompt } = req.body;
    
    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one context is required' 
      });
    }
    
    const response = await claudeService.synthesize(contexts, customPrompt);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error synthesizing insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to synthesize insights'
    });
  }
});

// Canvas routes (using localDB for development)
app.post('/api/canvas', async (req, res) => {
  try {
    const { title, userId, nodes, edges, initialQuery } = req.body;
    
    if (!title || !userId || !initialQuery) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, userId, and initialQuery are required' 
      });
    }
    
    const canvas = await localDB.createCanvas({
      title,
      userId,
      nodes: nodes || [],
      edges: edges || [],
      initialQuery
    });
    
    res.status(201).json({
      success: true,
      data: canvas
    });
  } catch (error) {
    console.error('Error creating canvas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create canvas'
    });
  }
});

app.get('/api/canvas/:id', async (req, res) => {
  try {
    const canvas = await localDB.getCanvasById(req.params.id);
    
    if (!canvas) {
      return res.status(404).json({ 
        success: false, 
        error: 'Canvas not found' 
      });
    }
    
    res.json({
      success: true,
      data: canvas
    });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch canvas'
    });
  }
});

app.get('/api/canvas/user/:userId', async (req, res) => {
  try {
    const canvases = await localDB.getCanvasByUserId(req.params.userId);
    
    res.json({
      success: true,
      data: canvases
    });
  } catch (error) {
    console.error('Error fetching user canvases:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user canvases'
    });
  }
});

app.put('/api/canvas/:id', async (req, res) => {
  try {
    const { title, nodes, edges } = req.body;
    
    const updatedCanvas = await localDB.updateCanvas(req.params.id, {
      ...(title && { title }),
      ...(nodes && { nodes }),
      ...(edges && { edges })
    });
    
    if (!updatedCanvas) {
      return res.status(404).json({ 
        success: false, 
        error: 'Canvas not found' 
      });
    }
    
    res.json({
      success: true,
      data: updatedCanvas
    });
  } catch (error) {
    console.error('Error updating canvas:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update canvas'
    });
  }
});

// Synthesis artifact routes
app.post('/api/synthesis', async (req, res) => {
  try {
    const { title, content, mindmapId, selectedNodes, customPrompt } = req.body;
    
    if (!title || !content || !mindmapId || !selectedNodes) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, content, mindmapId, and selectedNodes are required' 
      });
    }
    
    const artifact = await localDB.createArtifact({
      title,
      content,
      mindmapId,
      selectedNodes,
      customPrompt
    });
    
    res.status(201).json({
      success: true,
      data: artifact
    });
  } catch (error) {
    console.error('Error creating synthesis artifact:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create synthesis artifact'
    });
  }
});

app.get('/api/synthesis/mindmap/:mindmapId', async (req, res) => {
  try {
    const artifacts = await localDB.getArtifactsByMindmapId(req.params.mindmapId);
    
    res.json({
      success: true,
      data: artifacts
    });
  } catch (error) {
    console.error('Error fetching synthesis artifacts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch synthesis artifacts'
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, 'dist')));

  // Any route that is not an API route will be redirected to the frontend
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`Error ${statusCode}: ${err.message}`, { stack: err.stack });
  res.status(statusCode).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Export app for testing
export default app; 