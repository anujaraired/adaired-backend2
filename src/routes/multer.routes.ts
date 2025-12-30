import express, { Router, Request, Response, NextFunction } from "express";
import { upload } from "../middlewares/multerMiddleware";
import { CustomError } from "../middlewares/error";
import {
  deleteImage,
  fetchImageByPublicId,
  fetchImagesInFolder,
  uploadImages,
  editImageInfo,
  getCloudinaryStorageUsage,
} from "../utils/cloudinary";

const router: Router = express.Router();

// Endpoint to upload files
router.post(
  "/upload",
  upload.array("files"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new CustomError(400, "No files uploaded");
      }

      const results = await uploadImages(files);
      res.status(200).json({
        message: "Files uploaded successfully",
        data: results,
      });
    } catch (error: any) {
      next(new CustomError(500, error.message));
    }
  }
);

// Route to get uploaded media
router.get(
  "/getUploadedMedia",
  async (req: Request, res: Response, next: NextFunction) => {
    const { fileType } = req.query; // Extract fileType from query
    try {
      // Call the fetchImagesInFolder function with the new fileType parameter
      const results = await fetchImagesInFolder(
        fileType as "svg" | "non-svg" | "all"
      );
      res.status(200).json({
        message: "Files fetched successfully",
        data: results,
      });
    } catch (error: any) {
      next(new CustomError(500, error.message));
    }
  }
);

// Route to get image by public ID
router.get(
  "/getImageByPublicId",
  async (req: Request, res: Response, next: NextFunction) => {
    const { public_id } = req.query;
    try {
      const result = await fetchImageByPublicId(public_id as string);
      res.status(200).json({
        message: "Image fetched successfully",
        data: result.resources[0],
      });
    } catch (error: any) {
      next(new CustomError(500, error.message));
    }
  }
);

// Route to delete file by public ID
router.delete(
  "/deleteFile",
  async (req: Request, res: Response, next: NextFunction) => {
    const { public_id } = req.query;
    try {
      const result = await deleteImage(public_id as string);

      if (result.result === "ok") {
        res.json({
          message: "Image deleted successfully",
        });
      } else {
        throw new CustomError(500, "Failed to delete image from Cloudinary");
      }
    } catch (error: any) {
      next(new CustomError(500, error.message));
    }
  }
);

// Route to edit image metadata
router.put(
  "/editImage",
  async (req: Request, res: Response, next: NextFunction) => {
    const { public_id } = req.query;
    const { caption, alt } = req.body;

    try {
      const result = await editImageInfo(
        public_id as string,
        caption,
        alt
      );
      res.status(200).json({
        message: "Image metadata updated successfully",
        data: result,
      });
    } catch (error: any) {
      next(new CustomError(500, error.message));
    }
  }
);

// Route to get cloudinary usage information
router.get(
  "/get-usage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getCloudinaryStorageUsage();
      res.status(200).json({
        message: "Cloudinary usage updated successfully",
        data: result,
      });
    } catch (error: any) {
      next(new CustomError(500, error.message));
    }
  }
);

export default router;
