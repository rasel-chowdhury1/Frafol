import path from 'path';
import fs from 'fs';


export const deleteFile = async (filePath: string) => {

  try {
    // normalize path to avoid double slashes
    const fullPath = path.join(__dirname, "../public", filePath.replace(/^\/+/, ''));

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log("deleted:", fullPath);
    } else {
      console.log("not found:", fullPath);
    }
  } catch (err: any) {
    throw new Error(`Error deleting file: ${err.message}`);
  }
};

export const storeFile = (folderName: string, filename: string) => {
  return `/uploads/${folderName}/${filename}`;
};