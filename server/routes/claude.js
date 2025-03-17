const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Claude API constants
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229';
const CLAUDE_API_VERSION = '2023-06-01';

// Helper function to call Claude API
async function callClaudeAPI(messages) {
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': CLAUDE_API_VERSION
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);
    throw error;
  }
}

// Process initial query
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Define system prompt that instructs Claude how to format response
    const systemMessage = {
      role: 'system',
      content: `You are an assistant integrated into a mind mapping tool. 
      Your responses will be displayed in a node, and follow-up questions will be displayed as child nodes.
      
      When responding to queries:
      1. Provide a clear, comprehensive answer to the user's question
      2. Generate 3-5 relevant follow-up questions that explore different aspects of the topic
      3. Format your response as a JSON object with two fields:
         - "answer": Your response to the query
         - "followUpQuestions": An array of follow-up questions
         
      For example, if asked about climate change, respond with:
      {
        "answer": "Climate change refers to long-term shifts in temperatures and weather patterns...",
        "followUpQuestions": [
          "What are the main causes of climate change?",
          "How might climate change impact global ecosystems?",
          "What international agreements address climate change?",
          "What can individuals do to reduce their carbon footprint?"
        ]
      }`
    };

    // Call Claude API
    const claudeResponse = await callClaudeAPI([
      systemMessage,
      { role: 'user', content: query }
    ]);

    // Parse the response to extract answer and follow-up questions
    // Claude should return JSON, but we'll handle it if it doesn't
    try {
      const content = claudeResponse.content[0].text;
      // Try to parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      return res.json({
        success: true,
        data: {
          answer: parsedResponse.answer,
          followUpQuestions: parsedResponse.followUpQuestions
        }
      });
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      
      // Fallback: If Claude didn't return JSON, extract what we can
      const content = claudeResponse.content[0].text;
      
      return res.json({
        success: true,
        data: {
          answer: content,
          followUpQuestions: [
            "Can you elaborate more on this topic?",
            "What are the practical applications of this information?",
            "Are there alternative perspectives worth considering?"
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error in /query endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing query: ' + (error.message || 'Unknown error')
    });
  }
});

// Process follow-up query
router.post('/follow-up', async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Define system prompt for follow-up
    const systemMessage = {
      role: 'system',
      content: `You are an assistant integrated into a mind mapping tool. 
      The user is asking a follow-up question to a previous response.
      I will provide the context of previous exchanges and the new follow-up question.
      
      When responding to follow-up queries:
      1. Use the provided context to ensure your response is relevant and builds on previous information
      2. Provide a clear, focused answer to the specific follow-up question
      3. Generate 2-3 relevant follow-up questions that explore different aspects of this sub-topic
      4. Format your response as a JSON object with two fields:
         - "answer": Your response to the follow-up query
         - "followUpQuestions": An array of additional follow-up questions
         
      For example:
      {
        "answer": "The main causes of climate change include greenhouse gas emissions from...",
        "followUpQuestions": [
          "How do fossil fuels specifically contribute to climate change?",
          "What role does deforestation play in greenhouse gas emissions?",
          "How do agricultural practices impact climate change?"
        ]
      }`
    };

    // Format the context for Claude
    let contextMessage = "Previous conversation context:\n\n";
    if (context && Array.isArray(context)) {
      contextMessage += context.join("\n\n");
    }
    
    // Call Claude API
    const claudeResponse = await callClaudeAPI([
      systemMessage,
      { role: 'user', content: `${contextMessage}\n\nFollow-up question: ${query}` }
    ]);

    // Parse the response to extract answer and follow-up questions
    try {
      const content = claudeResponse.content[0].text;
      // Try to parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      return res.json({
        success: true,
        data: {
          answer: parsedResponse.answer,
          followUpQuestions: parsedResponse.followUpQuestions
        }
      });
    } catch (parseError) {
      console.error('Error parsing Claude follow-up response:', parseError);
      
      // Fallback: If Claude didn't return JSON, extract what we can
      const content = claudeResponse.content[0].text;
      
      return res.json({
        success: true,
        data: {
          answer: content,
          followUpQuestions: [
            "Could you explain this further?",
            "How does this relate to the original topic?",
            "What are some examples of this in practice?"
          ]
        }
      });
    }
  } catch (error) {
    console.error('Error in /follow-up endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing follow-up query: ' + (error.message || 'Unknown error')
    });
  }
});

// Synthesize insights from multiple nodes
router.post('/synthesize', async (req, res) => {
  try {
    const { contexts, customPrompt } = req.body;

    if (!contexts || !Array.isArray(contexts) || contexts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one context is required for synthesis'
      });
    }

    // Define system prompt for synthesis
    const systemMessage = {
      role: 'system',
      content: `You are an assistant integrated into a mind mapping tool.
      The user has selected multiple nodes from their mind map and wants you to synthesize insights from them.
      I will provide the content of these nodes and any custom instructions from the user.
      
      When synthesizing content:
      1. Identify key themes, patterns, and connections across all selected nodes
      2. Highlight important insights, contradictions, or gaps in knowledge
      3. Organize the information in a coherent, logical structure
      4. Format your response as a JSON object with two fields:
         - "title": A concise, descriptive title for the synthesis
         - "content": The synthesized content, well-structured with headings and bullet points where appropriate
         
      For example:
      {
        "title": "Key Insights on Climate Change Mitigation Strategies",
        "content": "## Overview\\n\\nThe selected nodes discuss various approaches to climate change mitigation...\\n\\n### Common Themes\\n\\n1. Technology-based solutions...\\n2. Policy interventions...\\n\\n### Key Insights\\n\\n* The most effective strategies combine technological innovation with policy change\\n* Regional differences significantly impact implementation feasibility\\n* ..."
      }`
    };

    // Format the nodes content for Claude
    let nodesContent = "Content from selected mind map nodes:\n\n";
    contexts.forEach((context, index) => {
      nodesContent += `Node ${index + 1}:\n${context}\n\n`;
    });
    
    // Add custom prompt if provided
    if (customPrompt) {
      nodesContent += `\nUser's custom instructions for synthesis: ${customPrompt}`;
    }
    
    // Call Claude API
    const claudeResponse = await callClaudeAPI([
      systemMessage,
      { role: 'user', content: nodesContent }
    ]);

    // Parse the response to extract title and content
    try {
      const content = claudeResponse.content[0].text;
      // Try to parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      return res.json({
        success: true,
        data: {
          title: parsedResponse.title,
          content: parsedResponse.content
        }
      });
    } catch (parseError) {
      console.error('Error parsing Claude synthesis response:', parseError);
      
      // Fallback: If Claude didn't return JSON, use the raw response
      const content = claudeResponse.content[0].text;
      
      return res.json({
        success: true,
        data: {
          title: "Synthesis of Selected Nodes",
          content: content
        }
      });
    }
  } catch (error) {
    console.error('Error in /synthesize endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Error synthesizing content: ' + (error.message || 'Unknown error')
    });
  }
});

module.exports = router; 