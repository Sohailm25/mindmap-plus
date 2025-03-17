// Test script for directly calling the Anthropic API
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Claude API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';

async function testClaudeAPI() {
  console.log('Testing Claude API directly...');
  console.log('API Key status:', ANTHROPIC_API_KEY ? `Set (length: ${ANTHROPIC_API_KEY.length})` : 'Not set');
  console.log('Claude model:', CLAUDE_MODEL);
  
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: 'Say hello world!'
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    console.log('API Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 300) + '...');
    console.log('Content:', response.data.content[0].text);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error calling Claude API directly:', error.message);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    
    return { success: false, error: error.message };
  }
}

// Run the test
testClaudeAPI()
  .then(result => {
    console.log('Test completed:', result.success);
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 