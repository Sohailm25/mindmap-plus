import express from 'express';
import claudeService from '../services/claudeService.js';

const router = express.Router();

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
    
    console.log('Claude API query received:', query);
    console.log('ENV variables:', {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'Set (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'Not set',
      CLAUDE_MODEL: process.env.CLAUDE_MODEL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    console.log('About to call claudeService.processInitialQuery');
    const response = await claudeService.processInitialQuery(query);
    console.log('Response received from claudeService:', { 
      hasAnswer: !!response.answer, 
      followUpCount: response.followUpQuestions?.length 
    });
    
    return res.json({
      success: true,
      data: {
        answer: response.answer,
        followUpQuestions: response.followUpQuestions
      }
    });
  } catch (error) {
    console.error('Error processing query:', error);
    console.error('Error details:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to process query: ' + (error.message || 'Unknown error')
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
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    // Validate context is an array
    if (!context || !Array.isArray(context)) {
      return res.status(400).json({
        success: false,
        error: 'Context must be an array'
      });
    }
    
    const response = await claudeService.processFollowUpQuery(query, context);
    
    return res.json({
      success: true,
      data: {
        answer: response.answer,
        followUpQuestions: response.followUpQuestions
      }
    });
  } catch (error) {
    console.error('Error processing follow-up query:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process follow-up query: ' + (error.message || 'Unknown error')
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
    
    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one context is required for synthesis'
      });
    }
    
    const response = await claudeService.synthesize(contexts, customPrompt);
    
    return res.json({
      success: true,
      data: {
        title: response.title,
        content: response.content
      }
    });
  } catch (error) {
    console.error('Error synthesizing insights:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to synthesize insights: ' + (error.message || 'Unknown error')
    });
  }
});

export default router; 