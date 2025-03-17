// Basic authentication middleware
// This is a placeholder implementation that just passes through
// In a real application, this would verify JWT tokens, session cookies, etc.

const protect = (req, res, next) => {
  // For now, we'll just pass through without checking credentials
  // In a real application, you would verify the auth token here
  next();
};

export { protect }; 