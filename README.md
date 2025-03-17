# MindMap+

A lightweight, clean, and modern web application that enables users to explore and expand on their questions or reflections via an interactive infinite canvas. The application leverages Claude Sonnet 3.7 for generating responses and follow-up questions.

## Features

- Interactive infinite canvas for exploring thoughts and ideas
- Integration with Claude Sonnet 3.7 for generating responses and follow-up questions
- Multiple canvases (mind maps) management
- Synthesis of insights from multiple nodes
- Clean, minimal interface

## Tech Stack

- **Frontend**: React, React Flow, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **API**: Claude Sonnet 3.7

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- MongoDB (for production)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mindmap-plus
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_CLAUDE_API_KEY=your-claude-api-key
   VITE_API_URL=http://localhost:5000
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/mindmap-plus
   CLAUDE_API_KEY=your-claude-api-key
   ```

4. Start the development server:
   ```
   npm run dev:all
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Project Structure

- `src/` - Frontend React application
  - `components/` - Reusable UI components
  - `pages/` - Page components
  - `context/` - React context providers
  - `hooks/` - Custom React hooks
  - `services/` - API service functions
  - `utils/` - Utility functions
  - `types/` - TypeScript type definitions
- `server/` - Backend Express server
  - `controllers/` - Route controllers
  - `models/` - Database models
  - `routes/` - API routes
  - `middleware/` - Express middleware
  - `utils/` - Utility functions

## Development

- Frontend: `npm run dev`
- Backend: `npm run server`
- Both: `npm run dev:all`

## Deployment

The application is configured for deployment on Railway with MongoDB.

## License

[MIT](LICENSE)
