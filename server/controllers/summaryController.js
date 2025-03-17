import Canvas from '../models/Canvas.js';
import { v4 as uuidv4 } from 'uuid';

// Generate a summary for the entire mind map
export const generateSummary = async (req, res) => {
  try {
    const { canvasId } = req.params;
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this canvas' });
    }
    
    // Extract all node content
    const nodeContents = canvas.nodes.map(node => {
      return {
        id: node.id,
        type: node.type,
        content: node.content,
      };
    });
    
    // TODO: This is where we would call Claude API to generate the summary
    // Since Claude API is not yet integrated, we'll create a placeholder summary
    
    const summary = {
      title: `Summary of "${canvas.title}"`,
      content: `This is a placeholder summary for the mind map "${canvas.title}". 
      When the Claude API is integrated, this will be replaced with an AI-generated summary
      based on the ${nodeContents.length} nodes in this mind map.`,
      createdAt: new Date()
    };
    
    // Add summary to canvas
    if (!canvas.summaries) {
      canvas.summaries = [];
    }
    
    canvas.summaries.push(summary);
    
    await canvas.save();
    
    res.status(200).json({
      success: true,
      data: {
        summary: canvas.summaries[canvas.summaries.length - 1]
      }
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ success: false, error: 'Error generating summary' });
  }
};

// Get all summaries for a canvas
export const getSummaries = async (req, res) => {
  try {
    const { canvasId } = req.params;
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this canvas' });
    }
    
    const summaries = canvas.summaries || [];
    
    res.status(200).json({
      success: true,
      data: {
        summaries
      }
    });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ success: false, error: 'Error fetching summaries' });
  }
};

// Delete a summary
export const deleteSummary = async (req, res) => {
  try {
    const { canvasId, summaryIndex } = req.params;
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this canvas' });
    }
    
    // Check if summary exists
    if (!canvas.summaries || !canvas.summaries[summaryIndex]) {
      return res.status(404).json({ success: false, error: 'Summary not found' });
    }
    
    // Remove summary
    canvas.summaries.splice(summaryIndex, 1);
    
    await canvas.save();
    
    res.status(200).json({
      success: true,
      message: 'Summary deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ success: false, error: 'Error deleting summary' });
  }
}; 