import mongoose from 'mongoose';

// Node schema (embedded in Canvas)
const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['response', 'followUp'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  position: {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  originalContent: {
    type: String,
  },
  lastEditedAt: {
    type: Date,
  },
  attachments: [{
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  sources: [{
    text: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
});

// Edge schema (connections between nodes)
const edgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  animated: {
    type: Boolean,
    default: true,
  },
  style: {
    type: mongoose.Schema.Types.Mixed,
  },
});

// Canvas schema
const canvasSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    nodes: [nodeSchema],
    edges: [edgeSchema],
    initialQuery: {
      type: String,
      required: true,
    },
    summaries: [{
      title: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

const Canvas = mongoose.model('Canvas', canvasSchema);

export default Canvas; 