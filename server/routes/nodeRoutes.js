import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/fileUpload.js';
import { 
  updateNodeContent, 
  addAttachment, 
  removeAttachment,
  addSource,
  removeSource
} from '../controllers/nodeController.js';

const router = express.Router();

// All routes are protected by auth middleware
router.use(protect);

// Update node content
router.put('/canvas/:canvasId/node/:nodeId/content', updateNodeContent);

// Attachment routes
router.post('/canvas/:canvasId/node/:nodeId/attachment', upload.single('file'), addAttachment);
router.delete('/canvas/:canvasId/node/:nodeId/attachment/:attachmentIndex', removeAttachment);

// Source routes
router.post('/canvas/:canvasId/node/:nodeId/source', addSource);
router.delete('/canvas/:canvasId/node/:nodeId/source/:sourceIndex', removeSource);

export default router; 