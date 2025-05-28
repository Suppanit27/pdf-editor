'use client'

import React, { useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, Save, Signature, X, ChevronDown } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { PDFDocument } from 'pdf-lib'
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;


const fetchAndRenderPDF = async (url: string) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf: PDFDocumentProxy = await loadingTask.promise;

  console.log('Total pages:', pdf.numPages);
};

// แยกการ import อาจ
const loadPDFModule = async () => {
  try {
    const { loadPDF } = await import('@/utils/pdfUtils');
    return loadPDF;
  } catch (error) {
    console.error('Error loading PDF module:', error);
    return null;
  }
};

const uploadToS3Module = async () => {
  try {
    const { uploadToS3 } = await import('@/utils/s3Utils');
    return uploadToS3;
  } catch (error) {
    console.error('Error loading S3 module:', error);
    return null;
  }
};

const UploadPdf: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isSignature, setIsSignature] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)
  const [signatureImgUrl, setSignatureImgUrl] = useState<string>('')
  const [isUploadTab, setIsUploadTab] = useState(false)
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 })
  const [isDraggingSignature, setIsDraggingSignature] = useState(false)
  const [showSignatureOnPdf, setShowSignatureOnPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showSignatureMenu, setShowSignatureMenu] = useState(false)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [signatureOptions, setSignatureOptions] = useState<string[]>([])

  useEffect(() => {
    // อ่าน PDF URL และ userId จาก query parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pdfUrlParam = urlParams.get('pdfUrl');
      const userIdParam = urlParams.get('userId');

      if (userIdParam) {
        // เก็บ userId ใน localStorage เË่อใช้ต่อ
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
    try {
      const loadPDF = await loadPDFModule();
      if (!loadPDF) {
        throw new Error('PDF module could not be loaded');
      }
      
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await loadPDF(arrayBuffer);
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setShowSignatureOnPdf(false);
      setSignatureImgUrl('');
    } catch (error) {
      console.error('Error loading PDF from URL:', error);
      alert('ไม่สามารถโหลด PDF จาก URL น้ำ ได้');
    } finally {
      setIsLoading(false);
    }
  };

  // วางลายเซ็น
  const handlePlaceSignature = () => {
    if (!signatureRef.current) return
    const dataUrl = signatureRef.current.toDataURL()
    setSignatureImgUrl(dataUrl)
    setIsSignature(false)
    setShowSignatureOnPdf(true)
  }

  // เล่มลากลายเซ็น
  const startDraggingSignature = (e: React.MouseEvent) => {
    setIsDraggingSignature(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setSignaturePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  // ขณะลากลายเซ็น
  const handleDragSignature = (e: React.MouseEvent) => {
    if (!isDraggingSignature) return
    const rect = e.currentTarget.getBoundingClientRect()
    setSignaturePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  // ลากลายเซ็น
  const stopDraggingSignature = () => {
    setIsDraggingSignature(false)
  }

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage)
    }
  }, [pdfDocument, currentPage])

  const renderPage = async (pageNumber: number) => {
    if (!canvasRef.current || !pdfDocument) return

    try {
      const page = await pdfDocument.getPage(pageNumber)
      const containerWidth = containerRef.current?.offsetWidth || 800
      const renderWidth = containerWidth
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = renderWidth / baseViewport.width
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (canvas && context) {
        const dpr = window.devicePixelRatio || 1
        canvas.width = viewport.width * dpr
        canvas.height = viewport.height * dpr
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        await page.render(renderContext).promise

        // วาดลายเซ็นบน PDF ถ้า
        if (showSignatureOnPdf && signatureImgUrl) {
          const img = new Image()
          img.src = signatureImgUrl
          img.onload = () => {
            // ขนาดลายเซ็นให้เหมาะสม (ประมาณ 20% ของความกว้างหน้า)
            const signatureWidth = viewport.width * 0.2
            const signatureHeight = (signatureWidth * img.height) / img.width

            context.drawImage(
              img,
              signaturePosition.x,
              signaturePosition.y,
              signatureWidth,
              signatureHeight
            )
          }
        }
      }
    } catch (error) {
      console.error('Error rendering page:', error)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async e => {
        const pdfData = e.target?.result
        if (pdfData) {
          try {
            const loadPDF = await loadPDFModule();
            if (!loadPDF) {
              throw new Error('PDF module could not be loaded');
            }
            
            const pdf = await loadPDF(pdfData as string)
            setPdfDocument(pdf)
            setTotalPages(pdf.numPages)
            setShowSignatureOnPdf(false)
            setSignatureImgUrl('')
          } catch (error) {
            console.error('Error loading PDF:', error)
          }
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const savePdfWithSignature = async () => {
    if (!pdfDocument || !canvasRef.current) {
      alert('โหลด PDF ก่อน');
      return;
    }

    try {
      setIsLoading(true);
      
      // อ่าน userId จาก localStorage (<lemma่เก็บไว้จาก URL parameters)
      const userId = localStorage.getItem('currentSignatureUserId') || localStorage.getItem('id') || 'web_user';
      console.log('Using user ID for saving:', userId);
      
      // สร้าง PDF ใหม่
      const pdfDoc = await PDFDocument.create();
      
      // แปลง canvas เป็นภาพ
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // แปลง data URL เป็น Uint8Array
      const imageData = await fetch(imageDataUrl).then(res => res.arrayBuffer());
      
      // เลือกภาพลงใน PDF
      const image = await pdfDoc.embedJpg(imageData);
      
      // ตรวจสอบภาพยส่วนของภาพ
      const canvasWidth = canvas.width / window.devicePixelRatio;
      const canvasHeight = canvas.height / window.devicePixelRatio;
      const imageRatio = canvasWidth / canvasHeight;
      
      // เลือกขนาดกระดาษตามภาพยส่วนของภาพ
      let pageWidth, pageHeight;
      
      if (imageRatio > 1) {
        // ภาพแนวนอน - ใช้ A4 แนวนอน
        pageWidth = 841.89;
        pageHeight = 595.28;
      } else {
        // ภาพแนวตั้ง - ใช้ A4 แนวตั้ง
        pageWidth = 595.28;
        pageHeight = 841.89;
      }
      
      // สร้างหน้า PDF ตามภาพยทางของภาพ
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // คำนวณขนาดภาพยเหมาะสม - ใช้ 90% ของหน้ากระดาษ
      const maxWidth = pageWidth * 0.9;
      const maxHeight = pageHeight * 0.9;
      
      // คำนวณขนาดภาพ<lemma่จะใช้
      let scaledWidth, scaledHeight;
      
      if (canvasWidth / maxWidth > canvasHeight / maxHeight) {
        // <lemmaขนาดตามความกว้าง
        scaledWidth = maxWidth;
        scaledHeight = (maxWidth / canvasWidth) * canvasHeight;
      } else {
        // <lemmaขนาดตามความ<lemma
        scaledHeight = maxHeight;
        scaledWidth = (maxHeight / canvasHeight) * canvasWidth;
      }
      
      // คำนวณตำแหน่งเพื่อให้ภาพอยู่ตรงกลาง
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;
      
      // วางภาพลงในหน้า PDF
      page.drawImage(image, {
        x: x,
        y: y,
        width: scaledWidth,
        height: scaledHeight,
      });
      
      // เลือกข้อมูล metadata
      pdfDoc.setTitle('เอกสารลายเซ็น');
      pdfDoc.setAuthor('ระบบลายเซ็นเล็กทรอนิกส์');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());
      
      // ตั้งค่าการบอัดเพื่ออลดขนาดไฟล์
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      
      // แปลงเป็น Blob
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // สร้างชื่อไฟล์
      const timestamp = new Date().getTime();
      const fileName = `signed-pdf-${timestamp}.pdf`;
      
      // โหลดไฟล์ S3
      const uploadToS3 = await uploadToS3Module();
      if (!uploadToS3) {
        throw new Error('ไม่สามารถโหลดโมดูล S3 ได้');
      }
      
      // แปลง Blob เป็น Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
      });
      reader.readAsDataURL(pdfBlob);
      const base64data = await base64Promise;
      
      // โหลดไฟล์<lemma้น S3 โดยใช้ userId จาก URL
      const s3Url = await uploadToS3(base64data, fileName, 'application/pdf', userId);
      
      // อ่าน callback URL จาก query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callback');

      if (callbackUrl) {
        // ส่ง S3 URL และ userId
        const response = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfUrl: s3Url,
            fileName: fileName,
            userId: userId
          }),
        });

        if (response.ok) {
          alert('เอกสารพร้อมลายเซ็นแล้ว!');
          window.close();
        } else {
          alert('ไม่สามารถส่งเอกสารได้');
        }
      } else {
        // แสดงข้อความสำเร็จ
        alert(`PDF สำเร็จ\nURL: ${s3Url}\nUser ID: ${userId}`);
        
        // ดาวน์โหลดไฟล์
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(pdfBlob);
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      
    } catch (error) {
      console.error('ข้อ<lemmaพลาดในการสร้าง PDF:', error);
      alert('ข้อ<lemmaพลาดในการสร้าง PDF: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // เล่มปุ่มลายเซ็นจากฐานข้อมูล
  const handleFetchSignature = async () => {
    const success = await fetchAndShowSignature();
    if (!success) {
      // ถ้าไม่พบลายเซ็น ให้หน้าสร้างลายเซ็นใหม่
      setIsSignature(true);
    }
  };

  // เล่มก์ลายเซ็นจากฐานข้อมูลและแสดง
  const fetchAndShowSignature = async () => {
    try {
      // อ่าน ID ใช้จาก localStorage
      // const userId = localStorage.getItem('id') || 'web_user';
            const urlParams = new URLSearchParams(window.location.search);

      const userIdParam = urlParams.get('userId');

      // โหลดลายเซ็นจาก API
      const signatures = await loadRDSSign(userIdParam?.toString() || 'web_user');
      console.log('Fetched signatures:', signatures);

      if (signatures.length > 0) {
        // ใช้ลายเซ็นแรก
        setSignatureImgUrl(signatures[0]);
        setShowSignatureOnPdf(true);
        return true;
      } else {
        // ถ้าไม่พบลายเซ็น ให้แสดง dialog เลือกลายเซ็น
        setShowSignatureDialog(true);
        return false;
      }
    } catch (error) {
      console.error('Error fetching signature:', error);
      return false;
    }
  };

  // โหลดลายเซ็นตามโค้ด Flutter
  const loadRDSSign = async (userIdParam: string) => {
    try {
      // เคลียร์ลายเซ็นเก่า
      setSignatureOptions([]);

      // URL API
      const url = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';

      // สร้าง payload ด้วย userId <lemma่ได้จาก URL
      const payload = {
        "menu": "loadSignature",
        "id": userIdParam
      };

      console.log('Loading signatures for user ID:', userIdParam);

      // เรียก API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const jsonResponse = await response.json();

      if (jsonResponse.statusCode === 200) {
        if (jsonResponse.result && jsonResponse.result.length > 0) {
          console.log('Found signatures:', jsonResponse.result.length);
          // เก็บลิงก์ลายเซ็นพร้อม userId
          const links = jsonResponse.result.map((data: any) => ({
            url: data.signature_upload,
            userId: userIdParam
          }));
          // เก็บเฉพาะ URL<lemmaการแสดงผล
          const urls = links.map((item: { url: any }) => item.url);
          setSignatureOptions(urls);
          return urls;
        }
      } else {
        console.log('No signatures found for user ID:', userIdParam);
      }

      return [];
    } catch (error) {
      console.error('Error loading signatures:', error);
      return [];
    }
  };

  return (
    <div className="overflow-y-auto bg-gray-50 min-h-screen">
      {!pdfDocument && !isLoading && (
        <div className="text-center p-8 bg-white rounded-lg shadow-sm max-w-md mx-auto mt-8">
          <h2 className="text-xl font-medium text-gray-800 mb-4">เอกสาร PDF</h2>
          {pdfUrl ? (
            <div className="animate-pulse">
              <p className="text-gray-600 mb-2">โหลด PDF จาก URL...</p>
              <p className="text-sm text-gray-500 truncate max-w-xs mx-auto">{pdfUrl}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">ปโหลดไฟล์ PDF หรือ URL</p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}
        </div>
      )}
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64 p-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">โหลดเอกสาร...</p>
        </div>
      )}
      
      {pdfDocument && (
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div ref={containerRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex flex-wrap gap-2 items-center justify-end p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage <= 1}
                    className="p-1 text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 mx-1">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="p-1 text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="หน้าถัดไป"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => zoomIn?.()}
                  className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-sm transition-colors"
                  aria-label="ขยาย"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </button>
                <button
                  onClick={() => zoomOut?.()}
                  className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-sm transition-colors"
                  aria-label="ย่อ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </button>
                <button
                  onClick={() => resetTransform?.()}
                  className="p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-sm transition-colors"
                  aria-label="พอหน้าจอ"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6"></path>
                    <path d="M9 21H3v-6"></path>
                    <path d="M21 3l-7 7"></path>
                    <path d="M3 21l7-7"></path>
                  </svg>
                </button>
              </div>
              
              <div className="flex gap-2">
                {showSignatureOnPdf && (
                  <button
                    onClick={() => setShowSignatureOnPdf(false)}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors"
                  >
                    <X size={16} />
                    <span className="hidden sm:inline">ลบลายเซ็น</span>
                  </button>
                )}
                
                <div className="relative">
                  <button
                    onClick={() => setShowSignatureMenu(!showSignatureMenu)}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors"
                  >
                    <Signature size={16} />
                    <span className="hidden sm:inline">ลายเซ็น</span>
                    <ChevronDown size={14} />
                  </button>

                  {showSignatureMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-md z-50 w-48 overflow-hidden">
                      <button
                        onClick={() => {
                          setIsSignature(true);
                          setShowSignatureMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                      >
                        <Signature size={16} /> เลือกจากลายเซ็นใหม่
                      </button>
                      <button
                        onClick={() => {
                          fetchAndShowSignature();
                          setShowSignatureMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                      >
                        <Signature size={16} /> ใช้ลายเซ็นล่า
                      </button>
                      <button
                        onClick={() => {
                          setShowSignatureDialog(true);
                          setShowSignatureMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700"
                      >
                        <Signature size={16} /> เลือกจากลายเซ็น
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={savePdfWithSignature}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-colors"
                >
                  <Save size={16} />
                  <span className="hidden sm:inline">เซ็นเอกสาร</span>
                </button>
              </div>
            </div>
            
            <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} wheel={{ step: 0.1 }}>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <div
                  className="flex justify-center bg-gray-100 border-b relative"
                  onMouseDown={startDraggingSignature}
                  onMouseMove={handleDragSignature}
                  onMouseUp={stopDraggingSignature}
                  onMouseLeave={stopDraggingSignature}
                >
                  <TransformComponent wrapperClass="w-full py-4">
                    <canvas ref={canvasRef} className="shadow-md max-w-full" />
                  </TransformComponent>
                  
                  {showSignatureOnPdf && signatureImgUrl && (
                    <img
                      src={signatureImgUrl}
                      alt="Signature"
                      style={{
                        position: 'absolute',
                        left: `${signaturePosition.x}px`,
                        top: `${signaturePosition.y}px`,
                        width: '20%',
                        cursor: 'move',
                        zIndex: 10,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                      }}
                      onMouseDown={startDraggingSignature}
                    />
                  )}
                  
                  {totalPages > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-2 rounded-full shadow text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white p-2 rounded-full shadow text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </TransformWrapper>
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                setShowSignatureDialog(true);
                setShowSignatureMenu(false);
              }}
              className="flex items-center justify-center gap-1 px-6 py-3 text-white font-medium rounded-lg shadow-md transition-colors"
              style={{
                backgroundColor: '#4CCAB4',
                width: '352px',
                height: '42px',
              }}
            >
              <Signature size={18} className="mr-2" />
              <span className="text-base">เซ็นเอกสาร</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Modal ลายเซ็น */}
      {isSignature && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsSignature(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[90vw] max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">ลายเซ็น</h2>
            </div>
            
            <div className="flex border-b">
              <button
                className={`flex-1 px-4 py-3 ${!isUploadTab ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-600'}`}
                onClick={() => setIsUploadTab(false)}
              >
                วาดลายเซ็น
              </button>
              <button
                className={`flex-1 px-4 py-3 ${isUploadTab ? 'border-b-2 border-blue-600 font-medium text-blue-600' : 'text-gray-600'}`}
                onClick={() => setIsUploadTab(true)}
              >
                ปโหลดภาพ
              </button>
            </div>
            
            <div className="p-4">
              {!isUploadTab ? (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-4">
                    <SignatureCanvas
                      ref={signatureRef}
                      penColor="black"
                      canvasProps={{
                        width: 300,
                        height: 150,
                        className: 'w-full rounded bg-white',
                      }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <button
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                      onClick={() => signatureRef.current?.clear()}
                    >
                      ล้าง
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      onClick={handlePlaceSignature}
                    >
                      ใช้ลายเซ็น
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    3ปโหลด3ภาพลายเซ็น3
                  </p>
                  <label className="block mb-4">
                    <span className="sr-only">3กรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            if (ev.target?.result) {
                              setSignatureImgUrl(ev.target.result as string)
                              setShowSignatureOnPdf(true)
                              setIsSignature(false)
                            }
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Dialog เลือกลายเซ็น */}
      {showSignatureDialog && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSignatureDialog(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-[90vw] max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">3ลายเซ็น</h2>
              <button 
                onClick={() => setShowSignatureDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {signatureOptions.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-3">
                  {signatureOptions.map((url, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => {
                        console.log('Selected signature URL:', url);
                        console.log('Current signatureImgUrl:', setSignatureImgUrl(url));
                        console.log('Current signaturePosition:', setShowSignatureDialog(false));
                        console.log('Current signaturePosition:', setShowSignatureOnPdf(true));
                        setSignatureImgUrl(url);
                        setShowSignatureOnPdf(true);
                        setShowSignatureDialog(false);
                      }}
                    >
                      <img src={url} alt={`ลายเซ็น ${index + 1}`} className="w-full h-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-4">
                  ไม่พบลายเซ็นในฐานข้อมูล
                </p>
                <a
                  href="http://devdev.prachakij.com/paper/SIGN/login/login.php"
                  target="_blank"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("http://devdev.prachakij.com/paper/SIGN/login/login.php", "_blank");
                  }}
                >
                  ไป3ระบบลายเซ็น
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPdf
function setShowSignatureOnPdf(arg0: boolean) {
  throw new Error('Function not implemented.')
}

function setTotalPages(numPages: number) {
  throw new Error('Function not implemented.')
}

