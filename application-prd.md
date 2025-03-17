# Product Requirements Document (PRD)

## 1. Overview

**Product Vision:**  
Develop a lightweight, clean, and modern web application that enables users to explore and expand on their questions or reflections via an interactive infinite canvas. The application leverages Claude Sonnet 3.7 for generating responses and follow-up questions. Users can navigate multiple canvases (mind maps), synthesize insights from multiple nodes, and enjoy a calm, minimal interface that scales to future features.

**Key Pages & Interfaces:**

- **Page 0 – Authentication:**  
  - **Purpose:** Secure user access using a simple username and password system. (Google Auth integration will be added later.)
  
- **Page 1 – Landing Page:**  
  - **Purpose:** A clean and minimal entry page where the user submits their question or reflection.
  
- **Page 2 – Infinite Canvas Interface:**  
  - **Purpose:** The main interactive page featuring:
    - **Infinite Canvas:** A limitless canvas where nodes (components) are created and arranged.
    - **Left Sidebar:** A minimal, expandable/closeable sidebar displaying all user-generated canvases (with a “New Mindmap” button). When not in use, it hugs the left edge to maximize canvas space.
    - **Right Sidebar (Synthesis Sidebar):** A minimal sidebar listing synthesized artifacts. It can be expanded/closed and supports multiple artifacts.
    - **Nodes and Connections:**  
      - **Response Type Nodes:** Display Claude’s generated answer/analysis. These are selectable for synthesis.
      - **Follow-Up Question Nodes:** Display generated follow-up questions or allow custom follow-ups (via an empty input with placeholder “insert your own follow up query”). These are non-selectable.
      - **Animated Arrows:** Connect nodes with a sequential flashing effect (light moving from the base to the tip) to guide the user’s attention.

- **Onboarding Flow:**  
  - A minimal and engaging onboarding process highlights key features as the user first encounters them. Users can toggle onboarding on or off. (This will be documented in the README.)

---

## 2. User Flows & Stories

### 2.1 Authentication Flow
- **User Story:**  
  As a user, I can log in or register using a username and password so that my canvases and synthesis artifacts are saved.
- **Flow:**  
  1. User visits the Authentication Page.
  2. User logs in or signs up.
  3. On successful authentication, the user is redirected to the Landing Page.

### 2.2 Landing Page Flow
- **User Story:**  
  As a user, I can enter a question or reflection on a clean landing page.
- **Flow:**  
  1. User enters their query.
  2. Clicking “Submit” navigates the user to the Infinite Canvas Interface (Page 2) while carrying over the query.

### 2.3 Infinite Canvas Flow
- **Initial Node Creation:**  
  - Upon landing on the Infinite Canvas page:
    - A **Response Node** is created that displays:
      - The user’s original question/reflection.
      - Claude Sonnet 3.7’s analysis (expanded answer) along with at least three generated follow-up questions.
  - **Follow-Up Interactions:**  
    - **Generated Follow-Ups:**  
      - Animated arrows (with sequential flashing from base to tip) connect to follow-up question nodes.
      - Clicking a follow-up question sends the selected question and previous context to Claude to generate a new Response Node.
    - **Custom Follow-Up:**  
      - A node styled like generated follow-up nodes appears with an empty input field (placeholder: “insert your own follow up query”) for custom entries.
- **Node Classification:**  
  - **Response Nodes:**  
    - Contain the answer/analysis and are selectable for synthesis.
  - **Follow-Up Nodes:**  
    - Contain follow-up queries (generated or custom) and are non-selectable.
- **Canvas Interactions:**  
  - **Panning & Zooming:**  
    - Infinite panning in all directions.
    - Zoom controls (“+” and “–” buttons) located at the bottom left.
  - **Drag-and-Drop:**  
    - Nodes are freely moveable with dynamic arrow adjustments.

### 2.4 Left Sidebar – Canvas Navigation
- **User Story:**  
  As a user, I want quick access to all my saved infinite canvases and the ability to create a new canvas.
- **Flow:**  
  1. A minimal left sidebar displays a list of the user’s canvases with a search function for quick navigation.
  2. A “New Mindmap” button is included; when clicked, it navigates the user to the Landing Page to generate a new canvas.
  3. The sidebar is expandable/closeable so it doesn’t interfere with the main canvas area when not in use.

### 2.5 Synthesis Feature Flow (Right Sidebar)
- **User Story:**  
  As a user, I want to synthesize insights from multiple response nodes into a single artifact.
- **Flow:**  
  1. User clicks the “Synthesize” button.
  2. All selectable Response Nodes are highlighted.
  3. The user selects one or more Response Nodes.
  4. The user clicks “Synthesize Now!” or enters a custom synthesis query (overriding the default prompt from a prompts folder).
  5. Selected contexts are sent to Claude Sonnet 3.7, and a synthesized artifact (with a unique title and content) is returned.
  6. The synthesized artifact is saved and added as an individual list item in the Right Sidebar.
  7. The Right Sidebar is expandable/closeable and supports multiple artifacts per canvas.

