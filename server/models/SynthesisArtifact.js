import mongoose from 'mongoose';

const synthesisArtifactSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    mindmapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canvas',
      required: true,
    },
    selectedNodes: [{
      type: String,
      required: true,
    }],
    customPrompt: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const SynthesisArtifact = mongoose.model('SynthesisArtifact', synthesisArtifactSchema);

export default SynthesisArtifact; 