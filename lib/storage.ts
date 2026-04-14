// Firebase Storage utility for file uploads
// TODO: Replace with actual Firebase config once Blaze plan is enabled

interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

export async function uploadFile(
  file: File,
  folder: string
): Promise<UploadResult> {
  // TODO: Implement with Firebase Storage
  // import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
  //
  // const storage = getStorage();
  // const fileRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
  // const snapshot = await uploadBytes(fileRef, file);
  // const url = await getDownloadURL(snapshot.ref);
  // return { url, path: snapshot.ref.fullPath, fileName: file.name };

  // Mock implementation for development
  console.log(`[Mock] Uploading ${file.name} to ${folder}/`);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    url: URL.createObjectURL(file),
    path: `${folder}/${Date.now()}-${file.name}`,
    fileName: file.name,
  };
}

export async function uploadSignature(
  dataUrl: string,
  proposalId: string
): Promise<UploadResult> {
  // TODO: Implement with Firebase Storage
  // Convert dataUrl to blob, then upload
  //
  // const response = await fetch(dataUrl);
  // const blob = await response.blob();
  // const file = new File([blob], `signature-${proposalId}.png`, { type: "image/png" });
  // return uploadFile(file, `signatures/${proposalId}`);

  console.log(`[Mock] Uploading signature for proposal ${proposalId}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    url: dataUrl,
    path: `signatures/${proposalId}/signature.png`,
    fileName: "signature.png",
  };
}

export async function uploadTemplate(file: File): Promise<UploadResult> {
  return uploadFile(file, "templates");
}

export async function uploadSignatureImage(
  file: File,
  proposalId: string
): Promise<UploadResult> {
  return uploadFile(file, `signatures/${proposalId}`);
}
