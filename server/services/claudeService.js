import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Claude API base URL
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Claude API key
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds base delay
const RETRY_STATUS_CODES = [429, 500, 502, 503, 504, 529]; // Status codes that should trigger a retry

// Constants for rate limiting
const RATE_LIMIT = 4000; // tokens per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
let tokenUsage = 0;
let lastResetTime = Date.now();

// Check if API key is available
if (!CLAUDE_API_KEY) {
  console.error('Claude API key not found. Please set ANTHROPIC_API_KEY in your .env file.');
}

// Mock data for fallback
const MOCK_DATA = {
  answer: "This is a mock response. The Claude API is currently unavailable. Please try again later.",
  followUpQuestions: [
    "Would you like to try your query again?",
    "Would you like to explore a different topic?",
    "Would you like to wait a moment and try again?"
  ]
};

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check and update rate limit
const checkRateLimit = (requestTokens = 1000) => {
  const now = Date.now();
  if (now - lastResetTime >= RATE_LIMIT_WINDOW) {
    // Reset token usage after window expires
    tokenUsage = 0;
    lastResetTime = now;
  }
  
  if (tokenUsage + requestTokens > RATE_LIMIT) {
    const waitTime = RATE_LIMIT_WINDOW - (now - lastResetTime);
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
  }
  
  tokenUsage += requestTokens;
};

