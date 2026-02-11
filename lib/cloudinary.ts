
// interface CloudinaryUploadResult {
//   public_id: string;
//   secure_url: string;
//   format: string;
//   bytes: number;
// }

// export async function uploadToCloudinary(buffer: Buffer<ArrayBuffer>, name: string, file: File): Promise<CloudinaryUploadResult> {
//   const formData = new FormData();
//   formData.append('file', file);
//   formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'studymate_documents');
//   formData.append('folder', 'studymate/documents');

//   const response = await fetch(
//     `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`,
//     {
//       method: 'POST',
//       body: formData,
//     }
//   );

//   if (!response.ok) {
//     throw new Error('Failed to upload file to Cloudinary');
//   }

//   return response.json();
// }

// export async function deleteFromCloudinary(publicId: string): Promise<void> {
//   const response = await fetch(
//     `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         public_id: publicId,
//         signature: process.env.CLOUDINARY_API_SECRET,
//       }),
//     }
//   );

//   if (!response.ok) {
//     throw new Error('Failed to delete file from Cloudinary');
//   }
// }


import { v2 as cloudinary } from "cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format?: string;
  bytes?: number;
}

// ✅ Upload Buffer (BEST for Next.js API Routes)
export async function uploadToCloudinary(
buffer: Buffer, fileName: string, file: File): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "studymate/documents",
        resource_type: "raw", // pdf, doc, txt etc
        public_id: fileName.replace(/\.[^/.]+$/, ""), 
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as CloudinaryUploadResult);
      }
    ).end(buffer);
  });
}

// ✅ Delete File
export async function deleteFromCloudinary(publicId: string) {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
  });
}