### 2.6 Onboarding Flow
- **User Story:**  
  As a new user, I want a brief onboarding process that explains the key features as I encounter them.
- **Flow:**  
  1. On first launch (or if toggled on), a series of minimal onboarding hints point out:
     - How to enter your query on the Landing Page.
     - How to interact with nodes and follow-up arrows.
     - How to use the left sidebar to navigate canvases.
     - How to synthesize insights using the Right Sidebar.
  2. Users can toggle the onboarding hints on or off via settings.
  3. This onboarding process is documented in the README for developer reference.

---

## 3. Technical Architecture

### 3.1 Frontend

**Framework & Libraries:**
- **React:**  
  - Chosen for its lightweight, modular architecture and ease of scaling for future features.
- **Canvas Implementation:**  
  - **React Flow:**  
    - Provides built-in support for node-based, interactive infinite canvases with dynamic edge (arrow) management.
  - (Alternatively, **Konva** can be considered if lower-level canvas manipulation is needed, but React Flow is preferred for its performance and functionality.)
- **Styling:**  
  - **Tailwind CSS:**  
    - For a minimal, modern, and highly customizable design that is easy on the eyes.
- **Animations:**  
  - **Framer Motion** or CSS animations for smooth transitions and the sequential flashing effect on arrows.
- **State Management:**  
  - Use React Context API or Redux for managing global state (e.g., user authentication, canvas data, synthesis artifacts, and onboarding state).

### 3.2 Backend

**Framework & Libraries:**
- **Node.js with Express:**  
  - For building the API server.
- **Authentication:**  
  - **Passport.js:**  
    - For username/password authentication. (Google Auth can be added later.)
- **Database:**  
  - **PostgreSQL** or **MongoDB:**  
    - Choose the one that best fits the current and future requirements. Both are acceptable, with PostgreSQL offering relational structure and MongoDB providing flexibility.
- **API Endpoints:**
  - **User Authentication:** Login, Signup.
  - **Canvas Management:** CRUD operations for saving, retrieving, and updating infinite canvases.
  - **Synthesis Management:** Endpoints to save and retrieve synthesized artifacts.
  - **Claude API Proxy:**  
    - An endpoint that sends requests to Claude Sonnet 3.7 using the provided API key.
    - **Important:** Store the API key in a `.env` file locally and load it using a library like `dotenv`.

### 3.3 Deployment & Performance
- **Performance Considerations:**
  - Optimize canvas rendering (consider lazy-loading for large canvases).
  - Ensure animations are smooth, even as the number of nodes increases.
- **Hosting:**  
  - Consider using AWS, Heroku, or Vercel for deployment.
- **Security:**  
  - Secure API endpoints with proper authentication and input validation.
  - Ensure the `.env` file is not exposed in public repositories.

---

## 4. Data Models

### 4.1 User Model
- **Fields:**  
  - `id`
  - `username`
  - `passwordHash`
  - (Future scope: Fields for Google Auth, etc.)

### 4.2 Canvas (Mind Map) Model
- **Fields:**  
  - `id`
  - `userId` (Reference to the User)
  - `title`
  - `nodes` (JSON structure representing nodes, positions, and connections)
  - `createdAt`, `updatedAt`

### 4.3 Node Model (Embedded within the Canvas JSON)
- **Fields:**  
  - `id`
  - `type`: `"response"` or `"followUp"`
  - `content`: The text content (either the answer or follow-up query)
  - `position`: Coordinates `{ x, y }`
  - `connections`: Array of connected node IDs
  - `metadata`: Additional context such as API call details

### 4.4 Synthesis Artifact Model
- **Fields:**  
  - `id`
  - `mindmapId` (Reference to the associated Canvas)
  - `title`
  - `content`
  - `createdAt`

---

## 5. API Integration with Claude Sonnet 3.7

- **Endpoints:**  
  - **Initial Query Endpoint:**  
    - **Request:** User’s question/reflection.
    - **Response:** Analyzed answer with at least three follow-up questions.
  - **Follow-Up Query Endpoint:**  
    - **Request:** Follow-up question (generated or custom) along with previous context.
    - **Response:** New answer with additional follow-up suggestions.
  - **Synthesis Query Endpoint:**  
    - **Request:** Selected response node contexts along with a synthesis prompt (default prompt loaded from a prompts folder or a custom query).
    - **Response:** A synthesized artifact with a unique title and content.
- **API Key Management:**  
  - The API key for Claude Sonnet 3.7 must be stored in a local `.env` file:
  - Use the `dotenv` package in Node.js to load this key securely.

---

## 6. UI/UX Design Specifications

### VISUAL DESIGN
- **Minimalist Interface:**  
  - Implement a clean, minimal interface using a light, soothing color palette that is gentle on the eyes.
  - Maintain generous whitespace throughout the layout to reduce visual clutter.
  - Integrate subtle micro-interactions (e.g., hover effects, button transitions) for a modern touch.
- **Responsive Design:**  
  - Ensure the interface is fully responsive to accommodate various devices and future feature additions.
- **Smooth Transitions:**  
  - Apply smooth, animated transitions for all interface changes, including modal pop-ups, sidebar toggles, and node interactions.

