// PDF utilities for browser environment
let pdfjs: any = null;

export const initializePdfJs = async () => {
  if (typeof window === 'undefined') return null;
  
  if (!pdfjs) {
    try {
      // Dynamic import เพื่อหลีกเลี่ยงปัญหา SSR
      pdfjs = await import('pdfjs-dist');
      
      // ตั้งค่า worker URL
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
      
      console.log('PDF.js initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PDF.js:', error);
      throw error;
    }
  }
  
  return pdfjs;
};

export const loadPdfDocument = async (source: string | ArrayBuffer) => {
  const pdfjsLib = await initializePdfJs();
  if (!pdfjsLib) throw new Error('PDF.js not available');

  const loadingTask = pdfjsLib.getDocument({
    data: source,
    // ตั้งค่าเพื่อหลีกเลี่ยงปัญหา Node.js modules
    useSystemFonts: true,
    disableFontFace: false,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableAutoFetch: false,
    disableStream: false,
  });

  return await loadingTask.promise;
};

// เก็บ render tasks สำหรับแต่ละ canvas
const canvasRenderTasks = new Map<HTMLCanvasElement, any>();

export const renderPdfPage = async (
  pdf: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  containerWidth: number = 800
) => {
  if (!canvas || !pdf) return;

    try {
    // ยกเลิก render task ก่อนหน้าสำหรับ canvas นี้
    const existingTask = canvasRenderTasks.get(canvas);
    if (existingTask) {
  try {
        await existingTask.cancel();
    } catch (e) {
      // Ignore cancellation errors
    }
    canvasRenderTasks.delete(canvas);
  }

    // รอสักครู่เพื่อให้แน่ใจว่า canvas พร้อม
    await new Promise(resolve => setTimeout(resolve, 10));

    const page = await pdf.getPage(pageNumber);
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // คำนวณ scale
    const renderWidth = Math.min(containerWidth, 800);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = renderWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    // ตั้งค่า canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    
    // ล้าง canvas ก่อน render
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Render PDF page
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
};

    // สร้าง render task ใหม่
    const renderTask = page.render(renderContext);
    canvasRenderTasks.set(canvas, renderTask);

    // รอให้ render เสร็จ
    await renderTask.promise;
    
    // ลบ task หลังเสร็จ
    canvasRenderTasks.delete(canvas);
    
    return viewport;
  } catch (error: any) {
    // ลบ task ถ้าเกิด error
    canvasRenderTasks.delete(canvas);
    
    // ไม่ throw error ถ้าเป็นการยกเลิก
    if (error.name === 'RenderingCancelledException') {
      console.log('PDF rendering was cancelled');
      return null;
    }
    
    console.error('Error rendering PDF page:', error);
    throw error;
  }
};

// ฟังก์ชันสำหรับยกเลิก render ของ canvas ที่ระบุ
export const cancelCanvasRender = (canvas: HTMLCanvasElement) => {
  const task = canvasRenderTasks.get(canvas);
  if (task) {
    try {
      task.cancel();
    } catch (e) {
      // Ignore cancellation errors
    }
    canvasRenderTasks.delete(canvas);
  }
};

// ฟังก์ชันสำหรับยกเลิก render ทั้งหมด
export const cancelAllRenders = () => {
  canvasRenderTasks.forEach((task, canvas) => {
    try {
      task.cancel();
    } catch (e) {
      // Ignore cancellation errors
    }
  });
  canvasRenderTasks.clear();
};