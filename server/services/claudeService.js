import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Claude API base URL
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Claude API key
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;

// Check if API key is available
if (!CLAUDE_API_KEY) {
  console.error('Claude API key not found. Please set ANTHROPIC_API_KEY in your .env file.');
}

// Claude API service
const claudeService = {
  /**
   * Process an initial query
   * @param {string} query - The user's question or reflection
   * @returns {Promise<Object>} - Claude's response with answer and follow-up questions
   */
  async processInitialQuery(query) {
    try {
      console.log('Processing initial query:', query);
      console.log('Claude API URL:', CLAUDE_API_URL);
      console.log('API Key status:', CLAUDE_API_KEY ? `Set (length: ${CLAUDE_API_KEY.length})` : 'Not set');
      console.log('Claude model:', process.env.CLAUDE_MODEL || 'claude-3-opus-20240229');
      
      // Log headers for debugging
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      };
      console.log('Request headers:', Object.keys(headers));
      
      const response = await axios.post(
        CLAUDE_API_URL,
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `I have a question or reflection I'd like to explore: "${query}"
              
              Please provide:
              1. A thoughtful, expanded answer to my question or reflection (2-3 paragraphs)
              2. At least three follow-up questions that would help me explore this topic further
              
              Format your response as a JSON object with the following structure:
              {
                "answer": "Your expanded answer here...",
                "followUpQuestions": ["Question 1", "Question 2", "Question 3"]
              }`
            }
          ]
        },
        {
          headers: headers
        }
      );
      
      console.log('Claude API response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        hasContent: !!response.data.content
      });
      
      // Extract the content from Claude's response
      const content = response.data.content[0].text;
      
      // Parse the JSON response
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        
        // Attempt to extract the answer and follow-up questions using regex
        const answerMatch = content.match(/\"answer\":\s*\"(.*?)\"/s);
        const followUpMatch = content.match(/\"followUpQuestions\":\s*\[(.*?)\]/s);
        
        const answer = answerMatch ? answerMatch[1].replace(/\\"/g, '"') : 'Could not parse answer';
        const followUpQuestionsStr = followUpMatch ? followUpMatch[1] : '"Could not parse follow-up questions"';
        
        // Try to parse the follow-up questions
        let followUpQuestions = [];
        try {
          followUpQuestions = JSON.parse(`[${followUpQuestionsStr}]`);
        } catch (e) {
          followUpQuestions = ['Could not parse follow-up questions'];
        }
        
        return {
          answer,
          followUpQuestions
        };
      }
    } catch (error) {
      console.error('Error calling Claude API:', error.response?.data || error.message);
      throw new Error('Failed to process query with Claude API');
    }
  },
  
  /**
   * Process a follow-up query
   * @param {string} query - The follow-up question
   * @param {Array<string>} context - Previous conversation context
   * @returns {Promise<Object>} - Claude's response with answer and follow-up questions
   */
  async processFollowUpQuery(query, context) {
    try {
      console.log('Processing follow-up query:', query);
      console.log('Context:', context);
      
      const messages = [
        {
          role: 'user',
          content: `Previous context: ${context.join('\n\n')}
          
          My follow-up question is: "${query}"
          
          Please provide:
          1. A thoughtful, expanded answer to my follow-up question (2-3 paragraphs)
          2. At least three additional follow-up questions that would help me explore this topic further
          
          Format your response as a JSON object with the following structure:
          {
            "answer": "Your expanded answer here...",
            "followUpQuestions": ["Question 1", "Question 2", "Question 3"]
          }`
        }
      ];
      
      const response = await axios.post(
        CLAUDE_API_URL,
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 4000,
          messages
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      // Extract the content from Claude's response
      const content = response.data.content[0].text;
      
      // Parse the JSON response
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        
        // Attempt to extract the answer and follow-up questions using regex
        const answerMatch = content.match(/\"answer\":\s*\"(.*?)\"/s);
        const followUpMatch = content.match(/\"followUpQuestions\":\s*\[(.*?)\]/s);
        
        const answer = answerMatch ? answerMatch[1].replace(/\\"/g, '"') : 'Could not parse answer';
        const followUpQuestionsStr = followUpMatch ? followUpMatch[1] : '"Could not parse follow-up questions"';
        
        // Try to parse the follow-up questions
        let followUpQuestions = [];
        try {
          followUpQuestions = JSON.parse(`[${followUpQuestionsStr}]`);
        } catch (e) {
          followUpQuestions = ['Could not parse follow-up questions'];
        }
        
        return {
          answer,
          followUpQuestions
        };
      }
    } catch (error) {
      console.error('Error calling Claude API:', error.response?.data || error.message);
      throw new Error('Failed to process follow-up query with Claude API');
    }
  },
  
  /**
   * Synthesize insights from multiple nodes
   * @param {Array<string>} contexts - Content from selected nodes
   * @param {string} customPrompt - Optional custom prompt for synthesis
   * @returns {Promise<Object>} - Claude's synthesized response
   */
  async synthesize(contexts, customPrompt) {
    try {
      console.log('Synthesizing insights from contexts:', contexts.length);
      
      const defaultPrompt = `I have selected multiple insights from my mind map exploration. Please synthesize these insights into a coherent summary with a meaningful title.
      
      Format your response as a JSON object with the following structure:
      {
        "title": "A meaningful title for the synthesis",
        "content": "The synthesized content..."
      }`;
      
      const prompt = customPrompt || defaultPrompt;
      
      const response = await axios.post(
        CLAUDE_API_URL,
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `${prompt}
              
              Here are the selected insights:
              ${contexts.map((context, index) => `[${index + 1}] ${context}`).join('\n\n')}`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      // Extract the content from Claude's response
      const content = response.data.content[0].text;
      
      // Parse the JSON response
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing Claude synthesis response:', parseError);
        
        // Attempt to extract the title and content using regex
        const titleMatch = content.match(/\"title\":\s*\"(.*?)\"/s);
        const contentMatch = content.match(/\"content\":\s*\"(.*?)\"/s);
        
        const title = titleMatch 
          ? titleMatch[1].replace(/\\"/g, '"') 
          : 'Synthesis ' + new Date().toLocaleString();
        
        const synthesizedContent = contentMatch 
          ? contentMatch[1].replace(/\\"/g, '"') 
          : 'Could not parse synthesized content. Please try again.';
        
        return {
          title,
          content: synthesizedContent
        };
      }
    } catch (error) {
      console.error('Error calling Claude API for synthesis:', error.response?.data || error.message);
      throw new Error('Failed to synthesize insights with Claude API');
    }
  }
};

export default claudeService; 