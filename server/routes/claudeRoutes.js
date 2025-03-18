import express from 'express';
import claudeService from '../services/claudeService.js';

const router = express.Router();

// Middleware to log requests
router.use((req, res, next) => {
  console.log('Request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    headers: req.headers
  });
  next();
});

/**
 * @route   GET /api/claude/test
 * @desc    Test route to verify Claude API setup
 * @access  Public
 */
router.get('/test', (req, res) => {
  try {
    console.log('Claude API test route hit');
    console.log('ENV variables:', {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'Not set',
      CLAUDE_MODEL: process.env.CLAUDE_MODEL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    res.json({
      success: true,
      message: 'Claude routes are working!',
      env: {
        has_api_key: !!process.env.ANTHROPIC_API_KEY,
        api_key_length: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
        model: process.env.CLAUDE_MODEL || 'default'
      }
    });
  } catch (error) {
    console.error('Error in test route:', error);
    res.status(500).json({
      success: false,
      error: 'Test route error: ' + error.message
    });
  }
});

/**
 * @route   POST /api/claude/query
 * @desc    Process initial query with Claude
 * @access  Public
 */
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Invalid query format. Query must be a non-empty string.'
      });
    }
    
    console.log('Claude API query received:', query);
    console.log('ENV variables:', {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `Set (length: ${process.env.ANTHROPIC_API_KEY.length})` : 'Not set',
      CLAUDE_MODEL: process.env.CLAUDE_MODEL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    console.log('About to call claudeService.processInitialQuery');
    const response = await claudeService.processInitialQuery(query);
    
    // Log the response for debugging
    console.log('Response received from claudeService:', {
      hasAnswer: !!response.answer,
      followUpCount: response.followUpQuestions?.length
    });
    
    return res.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    console.error('Error details:', error.message);
    
    return res.status(500).json({
      error: 'Failed to process query',
      details: error.message,
      mockData: true,
      ...claudeService.MOCK_DATA
    });
  }
});

/**
 * @route   POST /api/claude/follow-up
 * @desc    Process follow-up query with Claude
 * @access  Public
 */
router.post('/follow-up', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Invalid query format. Query must be a non-empty string.'
      });
    }
    
    if (!Array.isArray(context)) {
      return res.status(400).json({
        error: 'Invalid context format. Context must be an array.'
      });
    }
    
    console.log('Follow-up query received:', { query, contextLength: context.length });
    const response = await claudeService.processFollowUpQuery(query, context);
    
    return res.json(response);
  } catch (error) {
    console.error('Error processing follow-up query:', error);
    
    return res.status(500).json({
      error: 'Failed to process follow-up query',
      details: error.message,
      mockData: true,
      ...claudeService.MOCK_DATA
    });
  }
});

/**
 * @route   POST /api/claude/synthesize
 * @desc    Synthesize insights from multiple nodes
 * @access  Public
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { contexts, customPrompt } = req.body;
    
    if (!Array.isArray(contexts)) {
      return res.status(400).json({
        error: 'Invalid contexts format. Contexts must be an array.'
      });
    }
    
    console.log('Synthesis request received:', {
      contextCount: contexts.length,
      hasCustomPrompt: !!customPrompt
    });
    
    const response = await claudeService.synthesize(contexts, customPrompt);
    
    return res.json(response);
  } catch (error) {
    console.error('Error synthesizing insights:', error);
    
    return res.status(500).json({
      error: 'Failed to synthesize insights',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/claude/topic
 * @desc    Process topic explanation with Claude
 * @access  Public
 */
router.post('/topic', async (req, res) => {
  try {
    const { topic, context } = req.body;
    
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({
        error: 'Invalid topic format. Topic must be a non-empty string.'
      });
    }
    
    if (!Array.isArray(context)) {
      return res.status(400).json({
        error: 'Invalid context format. Context must be an array.'
      });
    }
    
    console.log('Topic explanation request received:', { topic, contextLength: context.length });
    const response = await claudeService.processTopic(topic, context);
    
    return res.json(response);
  } catch (error) {
    console.error('Error processing topic explanation:', error);
    
    return res.status(500).json({
      error: 'Failed to process topic explanation',
      details: error.message,
      explanation: `Failed to generate explanation for "${req.body?.topic || 'unknown topic'}". Please try again later.`
    });
  }
});

export default router; 