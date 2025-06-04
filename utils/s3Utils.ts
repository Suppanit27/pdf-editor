export const uploadToS3 = async (
  file: Blob | Buffer | ArrayBuffer | string,
  fileName: string = '',
  contentType: string = 'image/jpeg',
  userId: string = 'web_user'
): Promise<string> => {
  try {
    // แปลงไฟล์เป็น Base64 ถ้าไม่ใช่ string
    let base64Image = '';

    if (typeof file === 'string') {
      base64Image = file;
    } else {
      let bytes: Uint8Array;

      if (file instanceof ArrayBuffer) {
        bytes = new Uint8Array(file);
      } else if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
      } else if (Buffer.isBuffer(file)) {
        // ใช้ Buffer เป็น Uint8Array ได้โดยตรง
        bytes = new Uint8Array(file);
      } else {
        throw new Error('Unsupported file type for uploadToS3');
      }

      base64Image = btoa(
        bytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
    }



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
