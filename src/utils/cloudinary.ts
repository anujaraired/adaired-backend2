import dotenv from "dotenv";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { CustomError } from "../middlewares/error";

dotenv.config();

/* --------------------------------------------------
   Types
-------------------------------------------------- */

interface CloudinarySearchResponse<T = any> {
  resources: T[];
  next_cursor?: string;
}

interface CloudinaryResource {
  public_id: string;
  secure_url?: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  created_at?: string;
  [key: string]: any;
}

/* --------------------------------------------------
   Cloudinary Config
-------------------------------------------------- */

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  });
} catch (error) {
  console.error("Cloudinary configuration error:", error);
  throw new CustomError(500, "Cloudinary configuration failed");
}

const TICKET_ATTACHMENTS_FOLDER = "ticket_attachments";

/* --------------------------------------------------
   Ticket Attachments Upload
-------------------------------------------------- */

export const uploadTicketAttachments = async (files: Express.Multer.File[]) => {
  try {
    const uploadPromises = files.map(
      (file) =>
        new Promise<UploadApiResponse>((resolve, reject) => {
          const isSvg = file.mimetype === "image/svg+xml";

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: TICKET_ATTACHMENTS_FOLDER,
              resource_type: isSvg ? "image" : "auto",
            },
            (error, result) => {
              if (error) {
                reject(
                  new CustomError(
                    500,
                    `Failed to upload ${file.originalname}: ${error.message}`
                  )
                );
              } else if (result) {
                resolve(result);
              } else {
                reject(
                  new CustomError(500, `Upload failed for ${file.originalname}`)
                );
              }
            }
          );

          uploadStream.end(file.buffer);
        })
    );

    const results = await Promise.allSettled(uploadPromises);

    const successfulUploads = results
      .filter(
        (r): r is PromiseFulfilledResult<UploadApiResponse> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    const failedUploads = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);

    if (failedUploads.length > 0) {
      throw new CustomError(
        400,
        `Failed to upload ${failedUploads.length} files`
      );
    }

    return successfulUploads.map((upload) => ({
      url: upload.secure_url,
      publicId: upload.public_id,
      fileName: upload.original_filename || "file",
      fileType: upload.resource_type,
      fileSize: upload.bytes,
      uploadedAt: new Date(upload.created_at),
    }));
  } catch (error: any) {
    throw new CustomError(
      error.statusCode || 500,
      error.message || "Failed to upload ticket attachments"
    );
  }
};

/* --------------------------------------------------
   Delete Ticket Attachments
-------------------------------------------------- */

export const deleteTicketAttachments = async (publicIds: string[]) => {
  if (!publicIds.length) return;

  try {
    const result = await cloudinary.api.delete_resources(publicIds);

    const failed = Object.entries(result.deleted)
      .filter(([_, status]) => status !== "deleted")
      .map(([id]) => id);

    if (failed.length) {
      throw new CustomError(
        500,
        `Failed to delete ${failed.length} attachments`
      );
    }

    return result;
  } catch (error: any) {
    throw new CustomError(
      error.statusCode || 500,
      error.message || "Failed to delete ticket attachments"
    );
  }
};

/* --------------------------------------------------
   Upload Images
-------------------------------------------------- */

export const uploadImages = async (files: Express.Multer.File[]) => {
  try {
    const uploadPromises = files.map(
      (file) =>
        new Promise<UploadApiResponse>((resolve, reject) => {
          const isSvg = file.mimetype === "image/svg+xml";

          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: isSvg ? "image" : "auto" },
            (error, result) => {
              if (error) reject(error);
              else if (result) resolve(result);
              else reject(new Error("Upload failed"));
            }
          );

          uploadStream.end(file.buffer);
        })
    );

    const results = await Promise.allSettled(uploadPromises);

    const successfulUploads = results
      .filter(
        (r): r is PromiseFulfilledResult<UploadApiResponse> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    let allImages: CloudinaryResource[] = [];
    let nextCursor: string | undefined;

    do {
      const response = (await cloudinary.search
        .expression("resource_type:image")
        .sort_by("created_at", "desc")
        .max_results(500)
        .next_cursor(nextCursor)
        .execute()) as CloudinarySearchResponse<CloudinaryResource>;

      allImages = allImages.concat(response.resources);
      nextCursor = response.next_cursor;
    } while (nextCursor);

    return { successfulUploads, allImages };
  } catch (error) {
    throw new CustomError(500, "Image upload failed");
  }
};

/* --------------------------------------------------
   Fetch Image By Public ID
-------------------------------------------------- */

export const fetchImageByPublicId = async (publicId: string) => {
  try {
    return await cloudinary.search
      .expression(`public_id:${publicId}`)
      .execute();
  } catch {
    throw new CustomError(500, "Failed to fetch image by public ID");
  }
};

/* --------------------------------------------------
   Fetch Images in Folder
-------------------------------------------------- */

export const fetchImagesInFolder = async (
  fileType: "svg" | "non-svg" | "all" = "all"
): Promise<CloudinaryResource[]> => {
  let resources: CloudinaryResource[] = [];
  let nextCursor: string | undefined;

  let expression = "resource_type:image";
  if (fileType === "svg") expression += " AND format:svg";
  if (fileType === "non-svg") expression += " AND NOT format:svg";

  do {
    const response = (await cloudinary.search
      .expression(expression)
      .sort_by("created_at", "desc")
      .max_results(50)
      .next_cursor(nextCursor)
      .execute()) as CloudinarySearchResponse<CloudinaryResource>;

    resources = resources.concat(response.resources);
    nextCursor = response.next_cursor;
  } while (nextCursor);

  return resources;
};

/* --------------------------------------------------
   Delete Image
-------------------------------------------------- */

export const deleteImage = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok") {
      throw new Error("Delete failed");
    }
    return result;
  } catch {
    throw new CustomError(500, "Failed to delete image");
  }
};

/* --------------------------------------------------
   Edit Image Info
-------------------------------------------------- */

export const editImageInfo = async (
  publicId: string,
  caption?: string,
  alt?: string
) => {
  const context: Record<string, string> = {};
  if (caption) context.caption = caption;
  if (alt) context.alt = alt;

  try {
    return await cloudinary.uploader.explicit(publicId, {
      type: "upload",
      context,
    });
  } catch {
    throw new CustomError(500, "Failed to edit image info");
  }
};

/* --------------------------------------------------
   Cloudinary Usage
-------------------------------------------------- */

export const getCloudinaryStorageUsage = async () => {
  try {
    return await cloudinary.api.usage();
  } catch {
    throw new CustomError(500, "Failed to fetch storage usage");
  }
};
