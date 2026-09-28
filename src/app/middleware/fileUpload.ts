import { Request } from 'express';
import multer from 'multer';

const fileUpload = () => {
  const storage = multer.memoryStorage();

  const upload = multer({
    storage,

    // IMPORTANT:
    // Don't keep 10GB here with memoryStorage.
    limits: {
      fileSize: 100 * 1024 * 1024, // example: 100MB
    },

    fileFilter: (req: Request, file, cb) => {
      const allowedMimeTypes = [
        'image/png',
        'image/jpg',
        'image/jpeg',
        'image/webp',
        'image/svg+xml',

        'video/mp4',
        'video/avi',
        'video/mov',
        'video/quicktime',
        'video/mkv',

        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}`));
      }
    },
  });

  return upload;
};

export default fileUpload;

// import { Request } from 'express';
// import fs from 'fs';
// import multer from 'multer';

// // Create a generic file upload function that accepts a directory
// const fileUpload = (uploadDirectory: string) => {


//   // Ensure the directory exists or create it
//   if (!fs.existsSync(uploadDirectory)) {
//     fs.mkdirSync(uploadDirectory, { recursive: true });
//   }

//   const storage = multer.diskStorage({
//     destination: function (req: Request, file, cb) {
//       // Set destination based on the provided upload directory


//       if (file.fieldname === 'introVideo' || file.fieldname === 'video') {
//         cb(null, './public/uploads/video');
//       } else {
//         cb(null, uploadDirectory);
//       }
//     },
//     filename: function (req: Request, file, cb) {
//       // Generate a unique file name
//       const parts = file.originalname.split('.');
//       let extension;
//       if (parts.length > 1) {
//         extension = '.' + parts.pop();
//       }
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//       cb(
//         null,
//         parts.shift()!.replace(/\s+/g, '_') + '-' + uniqueSuffix + extension,
//       );
//     },
//   });


//   const upload = multer({
//     storage,
//     limits: { fileSize: 10000 * 1024 * 1024 }, // 10gb limit for files
//     fileFilter: (req: Request, file, cb) => {

//       // Check file type for video or document
//       const allowedMimeTypes = [
//         'image/png',
//         'image/jpg',
//         'image/jpeg',
//         'image/svg',
//         'image/webp',
//         'application/octet-stream',
//         'image/svg+xml',
//         'video/mp4',
//         'video/avi',
//         'video/mov',
//         'video/quicktime',
//         'video/mkv',
//         'application/pdf',
//         'application/msword',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       ];

//       if (allowedMimeTypes.includes(file.mimetype)) {
//         cb(null, true);
//       } else {
//         cb(new Error('Invalid file type!'));
//       }
//     },
//   });

//   return upload;
// };

// export default fileUpload;