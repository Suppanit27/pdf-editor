// lib/api.ts
import axios from 'axios';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { apiPost } from '@/app/utils/apiPost';

const API_URL = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';
const OldsendTelegramPKG ='https://dockerapi-ci.prachakij.com/jwtauth';


export interface MemberDetail {
  id: string;
  name: string;
  email?: string;
  // เพิ่ม field ที่ต้องการใช้งานต่อ เช่น position, department ฯลฯ
}

export const loadMemberDetailAPI = async (id: string): Promise<MemberDetail | null> => {
  try {
    const payload = {
      menu: 'loaddetailmember',
      id,
    };
    const response = await axios.post(API_URL, payload);

    if (response.status?.toString() === '200') {
      const result = response.data;

      if (Array.isArray(result) && result.length > 0) {
        return result[0] as MemberDetail;

      }
      return null;
    } else {
      console.warn('loadMemberDetailAPI: No data returned');
      return null;
    }
  } catch (error) {
    console.error('Error in loadMemberDetailAPI:', error);
    return null;
  }
};

export async function createPdfNDA(
  id: string,
  thprefix: string,
  full_name_th: string,
  full_name_en: string,
  date_in: string,
  company: string,
  typeNDA: string
): Promise<void> {
  let spreadsheets_range = ''

  // if (company === 'RAFCOgr') {
  //   spreadsheets_range = typeNDA === 'RAFCO_RPTN'
  //     ? 'P_สัญญาไม่เปิดเผยข้อมูลที่เป็นความลับ_RAFCO_RPTN!A1:G'
  //     : 'P_สัญญาไม่เปิดเผยข้อมูลที่เป็นความลับ_RAFCO_AIIL!A1:G'
  // } else if (company === 'RPLCgr') {
  //   spreadsheets_range = typeNDA === 'RPLC_RUAM'
  //     ? 'P_สัญญาไม่เปิดเผยข้อมูลที่เป็นความลับ_RPLC_Ruam!A1:G'
  //     : 'P_สัญญาไม่เปิดเผยข้อมูลที่เป็นความลับ_RPLC_RAFCO!A1:G'
  // } else {
    spreadsheets_range = 'P_สัญญาไม่เปิดเผยข้อมูลที่เป็นความลับ!A1:G'
  // }

  const url = `http://webapp.prachakij.com:8080/BCT/Print_document_by_form_Spreadsheet_NDA.jsp?spreadsheets_key=1oy1_NhCkvRbdtbC-vSH7B7_M7FRvU327yl5qB_1bIic&spreadsheets_range=` +
          spreadsheets_range.toString() +
          "&member_name_th=" +
          thprefix +
          "" +
          full_name_th.toString() +
          "&member_name_en=" +
          full_name_en.toString() +
          "&date_in_work=" +
          date_in.toString() +
          "&member_id=" +
          id.toString();
  console.log('Generated URL:', url)
  const payload = {
    url,
    name: `${id}_${full_name_th}`,
    bucket: 'url2img-pdf',
    path: 'pdf/MS24/PDF_NDA',
    format: 'A4',
    pageRanges: 'all',
    rout: 'urltopdf'
  }
  console.log('payload:', payload)
  console.log('123456:')

apiPost("https://dockerapi-ci.prachakij.com/jwtauth", payload)
  .then(result => {
    console.log("PDF created:", result);
    updateLinkPdfNDA(result.toString());
  })
  .catch(error => {
    console.error("Error:", error.message);
  });
  // try {
  //     console.log(payload);
  //     updateLinkPdfNDA(response.toString());
  //   // urlToPdf(url, './pdf_output', `${id}_${full_name_th}.pdf`)
  // } catch (error) {
  //   console.error('API call failed:', error)
  // }
}

export async function updateLinkPdfNDA(dataLinkNDA: string) {
  try {
    const id = localStorage.getItem('id')
    const email = localStorage.getItem('email1')

    const now = new Date()
    const dateUpdate = now.toLocaleDateString('th-TH') // หรือใช้ dayjs/format แทน

    const payload = {
      menu: 'updateLinkPdfNDA',
      id,
      email,
      linkNDA: dataLinkNDA,
      dateUpdate
    }
    console.log('Payload for updateLinkPdfNDA:', payload)
    const response = await axios.post(
      'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest',
      payload
    )      
    console.log('response from updateLinkPdfNDA:', response.data)


    if (response.data.statusCode?.toString() === '200') {
      console.log('อัพเดทเรียบร้อย')
      // แสดง PDF: อาจโหลดซ้ำหรือ setState
      // เช่น: window.open(dataLinkNDA)
    } else {
      console.warn('ไม่สามารถอัพเดทลิงก์ได้:', response.data.msg)
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดขณะอัปเดตลิงก์ NDA:', error)
  }
}



