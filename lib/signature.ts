// lib/api.ts
import axios from 'axios';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { apiPost } from '@/app/utils/apiPost';
import { toast } from 'react-toastify';

const API_URL = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';
const OldsendTelegramPKG = 'https://dockerapi-ci.prachakij.com/jwtauth';
const PDFToS3_URL = 'https://oxphgjyvu2.execute-api.ap-southeast-1.amazonaws.com/latest/uploadPDFS3_Center';


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

// export const uploadToS3 = async(base64Image: string) => {
//   // Read values from localStorage (แทน SharedPreferences)
//   const statusCreateSignature = "0"; // Default to "0" if not found
//   const id = localStorage.getItem('id');
//   const thprefix = localStorage.getItem('thprefix');
//   const full_name_th = localStorage.getItem('full_name_th');
//   const full_name_en = localStorage.getItem('full_name_en');
//   const date_in = localStorage.getItem('datein');
//   const company = localStorage.getItem('division_name_gr') || '';
//   const typeNDA = localStorage.getItem('type_NDA') || '';

//   let bucket = "";
//   let typeSig = "";
//       bucket = "MappMS/img_Signature_NDA_P1";
//       typeSig = "_e_signatureP1";
//   // if (statusCreateSignature === "1") {
//   //   bucket = "MappMS/img_Signature_NDA_P1";
//   //   typeSig = "_e_signatureP1";
//   // } else if (statusCreateSignature === "2") {
//   //   bucket = "MappMS/img_Signature_NDA_P2";
//   //   typeSig = "_e_signatureP2";
//   // } else {
//   //   bucket = "MappMS/img_Signature_NDA";
//   //   typeSig = "_e_signature1";
//   // }

//   const url = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest/img_Signature_NDA';

//   const payload = {
//     name: "MappMS",
//     id,
//     typeSig,
//     folder: bucket,
//     image: base64Image,
//   };

//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload),
//     });
//     console.log("response", response);

//     const jsonResponse = await response.json();
//     console.log("jsonResponse", jsonResponse);
//     if (jsonResponse?.statusCode?.toString() === "200") {
//       const imageUrl = jsonResponse.result?.url?.Location;
//             console.log("linkImmageS3 :", jsonResponse.result.url.Location);

//       if (statusCreateSignature != "0") {
//         createNDASuccess(id || '', thprefix || '', full_name_th || '', full_name_en || '', date_in || '', company, typeNDA); // เรียกสร้าง PDF
//       } else {
//         // window.history.back(); // หรือใช้ router.push(...) ขึ้นอยู่กับ framework
//       }
//     } else {
//       console.error('Upload failed');
//       toast.error("Upload failed!", {
//         position: "top-center",
//         autoClose: 3000,
//       });
//     }
//   } catch (err) {
//     console.error("Upload error:", err);
//     toast.error("Upload error!", {
//       position: "top-center",
//       autoClose: 3000,
//     });
//   }
// }

export const uploadPDFToS3 = async (base64PDF: string) => {
  try {
    const payload = {
      name: 'MappMS',
      folder: 'MappMS/PDF_NDA_Signature',
      image: base64PDF.replace(/^data:application\/pdf;base64,/, ''),
    };
      console.log('PDF uploaded to S3:', base64PDF);

    // const response = await axios.post(PDFToS3_URL, payload);
    const response = await fetch('https://oxphgjyvu2.execute-api.ap-southeast-1.amazonaws.com/latest/uploadPDFS3_Center', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

  const json = await response.json();
    if (json.statusCode?.toString() === '200') {
      return json.result.url.Location; // ✅ ลิงก์ที่อัปโหลดเสร็จ
    } else {
      console.warn('Upload failed!');
      return null;
    }
  } catch (error) {
    console.error('Error in uploadPDFToS3:', error);
    return null;
  }
};

export async function createPdfNDA(
  id: string,
  email: string,
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

  const nameUSED = `${id}_เทส_ไทย`;

  const payload = {
    url,
    name: nameUSED,
    bucket: 'url2img-pdf',
    path: 'pdf/MS24/PDF_NDA',
    format: 'A4',
    pageRanges: 'all',
    rout: 'urltopdf'
  }

  apiPost("https://dockerapi-ci.prachakij.com/jwtauth", payload)
    .then(result => {
      updateLinkPdfNDA(email,result.toString());
    })
    .catch(error => {
      console.error("Error:", error.message);
    });
}
//************************************* ตอนสร้าง ************************************************** */
export async function updateLinkPdfNDA(email: string,dataLinkNDA: string) {
  try {
    const id = localStorage.getItem('id')


    const now = new Date()
    const dateUpdate = now.toLocaleDateString('th-TH') // หรือใช้ dayjs/format แทน

    const payload = {
      menu: 'updateLinkPdfNDA',
      id,
      email,
      linkNDA: dataLinkNDA,
      dateUpdate
    }
    const response = await axios.post(
      'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest',
      payload
    )

    if (response.data.statusCode?.toString() === '200') {
      const LinkNDA = dataLinkNDA;
      return LinkNDA;
      // แสดง PDF: อาจโหลดซ้ำหรือ setState
      window.open(dataLinkNDA)
    } else {
      console.warn('ไม่สามารถอัพเดทลิงก์ได้:', response.data.msg)
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดขณะอัปเดตลิงก์ NDA:', error)
  }
}
//************************************* จบตอนสร้าง ************************************************** */

//************************************* ตอนบันทึก ************************************************** */
export async function updateLinkPdfNDASuccess(email: string,dataLinkNDA: string) {
  try {
    const id = localStorage.getItem('id')


    const now = new Date()
    const dateUpdate = now.toLocaleDateString('th-TH') // หรือใช้ dayjs/format แทน

    const payload = {
      menu: 'updateLinkPdfNDASuccess',
      id,
      email,
      linkNDA: dataLinkNDA,
      dateUpdate
    }
    console.log("dataLinkNDA:",dataLinkNDA);
    const response = await axios.post(
      'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest',
      payload
    )

    if (response.data.statusCode?.toString() === '200') {
      // const LinkNDA = dataLinkNDA;
      // แสดง PDF: อาจโหลดซ้ำหรือ setState
      window.open(dataLinkNDA)
    } else {
      console.warn('ไม่สามารถอัพเดทลิงก์ได้:', response.data.msg)
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดขณะอัปเดตลิงก์ NDA:', error)
  }
}
//************************************* จบตอนบันทึก ************************************************** */
interface ApiResponse {
  surname_en: any;
  name_en: any;
  surname_th: any;
  name_th: any;
  statusCode: string;
  msg?: string;
  result?: {
    statusBoardCommittee?: string;
    link_NDA?: string | null;
    link_NDA_Signature?: string | null;
  }[];
}

export async function loadLinkNDA(
  id: string,
  email: string,
  thprefix:string,
  full_name_th: string,
  full_name_en: string,
  datein: string,
  company: string,
  typeNDA: string
) {
  try {
    const { data } = await axios.post<ApiResponse>(API_URL, {
      menu: 'searchNDAPPP7',
      id: id,
    });

    const status = data.statusCode.toString();
    const result = data.result![0];
    if (status === '200' && data.result) {
      const result = data.result![0];
      const linkNDA = result.link_NDA;
      const linkNDASignature = result.link_NDA_Signature;
      if (linkNDA === 'null' || linkNDA === '' || linkNDA === null) {
        await createPdfNDA(
          id,
          email,
          thprefix,
          full_name_th,
          full_name_en,
          datein,
          company,
          typeNDA
        );
      } else {
        if(!linkNDASignature || linkNDASignature === 'null' || linkNDASignature === ''){
          return linkNDA
        }else{
          return linkNDASignature
        }
        // setLinkNDA(finalLink || '');
        // await loadPdf(finalLink || '');
      }
    } else {
    console.error('loadLinkNDA error:');
    }
  } catch (error: any) {
    console.error('loadLinkNDA error:', error);
  }
}