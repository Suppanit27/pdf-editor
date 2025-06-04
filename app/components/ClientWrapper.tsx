'use client'

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';

const UploadPdfNoSSR = dynamic(() => import('./pdf/UploadPdf').then(mod => mod.default), {
  ssr: false,
});
export default function ClientWrapper() {
  useEffect(() => {
    import('../../utils/domMatrixMock'); // import only runs on client
  }, []);

  return <UploadPdfNoSSR/>;
}
