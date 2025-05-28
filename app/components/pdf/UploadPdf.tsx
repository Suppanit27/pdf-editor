'use client'

import React, { useEffect, useRef, useState } from 'react'
import { PDFDocumentProxy } from 'pdfjs-dist'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { ChevronLeft, ChevronRight, Save, Signature, X, ChevronDown } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'

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
    // อ่าน PDF URL จาก query parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const pdfUrlParam = urlParams.get('pdfUrl');

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
    if (!pdfDocument || !canvasRef.current) return;

    try {
      // แสดงข้อความ
      alert('<|im_start|>่ะ<|im_start|>่ะไฟล์...');

      // สร้าง Base64 ของ PDF พร้อมลายเซ็น
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      tempCtx.drawImage(canvasRef.current, 0, 0);

      if (showSignatureOnPdf && signatureImgUrl) {
        const img = new Image();
        img.src = signatureImgUrl;
        await new Promise(resolve => {
          img.onload = resolve;
        });

        const signatureWidth = tempCanvas.width * 0.2;
        const signatureHeight = (signatureWidth * img.height) / img.width;

        tempCtx.drawImage(
          img,
          signaturePosition.x * (tempCanvas.width / canvasRef.current.offsetWidth),
          signaturePosition.y * (tempCanvas.height / canvasRef.current.offsetHeight),
          signatureWidth,
          signatureHeight
        );
      }

      // แปลง Canvas เป็น Blob
      const pdfBlob = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => {
          resolve(blob as Blob);
        }, 'image/png');
      });

      // สร้างชื่อไฟล์
      const timestamp = new Date().getTime();
      const fileName = `signed-pdf-${timestamp}.png`;

      // โหลด
      const uploadToS3 = await uploadToS3Module();
      if (!uploadToS3) {
        throw new Error('S3 module could not be loaded');
      }
      
      const s3Url = await uploadToS3(pdfBlob, fileName, 'image/png');
      console.log('PDF uploaded to S3:', s3Url);

      // อ่าน callback URL จาก query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callback');

      if (callbackUrl) {
        // ส่ง S3 URL ล่วงหน้า
        const response = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: s3Url,
            imageBase64: tempCanvas.toDataURL('image/png')
          }),
        });

        if (response.ok) {
          alert('เอกสารพร้อมลายเซ็นล่วงหน้า!');
          window.close();
        } else {
          alert('ไม่สามารถเอกสารได้');
        }
      } else {
        alert('เอกสารล่วงหน้า: ' + s3Url);
      }
    } catch (error) {
      console.error('Error saving PDF to S3:', error);
      alert('ข้อพลาดในการโหลดไฟล์: ' + error);
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
      const userId = localStorage.getItem('id') || 'web_user';

      // โหลดลายเซ็นจาก API
      const signatures = await loadRDSSign(userId);

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
  const loadRDSSign = async (userId: string) => {
    try {
      // เคลียร์ลายเซ็นเก่า
      setSignatureOptions([]);

      // URL API
      const url = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';

      // สร้าง payload
      const payload = {
        "menu": "loadSignature",
        "id": userId
      };

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
          // เก็บลิงก์ลายเซ็นทั้งหมด
          const links = jsonResponse.result.map((data: any) => data.signature_upload);
          setSignatureOptions(links);
          return links;
        }
      } else {
        console.log('No data!!');
      }

      return [];
    } catch (error) {
      console.error('Error loading signatures:', error);
      return [];
    }
  };

  return (
    <div className="overflow-y-auto">
      {!pdfDocument && (
        <div className="text-center p-4">
          <p>โหลด PDF...</p>
          {pdfUrl ? (
            <p className="text-sm text-gray-500">จาก URL: {pdfUrl}</p>
          ) : (
            <p className="text-sm text-red-500">ไม่พบ URL ของ PDF ณาระพารามิเตอร์ pdfUrl</p>
          )}
        </div>
      )}
      {pdfDocument && (
        <div ref={containerRef}>
          <TransformWrapper initialScale={1} minScale={1} maxScale={5} wheel={{ step: 0.1 }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="flex gap-2 items-center justify-center border">
                  <button
                    onClick={() => zoomIn()}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    ย่อ
                  </button>
                  <button
                    onClick={() => zoomOut()}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    ขยาย
                  </button>
              
                  <div className="relative">
                    <button
                      onClick={() => setShowSignatureMenu(!showSignatureMenu)}
                      className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded"
                    >
                      <Signature size={16} /> ลายเซ็น <ChevronDown size={16} />
                    </button>

                    {showSignatureMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded z-50 w-48">
                        <button
                          onClick={() => {
                            setIsSignature(true);
                            setShowSignatureMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100"
                        >
                          <Signature size={16} /> เล่มลายเซ็นใหม่
                        </button>
                        <button
                          onClick={() => {
                            fetchAndShowSignature();
                            setShowSignatureMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100"
                        >
                          <Signature size={16} /> ลายเซ็นล่า
                        </button>
                        <button
                          onClick={() => {
                            setShowSignatureDialog(true);
                            setShowSignatureMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-100"
                        >
                          <Signature size={16} /> เลือกลายเซ็นจากรายการ
                        </button>
                      </div>
                    )}
                  </div>
                  {showSignatureOnPdf && (
                    <button
                      onClick={() => setShowSignatureOnPdf(false)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded"
                    >
                      <X size={16} /> ลบลายเซ็น
                    </button>
                  )}
                </div>
                <div
                  className="flex justify-center flex-col border border-t-transparent relative w-full"
                  ref={containerRef}
                  onMouseDown={startDraggingSignature}
                  onMouseMove={handleDragSignature}
                  onMouseUp={stopDraggingSignature}
                  onMouseLeave={stopDraggingSignature}
                >
                  <TransformComponent wrapperClass="w-full">
                    <canvas ref={canvasRef} />
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
                      }}
                      onMouseDown={startDraggingSignature}
                    />
                  )}
                  <button
                    className="absolute -translate-y-1/2 bottom-1/2 left-0 z-50 bg-white/80 p-1 rounded-full shadow"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    className="absolute right-0 -translate-y-1/2 bottom-1/2 z-50 bg-white/80 p-1 rounded-full shadow"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight />
                  </button>
                </div>
              </>
            )}
          </TransformWrapper>
        </div>
      )}
      {isSignature && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-10"
          onClick={() => setIsSignature(false)}
        >
          <div
            className="bg-white p-4 rounded shadow-lg w-[90vw] max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">Signature Mode</h2>
            <div className="flex border-b mb-4">
              <button
                className={`flex-1 px-4 py-2 ${!isUploadTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'
                  }`}
                onClick={() => setIsUploadTab(false)}
              >
                เซ็น
              </button>
              <button
                className={`flex-1 px-4 py-2 ${isUploadTab ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'
                  }`}
                onClick={() => setIsUploadTab(true)}
              >
                ปโหลด
              </button>
            </div>
            {!isUploadTab ? (
              <>
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="black"
                  canvasProps={{
                    width: 300,
                    height: 100,
                    className: 'border border-gray-300 rounded w-full',
                  }}
                />
                <div className="flex justify-between mt-4">
                  <button
                    className="bg-gray-400 text-white px-4 py-2 rounded"
                    onClick={() => signatureRef.current?.clear()}
                  >
                    Clear
                  </button>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={handlePlaceSignature}
                  >
                    Use Signature
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Upload an image to use as your signature.
                </p>
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
                  className="mb-4"
                />
              </>
            )}
          </div>
        </div>
      )}
      {/* Dialog เลือกลายเซ็น */}
      {showSignatureDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-10"
          onClick={() => setShowSignatureDialog(false)}
        >
          <div
            className="bg-white p-4 rounded shadow-lg w-[90vw] max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">ลายเซ็น</h2>
            {signatureOptions.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto">
                <div className="flex flex-wrap">
                  {signatureOptions.map((url, index) => (
                    <div
                      key={index}
                      className="w-1/4 p-1 cursor-pointer hover:bg-gray-100"
                      onClick={() => selectSignature(url)}
                    >
                      <img src={url} alt={`ลายเซ็น ${index + 1}`} className="w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p>
                  ไม่พบลายเซ็นในฐานข้อมูล{" "}
                  <a
                    href="http://devdev.prachakij.com/paper/SIGN/login/login.php"
                    target="_blank"
                    className="text-blue-500 underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open("http://devdev.prachakij.com/paper/SIGN/login/login.php", "_blank");
                    }}
                  >
                    ลายเซ็น
                  </a>
                </p>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => setShowSignatureDialog(false)}
              >
                ยก
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            setShowSignatureDialog(true);
            setShowSignatureMenu(false);
          }}
          className="flex items-center justify-center gap-1 px-3 py-1 text-white"
          style={{
            backgroundColor: '#4CCAB499',
            width: '352px',
            height: '42px',
            borderRadius: '10px',

          }}
        >
          <h5 className="text-base font-medium text-gray-900 text-center font-sukhumvit-set text-[16px]">เซ็นเอกสาร</h5>
        </button>
      </div>
    </div>
  )
}

export default UploadPdf
