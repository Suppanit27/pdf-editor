// @ts-nocheck
'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Signature, X, Move } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { loadPdfDocument, renderPdfPage, clearRenderQueue } from '../../utils/pdfUtils'

const UploadPdf = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signatureOverlayRef = useRef<HTMLDivElement>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isSignature, setIsSignature] = useState(false);
  const signatureRef = useRef<any>(null);
  const [signatureImgUrl, setSignatureImgUrl] = useState('');
  const [signaturePosition, setSignaturePosition] = useState({ x: 100, y: 100 });
  const [showSignatureOnPdf, setShowSignatureOnPdf] = useState(false);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [signatureSize, setSignatureSize] = useState({ width: 150, height: 75 });
  const [pdfUrl, setPdfUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentViewport, setCurrentViewport] = useState<any>(null);
  const [isRendering, setIsRendering] = useState(false);
  const lastRenderRef = useRef<{ pdf: any, page: number } | null>(null);

  useEffect(() => {
    // อ่าน PDF URL และ userId จาก query parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pdfUrlParam = urlParams.get('pdfUrl');
      const userIdParam = urlParams.get('userId');

      if (userIdParam) {
        localStorage.setItem('id', userIdParam);
        localStorage.setItem('currentSignatureUserId', userIdParam);
        console.log('User ID from URL:', userIdParam);
      }

      if (pdfUrlParam) {
        setPdfUrl(pdfUrlParam);
        loadPdfFromUrl(pdfUrlParam);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const loadPdfFromUrl = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("โหลด PDF จาก URL:", url);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log("โหลดข้อมูล PDF สำเร็จ, ขนาด:", arrayBuffer.byteLength, "bytes");

      const pdf = await loadPdfDocument(arrayBuffer);
      
      console.log("โหลด PDF สำเร็จ, จำนวนหน้า:", pdf.numPages);
            setPdfDocument(pdf);
            setTotalPages(pdf.numPages);
      setCurrentPage(1);

      renderCurrentPage(pdf, 1);
    } catch (error: any) {
      console.error("Error loading PDF:", error);
      setError(`ไม่สามารถโหลด PDF ได้: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentPage = useCallback(async (pdf: any, pageNumber: number) => {
    if (!canvasRef.current || !pdf) {
      console.log('Skipping render - missing canvas or pdf');
      return;
    }

    // ตรวจสอบว่าเป็นการ render เดิมหรือไม่
    const currentRender = { pdf, page: pageNumber };
    if (lastRenderRef.current && 
        lastRenderRef.current.pdf === pdf && 
        lastRenderRef.current.page === pageNumber && 
        isRendering) {
      console.log('Skipping duplicate render request');
      return;
    }

    lastRenderRef.current = currentRender;
    setIsRendering(true);
    setError(null);

    try {
      console.log(`Starting render for page ${pageNumber}`);
      const containerWidth = containerRef.current?.offsetWidth || 800;
      const viewport = await renderPdfPage(pdf, pageNumber, canvasRef.current, containerWidth);
      
      if (viewport) {
      setCurrentViewport(viewport);
        console.log(`Page ${pageNumber} rendered successfully`);
      }
    } catch (error: any) {
        console.error('Error rendering page:', error);
        setError(`ไม่สามารถแสดงหน้า PDF ได้: ${error.message}`);
    } finally {
      setIsRendering(false);
    }
  }, [isRendering]);

  // ใช้ useEffect สำหรับการ render เมื่อ page เปลี่ยน
  useEffect(() => {
    if (pdfDocument && currentPage) {
      renderCurrentPage(pdfDocument, currentPage);
    }
  }, [pdfDocument, currentPage]);

  // วางลายเซ็น
  const handlePlaceSignature = () => {
    if (!signatureRef.current) return;
    const dataUrl = signatureRef.current.toDataURL();
    setSignatureImgUrl(dataUrl);
    setIsSignature(false);
    setShowSignatureOnPdf(true);
    
    // ตั้งตำแหน่งเริ่มต้นให้อยู่กลาง PDF
    if (currentViewport) {
      setSignaturePosition({
        x: (currentViewport.width - signatureSize.width) / 2,
        y: (currentViewport.height - signatureSize.height) / 2
      });
    }
  };

  // เริ่มการลากลายเซ็น
  const handleSignatureMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSignature(true);
    
    const rect = signatureOverlayRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - signaturePosition.x,
        y: e.clientY - rect.top - signaturePosition.y
      });
    }
};

  // ขณะลากลายเซ็น
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingSignature || !signatureOverlayRef.current) return;
    
    const rect = signatureOverlayRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
    // จำกัดขอบเขตให้อยู่ใน canvas
    const maxX = Math.max(0, (currentViewport?.width || 800) - signatureSize.width);
    const maxY = Math.max(0, (currentViewport?.height || 600) - signatureSize.height);
    
    setSignaturePosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDraggingSignature, dragOffset, currentViewport, signatureSize]);

  // หยุดการลาก
  const handleMouseUp = useCallback(() => {
    setIsDraggingSignature(false);
  }, []);

  // เพิ่ม event listeners สำหรับการลาก
  useEffect(() => {
    if (isDraggingSignature) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
};
    }
  }, [isDraggingSignature, handleMouseMove, handleMouseUp]);

  // จัดการการคลิกบน canvas เพื่อวางลายเซ็น
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showSignatureOnPdf || isDraggingSignature) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - signatureSize.width / 2;
    const y = e.clientY - rect.top - signatureSize.height / 2;
    
    // จำกัดขอบเขตให้อยู่ใน canvas
    const maxX = Math.max(0, (currentViewport?.width || 800) - signatureSize.width);
    const maxY = Math.max(0, (currentViewport?.height || 600) - signatureSize.height);
    
    setSignaturePosition({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      clearRenderQueue();
      lastRenderRef.current = null;
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const pdfData = e.target?.result;
        if (pdfData) {
          try {
            const pdf = await loadPdfDocument(pdfData as ArrayBuffer);
            setPdfDocument(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            setShowSignatureOnPdf(false);
            setSignatureImgUrl('');
            renderCurrentPage(pdf, 1);
          } catch (error: any) {
            console.error('Error loading PDF:', error);
            setError('ไม่สามารถโหลดไฟล์ PDF ได้');
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1 && !isRendering) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && !isRendering) {
      setCurrentPage(currentPage + 1);
    }
  };

  // ฟังก์ชันสำหรับปรับขนาดลายเซ็น
  const adjustSignatureSize = (scale: number) => {
    setSignatureSize(prev => ({
      width: Math.max(50, Math.min(300, prev.width * scale)),
      height: Math.max(25, Math.min(150, prev.height * scale))
    }));
  };

  // ล้าง render queue เมื่อ component unmount
  useEffect(() => {
    return () => {
      clearRenderQueue();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {isLoading ? (
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700">กำลังโหลด PDF...</p>
        </div>
      ) : error ? (
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-xl mb-4">⚠️ เกิดข้อพลาด</div>
          <p className="text-gray-800 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ลองใหม่
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          {/* PDF display content */}
          <div ref={containerRef} className="relative bg-white rounded-lg shadow-lg p-4">
            <div 
              ref={signatureOverlayRef}
              className="relative"
              style={{ 
                width: currentViewport?.width || 800, 
                height: currentViewport?.height || 600 
              }}
            >
              <canvas 
                ref={canvasRef} 
                className="border border-gray-300 rounded shadow-lg max-w-full h-auto" 
                onClick={handleCanvasClick}
                style={{ 
                  cursor: showSignatureOnPdf ? 'crosshair' : 'default',
                  display: 'block'
                }}
              />
              
              {/* Draggable Signature Overlay */}
              {showSignatureOnPdf && signatureImgUrl && (
                <div
                  className={`absolute border-2 border-dashed border-blue-500 bg-white/10 rounded cursor-move ${
                    isDraggingSignature ? 'border-blue-700 bg-blue-100/20' : 'hover:border-blue-600'
                  }`}
                  style={{
                    left: signaturePosition.x,
                    top: signaturePosition.y,
                    width: signatureSize.width,
                    height: signatureSize.height,
                    zIndex: 10
                  }}
                  onMouseDown={handleSignatureMouseDown}
                >
                  <img
                    src={signatureImgUrl}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  
                  {/* Move icon */}
                  <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                    <Move size={12} />
                  </div>
                  
                  {/* Size controls */}
                  <div className="absolute -bottom-8 left-0 flex space-x-1 bg-white rounded shadow-lg p-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSignatureSize(0.8);
                      }}
                      className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      -
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSignatureSize(1.2);
                      }}
                      className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Rendering indicator */}
            {isRendering && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                <div className="bg-white p-3 rounded-lg shadow-lg flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-gray-700">กำลังแสดงหน้า {currentPage}...</span>
                </div>
              </div>
            )}
            
            {/* Signature instructions */}
            {showSignatureOnPdf && !isRendering && (
              <div className="mt-2 text-sm text-green-600 text-center">
                <p>🖱️ คลิกบน PDF หรือลากลายเซ็นเพื่อวางในตำแหน่งที่ต้องการ</p>
                <p className="text-xs text-gray-500 mt-1">ใช้ปุ่ม + และ - เพื่อปรับขนาดลายเซ็น</p>
              </div>
            )}
          </div>
          
          {/* Navigation controls */}
          {pdfDocument && (
            <div className="flex justify-center items-center mt-4 space-x-4">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1 || isRendering}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 flex items-center"
              >
                <ChevronLeft size={20} />
                <span className="ml-1">ก่อนหน้า</span>
              </button>
              <span className="text-gray-700 font-medium px-4">
                หน้า {currentPage} จาก {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages || isRendering}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 flex items-center"
              >
                <span className="mr-1">ถัดไป</span>
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex justify-center items-center mt-4 space-x-4">
            <button
              onClick={() => setIsSignature(true)}
              disabled={isRendering}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 flex items-center space-x-2"
            >
              <Signature size={20} />
              <span>เซ็นลายเซ็น</span>
            </button>
            
            {showSignatureOnPdf && (
              <button
                onClick={() => {
                  setShowSignatureOnPdf(false);
                  setSignatureImgUrl('');
                }}
                disabled={isRendering}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
              >
                ลบลายเซ็น
              </button>
            )}
          </div>

          {/* File upload */}
          <div className="flex justify-center mt-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isRendering}
              className="block w-full max-w-xs text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {isSignature && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[90vw] max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">เซ็นลายเซ็น</h2>
              <button
                onClick={() => setIsSignature(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="border border-gray-300 rounded mb-4">
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  width: 400,
                  height: 150,
                  className: 'w-full h-auto',
                }}
              />
            </div>
            <div className="flex justify-between">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                onClick={() => signatureRef.current?.clear()}
              >
                ล้าง
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={handlePlaceSignature}
              >
                ใช้ลายเซ็น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPdf;
