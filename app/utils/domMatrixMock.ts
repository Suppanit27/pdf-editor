// utils/domMatrixMock.ts

class DOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
}

if (typeof global !== "undefined") {
  (global as any).DOMMatrix = DOMMatrix;
}

export {};
