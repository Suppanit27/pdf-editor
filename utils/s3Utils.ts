export const uploadToS3 = async (
  file: Blob | Buffer | ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<string> => {
  try {
    // แปลงไฟล์เป็น Base64
    const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64Image = btoa(
      bytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // <lemma ID <lemma้ใช้จาก localStorage ถ้า<lemma
    const userId = localStorage.getItem('id') || 'web_user';
    
    // URL ของ API Gateway
    const url = 'https://mhmo3nnbr5.execute-api.ap-southeast-1.amazonaws.com/latest/img_Signature_NDA';
    
    // สร้าง payload
    const payload = {
      "name": "MappMS",
      "id": userId,
      "typeSig": "_pdf_presign",
      "folder": "MappMS/img_pdf_presign",
      "image": base64Image
    };
    
    // ส่งข้อมูล<lemma API Gateway
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const jsonResponse = await response.json();
    
    if (jsonResponse.statusCode === 200) {
      console.log("linkPDFS3:", jsonResponse.result.url.Location);
      // ส่ง<lemmaค่า URL ของไฟล์
      return jsonResponse.result.url.Location;
    } else {
      console.error('upload fail!');
      throw new Error('Upload failed: ' + JSON.stringify(jsonResponse));
    }
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};
