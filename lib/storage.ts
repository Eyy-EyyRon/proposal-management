// Firebase Storage utility for file uploads
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

export async function uploadFile(
  file: File,
  storagePath: string
): Promise<UploadResult> {
  const fileRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(fileRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path: snapshot.ref.fullPath, fileName: file.name };
}

// Upload a .docx template file
// Path: /templates/{userId}/{templateId}/{filename}
export async function uploadTemplateFile(
  userId: string,
  templateId: string,
  file: File
): Promise<UploadResult> {
  const path = `templates/${userId}/${templateId}/${file.name}`;
  return uploadFile(file, path);
}

// Upload a drawn e-signature (data URL → blob → upload)
export async function uploadSignature(
  dataUrl: string,
  proposalId: string
): Promise<UploadResult> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `signature-${proposalId}.png`, { type: "image/png" });
  const path = `signatures/${proposalId}/signature.png`;
  return uploadFile(file, path);
}

// Upload a signature image file
export async function uploadSignatureImage(
  file: File,
  proposalId: string
): Promise<UploadResult> {
  const path = `signatures/${proposalId}/${file.name}`;
  return uploadFile(file, path);
}

// Upload user avatar
// Path: /avatars/{userId}/{filename}
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Get file extension
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `avatars/${userId}/avatar.${ext}`;
  return uploadFile(file, path);
}
