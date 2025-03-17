// A simple in-memory database for development
class LocalDB {
  constructor() {
    this.users = new Map();
    this.canvases = new Map();
    this.artifacts = new Map();
    console.log('LocalDB initialized');
  }

  // User methods
  async createUser(userData) {
    const id = `user_${Date.now()}`;
    const user = { id, ...userData, createdAt: new Date().toISOString() };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id) {
    return this.users.get(id) || null;
  }

  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(user => user.username === username) || null;
  }

  // Canvas methods
  async createCanvas(canvasData) {
    const id = `canvas_${Date.now()}`;
    const canvas = { 
      id, 
      ...canvasData, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.canvases.set(id, canvas);
    return canvas;
  }

  async getCanvasByUserId(userId) {
    return Array.from(this.canvases.values()).filter(canvas => canvas.userId === userId);
  }

  async getCanvasById(id) {
    return this.canvases.get(id) || null;
  }

  async updateCanvas(id, canvasData) {
    const canvas = this.canvases.get(id);
    if (!canvas) return null;
    
    const updatedCanvas = { 
      ...canvas, 
      ...canvasData, 
      updatedAt: new Date().toISOString() 
    };
    this.canvases.set(id, updatedCanvas);
    return updatedCanvas;
  }

  async deleteCanvas(id) {
    const canvas = this.canvases.get(id);
    if (!canvas) return false;
    
    this.canvases.delete(id);
    return true;
  }

  // Artifact methods
  async createArtifact(artifactData) {
    const id = `artifact_${Date.now()}`;
    const artifact = { 
      id, 
      ...artifactData, 
      createdAt: new Date().toISOString() 
    };
    this.artifacts.set(id, artifact);
    return artifact;
  }

  async getArtifactsByMindmapId(mindmapId) {
    return Array.from(this.artifacts.values()).filter(artifact => artifact.mindmapId === mindmapId);
  }

  async getArtifactById(id) {
    return this.artifacts.get(id) || null;
  }

  async deleteArtifact(id) {
    const artifact = this.artifacts.get(id);
    if (!artifact) return false;
    
    this.artifacts.delete(id);
    return true;
  }
}

// Export a singleton instance
const localDB = new LocalDB();
export default localDB; 