### CANVAS FUNCTIONALITY
- **Infinite Canvas:**  
  - Create an infinite canvas that allows unrestricted panning and zooming.
- **Zoom Controls:**  
  - Include visible zoom controls (+ / - buttons) positioned in the bottom right corner for intuitive use.
- **Node Interaction:**  
  - Enable drag-and-drop positioning for all nodes (both Response and Follow-Up types) with auto-updating connection arrows.
- **Animated Arrows:**  
  - Animate connection arrows with a pulsing light effect that flows from the start node to the end node, guiding user attention in a natural, sequential manner.

### NAVIGATION ELEMENTS

#### Left Sidebar (Canvas Navigation)
- **Mindmap List:**  
  - Display a collapsible list of the user’s saved mind maps/infinite canvases.
- **Real-Time Search:**  
  - Integrate an instant search filter that refines the list in real time as the user types.
  - Highlight matching search terms and display an appropriate empty state if no results are found.
- **New Mindmap Button:**  
  - Position a prominent “New Mindmap” button at the top of the sidebar.
- **Sidebar Toggle:**  
  - Provide clear collapse/expand controls so the sidebar can be minimized to maximize canvas space when not in use.

#### Right Sidebar (Synthesis Artifacts)
- **Artifacts Panel:**  
  - Show a collapsible panel listing synthesized artifacts.
  - Allow each artifact to be individually expanded or minimized for detailed review.
- **Consistent Styling:**  
  - Maintain a consistent visual style with the left sidebar for coherence.
- **Minimize/Maximize Controls:**  
  - Include intuitive controls to minimize or maximize the sidebar as desired by the user.

### ONBOARDING
- **Progressive Feature Introduction:**  
  - Design a guided onboarding process that progressively introduces key features.
  - Highlight each core function with a brief explanation and visual cue.
- **Tutorial Options:**  
  - Allow users to skip or replay the tutorial at any time.
- **Onboarding Steps:**  
  1. **Canvas Navigation Basics:** How to pan, zoom, and explore the infinite canvas.
  2. **Node Creation and Linking:** How nodes are created (both responses and follow-up queries) and how they link via animated arrows.
  3. **Sidebar Functionality:** Overview of both left (canvas navigation) and right (synthesis artifacts) sidebars.
  4. **Search and Organization:** How to use the real-time search to locate canvases.
- **Documentation:**  
  - Document the complete onboarding flow and customization options in the README.md for both users and developers.

### SEARCH IMPLEMENTATION
- **Instant Search:**  
  - Implement an instant search feature within the left sidebar.
- **Real-Time Filtering:**  
  - Filter canvas results dynamically as the user types, highlighting matching terms.
- **Empty State:**  
  - Clearly show an empty state message or graphic when no results match the search query.

---

## 7. Recommended Tech Stack Summary

- **Frontend:**  
  - **React** for building a modular, scalable UI.
  - **React Flow** for implementing the infinite canvas with dynamic node and edge management.
  - **Tailwind CSS** for a lightweight, modern, and customizable styling approach.
  - **Framer Motion** (or CSS animations) for smooth transitions and animated arrow effects.
  - **React Context API/Redux** for state management.

- **Backend:**  
  - **Node.js with Express** for API development.
  - **Passport.js** for authentication.
  - **PostgreSQL** or **MongoDB** for data persistence (choose based on performance and future feature needs).
  - **dotenv** for environment variable management (including storing the Claude API key securely).

- **Deployment:**  
  - Host on AWS, Heroku, or Vercel.
  - Consider Docker for containerization.

---

## 8. Next Steps & Additional Considerations

1. **Finalizing Frameworks:**  
   - Confirm the use of **React Flow** (preferred) for the infinite canvas and **Tailwind CSS** for styling based on your requirements for a lightweight and modern UI.
2. **Claude API Details:**  
   - Verify the Claude Sonnet 3.7 API endpoints and ensure proper error handling and logging.
3. **Database Selection:**  
   - Choose between PostgreSQL or MongoDB based on team familiarity and future scalability needs.
4. **Onboarding Flow:**  
   - Develop a minimal onboarding process with guided tooltips that can be toggled by the user. Document this in the README.
5. **Security:**  
   - Ensure the API key is stored securely in a `.env` file and not exposed publicly.
6. **Search & Navigation:**  
   - Implement a search function in the Left Sidebar for users to quickly find their canvases.

---

## 9. README Documentation

The README should include:
- **Setup Instructions:**  
  - How to install dependencies, set up the `.env` file (including the Claude API key), and run the development server.
- **Architecture Overview:**  
  - A brief explanation of the project structure and chosen technologies.
- **Onboarding Flow:**  
  - A description of the minimal onboarding process, its toggling functionality, and guidance for new users.
- **Usage Instructions:**  
  - How to navigate between pages (Authentication, Landing, Infinite Canvas).
  - How to use the Left Sidebar for navigation and the Right Sidebar for synthesis.
- **Future Enhancements:**  
  - Notes on how the app can be extended for additional features.
