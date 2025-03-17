import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  generateSummary,
  getSummaries,
  deleteSummary
} from '../controllers/summaryController.js';

const router = express.Router();

// All routes are protected by auth middleware
router.use(protect);

// Generate a summary for a canvas
router.post('/canvas/:canvasId/summary', generateSummary);

// Get all summaries for a canvas
router.get('/canvas/:canvasId/summary', getSummaries);

// Delete a summary
router.delete('/canvas/:canvasId/summary/:summaryIndex', deleteSummary);

export default router; 