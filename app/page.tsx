import React from 'react';
import ClientWrapper from './components/ClientWrapper';
import '../utils/domMatrixMock';

// สร้าง static params  static export
export function generateStaticParams() {
  return [{}]; // สร้างเฉพาะหน้าแรก
}

export default function Page() {
  return <ClientWrapper />;
}
