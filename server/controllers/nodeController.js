import Canvas from '../models/Canvas.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Update a node's content
export const updateNodeContent = async (req, res) => {
  try {
    const { canvasId, nodeId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this canvas' });
    }
    
    // Find the node to update
    const nodeIndex = canvas.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    const node = canvas.nodes[nodeIndex];
    
    // If this is the first edit, save the original content
    if (!node.isEdited) {
      node.originalContent = node.content;
    }
    
    // Update node properties
    node.content = content;
    node.isEdited = true;
    node.lastEditedAt = new Date();
    
    await canvas.save();
    
    res.status(200).json({ 
      success: true, 
      data: {
        node: canvas.nodes[nodeIndex]
      }
    });
  } catch (error) {
    console.error('Error updating node content:', error);
    res.status(500).json({ success: false, error: 'Error updating node content' });
  }
};

// Add attachment to a node
export const addAttachment = async (req, res) => {
  try {
    // Multer middleware will have processed the file
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const { canvasId, nodeId } = req.params;
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      // Delete the uploaded file if canvas not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      // Delete the uploaded file if user is not authorized
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, error: 'Not authorized to edit this canvas' });
    }
    
    // Find the node to update
    const nodeIndex = canvas.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) {
      // Delete the uploaded file if node not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    // Create attachment object
    const attachment = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadedAt: new Date()
    };
    
    // Add attachment to node
    if (!canvas.nodes[nodeIndex].attachments) {
      canvas.nodes[nodeIndex].attachments = [];
    }
    
    canvas.nodes[nodeIndex].attachments.push(attachment);
    
    await canvas.save();
    
    res.status(200).json({ 
      success: true, 
      data: {
        attachment
      }
    });
  } catch (error) {
    console.error('Error adding attachment:', error);
    
    // If an error occurred and a file was uploaded, remove it
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing uploaded file after failed attachment:', unlinkError);
      }
    }
    
    res.status(500).json({ success: false, error: 'Error adding attachment' });
  }
};

// Remove attachment from a node
export const removeAttachment = async (req, res) => {
  try {
    const { canvasId, nodeId, attachmentIndex } = req.params;
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this canvas' });
    }
    
    // Find the node
    const nodeIndex = canvas.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    const node = canvas.nodes[nodeIndex];
    
    // Check if attachment exists
    if (!node.attachments || !node.attachments[attachmentIndex]) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }
    
    // Get the file path before removing from array
    const filePath = node.attachments[attachmentIndex].filePath;
    
    // Remove attachment from array
    node.attachments.splice(attachmentIndex, 1);
    
    await canvas.save();
    
    // Try to remove the actual file
    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Error removing attachment file:', unlinkError);
        // Continue execution even if file deletion fails
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Attachment removed successfully'
    });
  } catch (error) {
    console.error('Error removing attachment:', error);
    res.status(500).json({ success: false, error: 'Error removing attachment' });
  }
};

// Add source to a node
export const addSource = async (req, res) => {
  try {
    const { canvasId, nodeId } = req.params;
    const { text, url } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Source text is required' });
    }
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this canvas' });
    }
    
    // Find the node
    const nodeIndex = canvas.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    // Create source object
    const source = {
      text,
      url,
      addedAt: new Date()
    };
    
    // Add source to node
    if (!canvas.nodes[nodeIndex].sources) {
      canvas.nodes[nodeIndex].sources = [];
    }
    
    canvas.nodes[nodeIndex].sources.push(source);
    
    await canvas.save();
    
    res.status(200).json({ 
      success: true, 
      data: {
        source
      }
    });
  } catch (error) {
    console.error('Error adding source:', error);
    res.status(500).json({ success: false, error: 'Error adding source' });
  }
};

// Remove source from a node
export const removeSource = async (req, res) => {
  try {
    const { canvasId, nodeId, sourceIndex } = req.params;
    
    const canvas = await Canvas.findById(canvasId);
    
    if (!canvas) {
      return res.status(404).json({ success: false, error: 'Canvas not found' });
    }
    
    // Check if user owns the canvas
    if (canvas.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit this canvas' });
    }
    
    // Find the node
    const nodeIndex = canvas.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) {
      return res.status(404).json({ success: false, error: 'Node not found' });
    }
    
    const node = canvas.nodes[nodeIndex];
    
    // Check if source exists
    if (!node.sources || !node.sources[sourceIndex]) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }
    
    // Remove source from array
    node.sources.splice(sourceIndex, 1);
    
    await canvas.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Source removed successfully'
    });
  } catch (error) {
    console.error('Error removing source:', error);
    res.status(500).json({ success: false, error: 'Error removing source' });
  }
}; 