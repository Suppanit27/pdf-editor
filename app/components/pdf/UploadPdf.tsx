// @ts-nocheck
'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Signature,
  X,
  Move,
  Download,
  Save,
  Upload,
  Trash2,
} from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { PDFDocument, rgb } from 'pdf-lib'
import { saveAs } from 'file-saver'
import { loadPdfDocument, renderPdfPage, cancelAllRenders } from '../../utils/pdfUtils'
import { loadMemberDetailAPI } from '@/lib/signature'
import { useSearchParams } from 'next/navigation'
import { createPdfNDA } from '@/lib/signature'
import { updateLinkPdfNDA } from '@/lib/signature'
import { uploadToS3 } from '@/utils/s3Utils'
import { urlToPdf } from './urlToPdf';


const UploadPdf = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const signatureOverlayRef = useRef<HTMLDivElement>(null)
  const [pdfDocument, setPdfDocument] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isSignature, setIsSignature] = useState(false)
  const signatureRef = useRef<any>(null)
  const [signatureImgUrl, setSignatureImgUrl] = useState('')
  const [signaturePosition, setSignaturePosition] = useState({ x: 100, y: 100 })
  const [showSignatureOnPdf, setShowSignatureOnPdf] = useState(false)
  const [isDraggingSignature, setIsDraggingSignature] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [signatureSize, setSignatureSize] = useState({ width: 150, height: 75 })
  const [pdfUrl, setPdfUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [succeed, setSucceed] = useState<string | null>(null)

  const [currentViewport, setCurrentViewport] = useState<any>(null)
  const [isRendering, setIsRendering] = useState(false)
  const lastRenderRef = useRef<{ pdf: any; page: number } | null>(null)
  const [originalPdfBytes, setOriginalPdfBytes] = useState<ArrayBuffer | null>(null)
  const [savedPdfUrl, setSavedPdfUrl] = useState<string | null>(null)
  const [pdfLink, setPdfLink] = useState<string | null>(null)
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)
  const [imageSignature, setImageSignature] = useState<string[]>([])
  const [isUploadTab, setIsUploadTab] = useState(false)
  const searchParams = useSearchParams()
  const findId = searchParams.get('userId')
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);


  useEffect(() => {
    loadMemberDetailAPI(findId)
      .then(data => {
        if (data) {
            const urlParams = new URLSearchParams(window.location.search);
  const userIdParam = urlParams.get('userId');
  const pdfUrlParam = urlParams.get('pdfUrl');
          const full_name_th = `${data.name_th} ${data.surname_th}`;
          const full_name_en = `${data.name_en} ${data.surname_en}`;
          console.log('data.datein:', data.date_in);
          createPdfNDA(
          userIdParam ?? '',
          data.thprefix ?? '',
          full_name_th,
          full_name_en,
          data.date_in ?? '',
          data.company_management ?? '',
          data.typeNDA ?? ''
        );

          console.log("full_name_th:",full_name_th);
        //   // getSpreadsheetRange(data.company_management,data.typeNDA)
        //   localStorage.setItem('full_name_th', full_name_th);
        //   localStorage.setItem('full_name_en', full_name_en);
        //   localStorage.setItem('thprefix', data.thprefix ?? '');
        //   localStorage.setItem('datein', data.datein ?? '');
        //   localStorage.setItem('division_name_gr', data.company_management ?? '');
        //   localStorage.setItem('type_NDA', data.typeNDA ?? '');
        //   // setMemberData(data); // <== สมมุติคุณมี useState ชื่อ setMemberData

        //   console.log('ข้อมูลสมาชิก:', data);
        //           console.log(createPdfNDA(
        //   userIdParam ?? '',
        //   data.thprefix ?? '',
        //   full_name_th,
        //   full_name_en,
        //   data.datein ?? '',
        //   data.company_management ?? '',
        //   data.typeNDA ?? ''
        // ));
        //           console.log('123456789');

        // //    createPdfNDA(
        // //   userIdParam ?? '',
        // //   data.thprefix ?? '',
        // //   full_name_th,
        // //   full_name_en,
        // //   data.datein ?? '',
        // //   data.company_management ?? '',
        // //   data.typeNDA ?? ''
        // // );

        } else {
          console.warn('ไม่พบข้อมูลสมาชิก');
        }
      })
      // .catch(error => {
      //   console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลสมาชิก:', error);
      //   setError('ไม่สามารถโหลดข้อมูลสมาชิกได้');
      // });

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const pdfUrlParam = urlParams.get('pdfUrl')
      const userIdParam = urlParams.get('userId')
      console.log('userIdParam:', userIdParam)
      console.log('pdfUrlParam:', pdfUrlParam)

      if (userIdParam) {
        localStorage.setItem('id', userIdParam)
        localStorage.setItem('currentSignatureUserId', userIdParam)
      }

      if (pdfUrlParam) {

        setPdfUrl(pdfUrlParam)
        loadPdfFromUrl(pdfUrlParam)
      } else {
        setIsLoading(false)
      }
    }
  }, [])


  const loadPdfFromUrl = async (url: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      console.log('โหลดข้อมูล PDF สำเร็จ, ขนาด:', arrayBuffer.byteLength, 'bytes')

      // เก็บ original PDF bytes
      setOriginalPdfBytes(arrayBuffer)

      const pdf = await loadPdfDocument(arrayBuffer)

      console.log('โหลด PDF สำเร็จ, จำนวนหน้า:', pdf.numPages)
      setPdfDocument(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)

      renderCurrentPage(pdf, 1)
    } catch (error: any) {
      console.error('Error loading PDF:', error)
      setError(`ไม่สามารถโหลด PDF ได้: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const renderCurrentPage = useCallback(
    async (pdf: any, pageNumber: number) => {
      if (!canvasRef.current || !pdf) {
        console.log('Skipping render - missing canvas or pdf')
        return
      }

      // ยกการเรนเดอร์ก่อนหน้าก่อนเริ่มเรนเดอร์ใหม่
      cancelAllRenders()

      // ตรวจสอบว่าเป็นการ render เมื่อไม่
      const currentRender = { pdf, page: pageNumber }
      if (
        lastRenderRef.current &&
        lastRenderRef.current.pdf === pdf &&
        lastRenderRef.current.page === pageNumber &&
        isRendering
      ) {
        console.log('Skipping duplicate render request')
        return
      }

      // รอให้การเรนเดอร์ก่อนหน้าเสร็จสิ้น
      if (isRendering) {
        console.log('Waiting for previous render to complete')
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      lastRenderRef.current = currentRender
      setIsRendering(true)
      setError(null)

      try {
        console.log(`Starting render for page ${pageNumber}`)
        const containerWidth = containerRef.current?.offsetWidth || 800
        const viewport = await renderPdfPage(pdf, pageNumber, canvasRef.current, containerWidth)

        if (viewport) {
          setCurrentViewport(viewport)
          console.log(`Page ${pageNumber} rendered successfully`)
        }
      } catch (error: any) {
        console.error('Error rendering page:', error)
        setError(`ไม่สามารถแสดงหน้า PDF ได้: ${error.message}`)
      } finally {
        setIsRendering(false)
      }
    },
    [isRendering]
  )

  // ใช้ useEffect ในการ render เมื่อ page เปลี่ยน
  useEffect(() => {
    if (pdfDocument && currentPage) {
      renderCurrentPage(pdfDocument, currentPage)
    }
  }, [pdfDocument, currentPage])

  // วางลายเซ็น
  const handlePlaceSignature = () => {
    if (!signatureRef.current) return
    const dataUrl = signatureRef.current.toDataURL()
    setSignatureImgUrl(dataUrl)
    setIsSignature(false)
    setShowSignatureOnPdf(true)

    // ตั้งตำแหน่งเริ่มต้นให้อยู่กลาง PDF
    if (currentViewport) {
      setSignaturePosition({
        x: (currentViewport.width - signatureSize.width) / 2,
        y: (currentViewport.height - signatureSize.height) / 2,
      })
    }
  }

  // เลือมการลากลายเซ็น
  const handleSignatureMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingSignature(true)

    const rect = signatureOverlayRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - signaturePosition.x,
        y: e.clientY - rect.top - signaturePosition.y,
      })
    }
  }

  // ขณะลากลายเซ็น
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingSignature || !signatureOverlayRef.current) return

      const rect = signatureOverlayRef.current.getBoundingClientRect()
      const newX = e.clientX - rect.left - dragOffset.x
      const newY = e.clientY - rect.top - dragOffset.y

      // ขอบเขตให้อยู่ใน canvas
      const maxX = Math.max(0, (currentViewport?.width || 800) - signatureSize.width)
      const maxY = Math.max(0, (currentViewport?.height || 600) - signatureSize.height)

      setSignaturePosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    },
    [isDraggingSignature, dragOffset, currentViewport, signatureSize]
  )

  // ลาก
  const handleMouseUp = useCallback(() => {
    setIsDraggingSignature(false)
  }, [])

  // เลือม event listeners ในการลาก
  useEffect(() => {
    if (isDraggingSignature) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingSignature, handleMouseMove, handleMouseUp])

  // บน canvasวางลายเซ็น
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showSignatureOnPdf || isDraggingSignature) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - signatureSize.width / 2
    const y = e.clientY - rect.top - signatureSize.height / 2

    // ขอบเขตให้อยู่ใน canvas
    const maxX = Math.max(0, (currentViewport?.width || 800) - signatureSize.width)
    const maxY = Math.max(0, (currentViewport?.height || 600) - signatureSize.height)

    setSignaturePosition({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    })
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // เปลี่ยนจาก clearRenderQueue เป็น cancelAllRenders
      cancelAllRenders()
      lastRenderRef.current = null

      const reader = new FileReader()
      reader.onload = async e => {
        const pdfData = e.target?.result
        if (pdfData) {
          try {
            const pdf = await loadPdfDocument(pdfData as ArrayBuffer)
            setPdfDocument(pdf)
            setTotalPages(pdf.numPages)
            setCurrentPage(1)
            setShowSignatureOnPdf(false)
            setSignatureImgUrl('')
            renderCurrentPage(pdf, 1)
          } catch (error: any) {
            console.error('Error loading PDF:', error)
            setError('ไม่สามารถโหลดไฟล์ PDF ได้')
          }
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1 && !isRendering) {
      // ยกการเรนเดอร์ก่อนหน้าก่อนเปลี่ยนหน้า
      cancelAllRenders()
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages && !isRendering) {
      // ยกการเรนเดอร์ก่อนหน้าก่อนเปลี่ยนหน้า
      cancelAllRenders()
      setCurrentPage(currentPage + 1)
    }
  }

  // ขนาดลายเซ็น
  const adjustSignatureSize = (scale: number) => {
    setSignatureSize(prev => ({
      width: Math.max(50, Math.min(300, prev.width * scale)),
      height: Math.max(25, Math.min(150, prev.height * scale)),
    }))
  }

  // ล้าง render queue เมื่อ component unmount
  useEffect(() => {
    return () => {
      // เปลี่ยนจาก clearRenderQueue เป็น cancelAllRenders
      cancelAllRenders()
    }
  }, [])

  const copyPdfLink = () => {
    if (pdfLink) {
      navigator.clipboard
        .writeText(pdfLink)
        .then(async () => {
          setShowCopiedTooltip(true);
          setTimeout(() => setShowCopiedTooltip(false), 2000);
          console.log('ลอกลิงค์สำเร็จ');
          console.log('pdfLink:', pdfLink);
          const userId = localStorage.getItem('id') || '';
          console.log('userId:', userId);
          console.log('dataPDF:', pdfData);
          // เรียก updateLinkPdfNDA หลังคัดลอกสำเร็จ
          const success = await updateLinkPdfNDA(pdfLink);

          if (!success) {
            setError('บันทึกลิงก์ไม่สำเร็จ');
          }
        })
        .catch(err => {
          console.error('ไม่สามารถลอกลิงค์ได้:', err);
          setError('ไม่สามารถลอกลิงค์ได้');
        });
    }
  };


  const savePdfWithSignature = async () => {
    if (!pdfDocument || !showSignatureOnPdf || !signatureImgUrl || !originalPdfBytes) {
      setError('เอกสารและลายเซ็นให้พร้อมก่อน');
      return;
    }

    try {
      setIsLoading(true);
      const pdfDoc = await PDFDocument.load(originalPdfBytes);

      let signatureImage;
      console.log("signatureImage:", signatureImage);

      console.log(signatureImgUrl.startsWith('http'));

      if (signatureImgUrl.startsWith('http')) {
        const response = await fetch(signatureImgUrl, { method: 'GET', mode: 'cors', cache: 'no-cache' });
        const arrayBuffer = await response.arrayBuffer();
        console.log("arrayBuffer:", arrayBuffer);

        const signatureBytes = new Uint8Array(arrayBuffer);
        console.log("signatureBytes:", signatureBytes);

        signatureImage = await pdfDoc.embedPng(signatureBytes); // ✅ ใช้งานตรงนี้ได้เลย
        console.log("signatureImage:", signatureImage);
      } else {

        signatureImage = await pdfDoc.embedPng(signatureImgUrl);
        console.log("signatureImage:", signatureImage);

      }

      const pages = pdfDoc.getPages();
      const page = pages[currentPage - 1];

      const pdfWidth = page.getWidth();
      const pdfHeight = page.getHeight();
      const canvasWidth = currentViewport?.width || 800;
      const canvasHeight = currentViewport?.height || 600;

      const scaleX = pdfWidth / canvasWidth;
      const scaleY = pdfHeight / canvasHeight;

      const signatureX = signaturePosition.x * scaleX;
      const signatureY = pdfHeight - signaturePosition.y * scaleY - signatureSize.height * scaleY;
      const signatureWidth = signatureSize.width * scaleX;
      const signatureHeight = signatureSize.height * scaleY;

      page.drawImage(signatureImage, {
        x: signatureX,
        y: signatureY,
        width: signatureWidth,
        height: signatureHeight,
      });
      const id = localStorage.getItem('id') ?? '';
      const thprefix = localStorage.getItem('thprefix') ?? '';
      const full_name_th = localStorage.getItem('full_name_th') ?? '';
      const full_name_en = localStorage.getItem('full_name_en') ?? '';
      const date_in = localStorage.getItem('datein') ?? '';
      const company_management = localStorage.getItem('division_name_gr') ?? '';
      const type_NDA = localStorage.getItem('type_NDA') ?? '';
      // บันทึก PDF เป็น bytes
      const pdfBytes = await pdfDoc.save();
      console.log('pdfBytes:', pdfBytes);

      // แปลง pdfBytes เป็น base64 string
      const base64PDF = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

      // --- เรียกอัปโหลดไป S3 ---
      // console.log('base64PDF:', base64PDF, '0', findId, thprefix, full_name_th, full_name_en, date_in);
      const s3Link = await uploadToS3(base64PDF, `${findId}_${full_name_th}.pdf`, 'application/pdf', findId || 'web_user');
      if (!s3Link) {
        setError('อัปโหลดไฟล์ไป S3 ไม่สำเร็จ');
        setIsLoading(false);
        return;
      }
      setPdfLink(s3Link); // แสดงลิงก์ PDF
      console.log('s3Link:', s3Link);

      // --- เรียกบันทึกลิงก์ใน RDS ---
      const userId = localStorage.getItem('id') || '';
      console.log('userId:', userId);
      console.log('s3Link:', s3Link);
      console.log('dataPDF:', pdfData);
      try {
        await updateLinkPdfNDA(s3Link);
        setSucceed('บันทึกข้อมูลในระบบสำเร็จ');
        console.log('บันทึกข้อมูลในระบบสำเร็จ');
      } catch (error) {
        console.error('Error updating PDF link:', error);
        setError('บันทึกลิงก์ไม่สำเร็จ');
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error('Error saving PDF:', error);
      setError(`ไม่สามารถบันทึก PDF ได้: ${error.message}`);
      setIsLoading(false);
    }
  };


  const TextSignaturePad: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [text, setText] = useState('')
    const [fontSize, setFontSize] = useState(40)
    const [fontFamily] = useState('cursive')
    const [signatureImage, setSignatureImage] = useState<string | null>(null)
    const [uploadedImage, setUploadedImage] = useState<File | null>(null)

    const drawSignature = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = `${fontSize}px ${fontFamily}`
        ctx.fillStyle = 'blue'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)
      }
    }

    useEffect(() => {
      drawSignature()
    }, [text, fontSize])

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && file.type === 'image/png') {
        setUploadedImage(file)
        const reader = new FileReader()
        reader.onload = () => {
          const img = new Image()
          img.onload = () => {
            const canvas = canvasRef.current
            const ctx = canvas?.getContext('2d')
            if (canvas && ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            }
          }
          if (typeof reader.result === 'string') {
            img.src = reader.result
          }
        }
        reader.readAsDataURL(file)
      }
    }

    const saveSignature = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        setSignatureImage(dataUrl)
        console.log('ลายเซ็น base64:', dataUrl)
      }
    }

    const clearCanvas = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setText('')
        setSignatureImage(null)
        setUploadedImage(null)
      }
    }

    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          className="border border-black"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            placeholder="พิมพ์ชื่อ"
            onChange={(e) => setText(e.target.value)}
          />
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
            {[20, 30, 40, 50, 60].map((size) => (
              <option key={size} value={size}>{size}pt</option>
            ))}
          </select>
        </div>
        <p className="text-red-600 text-sm">
          ขนาดรูป (2:1) เช่น 300px × 150px<br />
          รูปพื้นหลังโปร่งใสประเภทไฟล์ PNG
        </p>
        <input type="file" accept="image/png" onChange={handleUpload} />
        <div className="flex gap-3 mt-2">
          <button onClick={saveSignature} className="bg-green-600 text-white px-4 py-1 rounded">บันทึก</button>
          <button onClick={clearCanvas} className="bg-red-600 text-white px-4 py-1 rounded">ล้าง</button>
        </div>
        {signatureImage && (
          <div>
            <p>ลายเซ็นที่ได้:</p>
            <img src={signatureImage} alt="signature preview" className="border mt-2" />
          </div>
        )}
      </div>
    )
  }


  const handlePlaceImageSignature = (url: string) => {
    setSignatureImgUrl(url)
    setIsSignature(false)
    setShowSignatureOnPdf(true)
    if (currentViewport) {
      setSignaturePosition({
        x: (currentViewport.width - signatureSize.width) / 2,
        y: (currentViewport.height - signatureSize.height) / 2,
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {isLoading ? (
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700">โหลด PDF...</p>
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
      ) : succeed ? (<div className="text-center p-6 bg-white rounded-lg shadow-lg">
        <div className="text-green-500 text-xl mb-4">✅ สำเร็จ</div>
        <p className="text-gray-800 mb-4">{succeed}</p>
        <button
          onClick={() => window.close()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          ตกลง
        </button>
      </div>
      ) : (
        <div className="w-full max-w-4xl">
          {/* ส่วนด้านบน */}
          <div className="flex justify-end items-center mb-4">
            <div className="flex space-x-2">
              {showSignatureOnPdf && (
                <button
                  onClick={() => {
                    setShowSignatureOnPdf(false)
                    setSignatureImgUrl('')
                  }}
                  disabled={isRendering}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 flex items-center justify-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>ลบลายเซ็น</span>
                </button>
              )}

              {showSignatureOnPdf && !pdfLink && (
                <button
                  onClick={savePdfWithSignature}
                  disabled={isRendering || !showSignatureOnPdf}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 flex items-center"
                >
                  <Save size={18} className="mr-1" />
                  <span>บันทึก PDF</span>
                </button>
              )}

              {pdfLink && (
                <div className="relative">
                  <button
                    onClick={copyPdfLink}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                  >
                    <Save size={18} className="mr-1" />
                    <span>ลอกลิงค์ PDF</span>
                  </button>

                  {showCopiedTooltip && (
                    <div className="absolute right-0 mt-2 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg">
                      ลอกลิงค์แล้ว!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PDF display content */}
          <div ref={containerRef} className="relative bg-white rounded-lg shadow-lg p-4">
            <div
              ref={signatureOverlayRef}
              className="relative"
              style={{
                width: currentViewport?.width || 800,
                height: currentViewport?.height || 600,
              }}
            >
              <canvas
                ref={canvasRef}
                className="border border-gray-300 rounded shadow-lg max-w-full h-auto"
                onClick={handleCanvasClick}
                style={{
                  cursor: showSignatureOnPdf ? 'crosshair' : 'default',
                  display: 'block',
                }}
              />

              {/* Draggable Signature Overlay */}
              {showSignatureOnPdf && signatureImgUrl && (
                <div
                  className={`absolute border-2 border-dashed border-blue-500 bg-white/10 rounded cursor-move ${isDraggingSignature ? 'border-blue-700 bg-blue-100/20' : 'hover:border-blue-600'
                    }`}
                  style={{
                    left: signaturePosition.x,
                    top: signaturePosition.y,
                    width: signatureSize.width,
                    height: signatureSize.height,
                    zIndex: 10,
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
                      onClick={e => {
                        e.stopPropagation()
                        adjustSignatureSize(0.8)
                      }}
                      className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      -
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        adjustSignatureSize(1.2)
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

            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-md">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage <= 1}
                    className="p-2 text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={24} />
                  </button>

                  <span className="text-lg font-semibold text-gray-800 mx-2 min-w-[60px] text-center">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="p-2 text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="หน้าถัดไป"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            )}

            {isRendering && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                <div className="bg-white p-3 rounded-lg shadow-lg flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-gray-700">แสดงหน้า {currentPage}...</span>
                </div>
              </div>
            )}

            {/* Signature instructions */}
          </div>

          {/* Navigation controls */}

          {/* Control buttons */}
          <div className="flex justify-center items-center mt-4 space-x-4">
            <button
              onClick={() => setIsSignature(true)}
              disabled={isRendering}
              style={{ backgroundColor: '#4CCAB499' }}
              className="w-full  rounded-[10px] px-6 py-2 bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 flex items-center justify-center space-x-2"
            >
              <Signature size={20} />
              <span>เซ็นลายเซ็น</span>
            </button>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {isSignature && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-10"
          onClick={() => setIsSignature(false)}
        >
          <div
            className="bg-white p-4 rounded shadow-lg w-[90vw] max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">เลือกรูปแบบลายเซ็น</h2>
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
                ลายเซ็นของฉัน
              </button>
            </div>
            {!isUploadTab ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  เลือกลายเซ็นที่ต้องการ
                </p>
                {imageSignature.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {imageSignature.map((url, index) => (
                      <div
                        key={index}
                        onClick={() => handlePlaceImageSignature(url)}
                        className="cursor-pointer border p-2 rounded hover:bg-gray-100"
                      >
                        <img src={url} alt={`Signature ${index}`} className="w-full h-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8">
                    <p1 className="text-sm text-gray-600 mb-4">ไม่มีลายเซ็นกรุณาเพิ่มลายเซ็นของคุณ</p1>
                    <br />
                    <a href="https://devdev.prachakij.com/paper/SIGN/new_sign.php" target="_blank" rel="noopener noreferrer">
                      <button>
                        สร้างลายเซ็น
                      </button>
                    </a>
                    {/* <h1 className="text-2xl font-bold mb-4">สร้างลายเซ็น</h1>
                    <TextSignaturePad /> */}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPdf
