// lib/api.ts
import axios from 'axios';

const API_URL = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';
const PDFToS3_URL = 'https://oxphgjyvu2.execute-api.ap-southeast-1.amazonaws.com/latest/uploadPDFS3_Center';
const SavePDFPayload = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';

export const loadRDSSignAPI = async (id: string): Promise<string[]> => {
  try {
    const payload = {
      menu: 'searchSignRDS',
      id,
    };

    const response = await axios.post(API_URL, payload);

    if (response.data.statusCode?.toString() === '200') {
      return response.data.result?.map((data: any) => data.url) || [];
    } else {
      console.warn('No data!!');
      return [];
    }
  } catch (error) {
    console.error('Error in loadRDSSignAPI:', error);
    return [];
  }
};

export const uploadPDFToS3 = async (base64PDF: string): Promise<string | null> => {
  try {
    const payload = {
      name: 'MappMS',
      folder: 'MappMS/signPDF',
      image: base64PDF.replace(/^data:application\/pdf;base64,/, '') // ตัด prefix ออก
    };

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
      console.error('S3 Upload Failed:', json);
      return null;
    }
  } catch (error) {
    console.error('Error in uploadPDFToS3:', error);
    return null;
  }
};


interface SavePDFPayload {
  id: string;
  linkPDF: string;
  dataPDF: any; // ปรับตามโครงสร้างข้อมูลจริงของคุณ
  system?: string;
}

export const savePDFtoRDS = async (id: string, linkPDF: string, dataPDF: any): Promise<boolean> => {
  try {
    const requestBody = {
      menu: 'saveSignRDSweb',
      id,
      linkPDF,
      member_id_approve: dataPDF[0]?.member_id_approve,
      member_id_approve2: dataPDF[0]?.member_id_approve2,
      member_id_approve3: dataPDF[0]?.member_id_approve3,
      member_id_approve4: dataPDF[0]?.member_id_approve4,
      member_id_approve5: dataPDF[0]?.member_id_approve5,
      member_status_approve: dataPDF[0]?.member_status_approve,
      member_status_approve2: dataPDF[0]?.member_status_approve2,
      member_status_approve3: dataPDF[0]?.member_status_approve3,
      member_status_approve4: dataPDF[0]?.member_status_approve4,
      member_status_approve5: dataPDF[0]?.member_status_approve5,
      refer_id: dataPDF[0]?.refer_id,
      running: dataPDF[0]?.running,
      system: 'App_MS24',
    };
    console.log('requestBody:', requestBody);
    console.log('dataPDF:', dataPDF[0]?.member_id_approve,);

//     dataPDF.forEach((item, index) => {
//   console.log(`Item ${index} running:`, item.running);
// });
    const response = await axios.post(API_URL, requestBody);

    console.log('response:', response.data);
    if (response.data.statusCode?.toString() === '200') {
      console.log('Save success!');
      return true;
    } else {
      console.warn('Save fail!');
      return false;
    }
  } catch (error) {
    console.error('Error in savePDFtoRDS:', error);
    return false;
  }
};

export const loadNitrosign = async (running: string): Promise<Uint8Array | null> => {
  try {
    const requestBody = {
      menu: 'searchNitrosignrunning',
      running,
    };
    const response = await axios.post(API_URL, requestBody);
    console.log('response:', response.data);
    if (response.data.statusCode?.toString() === '200') {
      console.log('Load success!');
      const dataPDF = response.data.result;
      return dataPDF; // Return the actual PDF data
    } else {
      console.warn('Load failed!');
      return null;
    }
  } catch (error) {
    console.error('Error in loadNitrosign:', error);
    return null;
  }
};

async function fetchSignatureAsBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`โหลดลายเซ็นไม่สำเร็จ: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
