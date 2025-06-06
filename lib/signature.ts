// lib/api.ts
import axios from 'axios';

const API_URL = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest';
const PDFToS3_URL = 'https://oxphgjyvu2.execute-api.ap-southeast-1.amazonaws.com/latest/uploadPDFS3_Center';
const SavePDFPayload = 'https://agilesoftgroup.com/MS24_uat/saveSignRDS';

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

export const uploadPDFToS3 = async (base64Image: string): Promise<string | null> => {
  try {
    const payload = {
      name: 'MappMS',
      folder: 'MappMS/signPDF',
      image: base64Image,
    };

    const response = await axios.post(PDFToS3_URL, payload);

    if (response.data.statusCode?.toString() === '200') {
      const url = response.data.result?.url?.Location;
      console.log('PDF uploaded to S3:', url);
      return url || null;
    } else {
      console.warn('Upload failed!');
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