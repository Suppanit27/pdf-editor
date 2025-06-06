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
export const savePDFtoRDS = async (payload: SavePDFPayload): Promise<boolean> => {
  try {
    const requestBody = {
      menu: 'saveSignRDS',
      id: payload.id,
      linkPDF: payload.linkPDF,
      dataPDF: payload.dataPDF,
      system: payload.system || 'App_MS24',
    };
    const response = await axios.post(API_URL, requestBody);

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