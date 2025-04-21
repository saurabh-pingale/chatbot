import { API } from "app/constants/api.constants";

export async function uploadToCloudinary(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", API.UPLOAD_PRESET);

  try {
    const response = await fetch(API.CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data.secure_url || null;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return null;
  }
}
