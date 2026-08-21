import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ---------------Live Firebase Storage---------------------------
// import { storage } from "@/config/firebase_live";
// ---------------Test Firebase Storage---------------------------
import { storage } from "@/config/firebase_test"; // Use this for testing with your own Firebase project
import toast from "react-hot-toast";

/**
 * Upload an image to Firebase Storage
 * @param {File|Blob} imageFile - The image file to upload
 * @param {string} folder - The folder path in storage (e.g., 'allocations', 'rooms')
 * @param {string} fileName - Optional custom filename, if not provided, a timestamp will be used
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export const uploadImage = async (
  imageFile,
  folder = "images",
  fileName = null,
) => {
  try {
    console.log("Starting upload:", { imageFile, folder, fileName });
    // Generate a unique filename if not provided
    const timestamp = Date.now();
    const extension = imageFile.type.split("/")[1] || "jpg";
    const finalFileName = fileName || `${timestamp}.${extension}`;

    console.log("Final filename:", finalFileName);

    // Create a reference to the file location
    const storageRef = ref(storage, `${folder}/${finalFileName}`);
    console.log("Storage ref created:", storageRef);

    // Upload the file
    console.log("Uploading file...");
    const snapshot = await uploadBytes(storageRef, imageFile);
    console.log("Upload completed:", snapshot);

    // Get the download URL
    console.log("Getting download URL...");
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Download URL obtained:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    toast.error("Failed to upload image. Please try again.");
    throw error;
  }
};

/**
 * Delete an image from Firebase Storage
 * @param {string} imageUrl - The download URL of the image to delete
 * @returns {Promise<void>}
 */
export const deleteImage = async (imageUrl) => {
  try {
    // Extract the path from the URL
    const url = new URL(imageUrl);
    const path = decodeURIComponent(url.pathname.split("/o/")[1].split("?")[0]);

    // Create a reference to the file
    const storageRef = ref(storage, path);

    // Delete the file
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
    toast.error("Failed to delete image. Please try again.");
    throw error;
  }
};

/**
 * Convert base64 data URL to Blob
 * @param {string} dataUrl - The base64 data URL
 * @returns {Blob} - The converted Blob
 */
export const dataURLToBlob = (dataUrl) => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};
