// Mock DOMMatrix for server-side rendering
if (typeof window === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    
    constructor() {
      // Minimal implementation
    }
    
    static fromFloat32Array() { return new DOMMatrix(); }
    static fromFloat64Array() { return new DOMMatrix(); }
    static fromMatrix() { return new DOMMatrix(); }
  };
}

export {};
