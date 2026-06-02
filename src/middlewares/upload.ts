import multer from "multer";
import type { Request } from "express";

// Store files in memory buffer (ideal for uploading directly to cloud)
const storage = multer.memoryStorage();

const fileFilter = (req:Request, file:Express.Multer.File, cb:Function) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

export default upload;