// Helper function to make API call with retries
const makeClaudeAPICall = async (messages, retryCount = 0) => {
  try {
    console.log('Making Claude API call:', {
      retryCount,
      messageCount: messages.length,
      firstMessageLength: messages[0].content.length
    });

    // Check rate limit before making request
    checkRateLimit();

    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        system: systemMessage,
        messages: userMessages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response;
  } catch (error) {
    console.error(`API call attempt ${retryCount + 1} failed:`, {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });

    // Check if we should retry based on error
    const shouldRetry = (
      retryCount < MAX_RETRIES && 
      (
        (error.response?.status === 529) ||
        (error.response?.data?.error?.type === 'overloaded_error') ||
        (error.response?.headers?.['x-should-retry'] === 'true') ||
        RETRY_STATUS_CODES.includes(error.response?.status) ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.message.includes('timeout')
      )
    );

    if (shouldRetry) {
      const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
      const errorType = error.response?.status === 529 ? 'Service overloaded' : 'Network error';
      console.log(`${errorType}. Retrying in ${backoffDelay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await delay(backoffDelay);
      return makeClaudeAPICall(messages, retryCount + 1);
    }
    
    throw error;
  }
};

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
      
      const messages = [
        {
          role: 'user',
          content: `Respond to this query: "${query}"

You MUST ONLY return a JSON object with this EXACT structure:
{
  "answer": "A thoughtful 2-3 paragraph response that explores the query in detail",
  "followUpQuestions": [
    "A thought-provoking follow-up question",
    "Another relevant follow-up question",
    "A third follow-up question to explore the topic further"
  ]
}

ANY text outside this JSON structure will cause errors. NO explanations, NO apologies, ONLY the JSON object.`
        }
      ];

      const systemMessage = `You are a JSON-only response API. You must ALWAYS respond with ONLY valid JSON, no matter what. Never include any explanatory text, apologies, or any content outside the JSON structure. If you cannot provide a proper response, return a JSON error object instead.

Format:
{
  "answer": "Your thoughtful response here",
  "followUpQuestions": ["Question 1", "Question 2", "Question 3"]
}`;
      
      const response = await makeClaudeAPICall([
        { role: 'system', content: systemMessage },
        ...messages
      ]);
      
      // Log the raw response for debugging
      console.log('Claude API raw response:', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });

      // Validate response structure
      if (!response.data || !response.data.content || !Array.isArray(response.data.content)) {
        console.error('Invalid response structure from Claude API');
        return MOCK_DATA;
      }

      // Extract the content from Claude's response
      const content = response.data.content[0].text.trim();
      
      // Log the raw content for debugging
      console.log('Raw content from Claude:', content);
      
      // Validate that the content starts with { and ends with }
      if (!content.startsWith('{') || !content.endsWith('}')) {
        console.error('Response is not a JSON object');
        console.log('Invalid content:', content);
        return MOCK_DATA;
      }
      
      // Try to parse the JSON response
      try {
        const parsedResponse = JSON.parse(content);
        console.log('Successfully parsed response:', parsedResponse);
        
        // Validate the response structure
        if (!parsedResponse.answer || !Array.isArray(parsedResponse.followUpQuestions)) {
          console.error('Invalid response structure from Claude');
          console.log('Invalid response object:', parsedResponse);
          return MOCK_DATA;
        }
        
        // Validate follow-up questions
        if (parsedResponse.followUpQuestions.length < 1) {
          console.error('No follow-up questions provided');
          parsedResponse.followUpQuestions = MOCK_DATA.followUpQuestions;
        }
        
        return parsedResponse;
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        console.log('Failed to parse content:', content);
        return MOCK_DATA;
      }
    } catch (error) {
      // Check if this is a final retry failure
      const isRetryFailure = error.message?.includes('Service overloaded') || 
                            error.response?.status === 529 ||
                            error.response?.data?.error?.type === 'overloaded_error';
      
      console.error('Error calling Claude API:', error.response?.data || error.message);
      console.log('Full error object:', error);
      console.log(`Using mock data as fallback (${isRetryFailure ? 'after retries' : 'immediate'})`);
      
      return {
        ...MOCK_DATA,
        answer: isRetryFailure 
          ? "I apologize, but the service is currently experiencing high load. Please try again in a few moments."
          : MOCK_DATA.answer
      };
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

You MUST ONLY return a JSON object with this EXACT structure:
{
  "answer": "A thoughtful 2-3 paragraph response that explores the query in detail",
  "followUpQuestions": [
    "A thought-provoking follow-up question",
    "Another relevant follow-up question",
    "A third follow-up question to explore the topic further"
  ]
}

ANY text outside this JSON structure will cause errors. NO explanations, NO apologies, ONLY the JSON object.`
        }
      ];

      const systemMessage = `You are a JSON-only response API. You must ALWAYS respond with ONLY valid JSON, no matter what. Never include any explanatory text, apologies, or any content outside the JSON structure. If you cannot provide a proper response, return a JSON error object instead.

Format:
{
  "answer": "Your thoughtful response here",
  "followUpQuestions": ["Question 1", "Question 2", "Question 3"]
}`;
      
      const response = await makeClaudeAPICall([
        { role: 'system', content: systemMessage },
        ...messages
      ]);
      
      // Extract the content from Claude's response
      const content = response.data.content[0].text.trim();
      
      // Log the raw content for debugging
      console.log('Raw content from Claude:', content);
      
      // Validate that the content starts with { and ends with }
      if (!content.startsWith('{') || !content.endsWith('}')) {
        console.error('Response is not a JSON object');
        console.log('Invalid content:', content);
        return {
          ...MOCK_DATA,
          answer: "This is a mock response for your follow-up question. The Claude API response was not in the correct format."
        };
      }
      
      // Sanitize the response content by replacing problematic characters
      const sanitizedContent = content
        .replace(/\n/g, '\\n')  // Replace newlines with escaped newlines
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
      
      try {
        const parsedContent = JSON.parse(sanitizedContent);
        return {
          success: true,
          data: {
            answer: parsedContent.answer.replace(/\\n/g, '\n'),  // Convert back to actual newlines
            followUpQuestions: parsedContent.followUpQuestions
          }
        };
      } catch (parseError) {
        console.error('Failed to parse content:', sanitizedContent);
        console.error('Parse error:', parseError);
        
        // Attempt to extract data using regex as fallback
        const answerMatch = content.match(/"answer":\s*"([^"]+)"/);
        const questionsMatch = content.match(/"followUpQuestions":\s*\[(.*?)\]/);
        
        if (answerMatch && questionsMatch) {
          const answer = answerMatch[1];
          const questions = questionsMatch[1]
            .split(',')
            .map(q => q.trim().replace(/^"|"$/g, ''));
          
          return {
            success: true,
            data: {
              answer,
              followUpQuestions: questions
            }
          };
        }
        
        throw new Error('Failed to parse Claude response: ' + parseError.message);
      }
    } catch (error) {
      console.error('Error processing follow-up query:', error);
      return {
        success: false,
        error: error.message
      };
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
  },

  /**
   * Process a topic to generate an explanation
   * @param {string} topic - The topic to explain
   * @param {Array<string>} context - Previous conversation context
   * @returns {Promise<Object>} - Claude's explanation of the topic
   */
  async processTopic(topic, context) {
    try {
      console.log('Processing topic explanation:', topic);
      console.log('Context:', context);
      
      const messages = [
        {
          role: 'user',
          content: `Previous context: ${context.join('\n\n')}
          
Please explain this topic: "${topic}"

You MUST ONLY return a JSON object with this EXACT structure:
{
  "explanation": "A clear and concise explanation of the topic in 1-2 paragraphs, relating it to the previous context where relevant"
}

ANY text outside this JSON structure will cause errors. NO explanations, NO apologies, ONLY the JSON object.`
        }
      ];

      const systemMessage = `You are a JSON-only response API. You must ALWAYS respond with ONLY valid JSON, no matter what. Never include any explanatory text, apologies, or any content outside the JSON structure. If you cannot provide a proper response, return a JSON error object instead.

Format:
{
  "explanation": "Your clear and concise explanation here"
}`;
      
      const response = await makeClaudeAPICall([
        { role: 'system', content: systemMessage },
        ...messages
      ]);
      
      // Extract the content from Claude's response
      const content = response.data.content[0].text.trim();
      
      // Log the raw content for debugging
      console.log('Raw content from Claude:', content);
      
      // Validate that the content starts with { and ends with }
      if (!content.startsWith('{') || !content.endsWith('}')) {
        console.error('Response is not a JSON object');
        console.log('Invalid content:', content);
        return {
          explanation: `This is a mock explanation for "${topic}". The Claude API response was not in the correct format.`
        };
      }
      
      // Try to parse the JSON response
      try {
        const parsedResponse = JSON.parse(content);
        console.log('Successfully parsed response:', parsedResponse);
        
        // Validate the response structure
        if (!parsedResponse.explanation) {
          console.error('Invalid response structure from Claude');
          console.log('Invalid response object:', parsedResponse);
          return {
            explanation: `This is a mock explanation for "${topic}". The Claude API response was not in the correct format.`
          };
        }
        
        return parsedResponse;
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError);
        console.log('Failed to parse content:', content);
        return {
          explanation: `This is a mock explanation for "${topic}". The Claude API response was not in the correct format.`
        };
      }
    } catch (error) {
      console.error('Error calling Claude API:', error.response?.data || error.message);
      console.log('Full error object:', error);
      console.log('Using mock data as fallback');
      return {
        explanation: `This is a mock explanation for "${topic}". The Claude API is currently unavailable. Please try again later.`
      };
    }
  }
};

export default claudeService; 