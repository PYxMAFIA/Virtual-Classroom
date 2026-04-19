const fs = require('fs');
const path = require('path');
const ImageKit = require('@imagekit/nodejs');
const { toFile } = require('@imagekit/nodejs');

const IMAGEKIT_REQUIRED_ENV = [
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'IMAGEKIT_URL_ENDPOINT',
];

const getMissingImageKitEnv = () =>
  IMAGEKIT_REQUIRED_ENV.filter((key) => !process.env[key] || !String(process.env[key]).trim());

const isImageKitConfigured = () => getMissingImageKitEnv().length === 0;

const getImageKitClient = () => {
  const missingKeys = getMissingImageKitEnv();
  if (missingKeys.length > 0) {
    throw new Error(`ImageKit not configured. Missing env vars: ${missingKeys.join(', ')}`);
  }

  return new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
};

const normalizeUploadBuffer = (file) => {
  if (!file) {
    throw new Error('No file provided for ImageKit upload');
  }

  if (file.buffer !== undefined) {
    const normalizedBuffer = Buffer.isBuffer(file.buffer)
      ? file.buffer
      : Buffer.from(file.buffer);
    if (!normalizedBuffer || normalizedBuffer.length === 0) {
      throw new Error('Uploaded file buffer is empty');
    }
    return normalizedBuffer;
  }

  if (file.path) {
    const normalizedPath = path.resolve(file.path);
    if (!fs.existsSync(normalizedPath)) {
      throw new Error('Uploaded file path does not exist');
    }
    const fileBuffer = fs.readFileSync(normalizedPath);
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Uploaded file is empty');
    }
    return fileBuffer;
  }

  throw new Error('File has neither buffer nor path');
};

const sanitizeFileName = (fileName) => {
  const fallbackName = `upload-${Date.now()}`;
  if (!fileName || typeof fileName !== 'string') {
    return fallbackName;
  }
  const trimmed = fileName.trim();
  if (!trimmed) return fallbackName;
  return trimmed.replace(/[^\w.\-]/g, '_');
};

const uploadToImageKit = async (file, folder = 'virtual-classroom') => {
  const imagekit = getImageKitClient();
  const uploadBuffer = normalizeUploadBuffer(file);
  const fileName = sanitizeFileName(file?.originalname);
  const normalizedFolder = String(folder || 'virtual-classroom').trim() || 'virtual-classroom';
  const uploadableFile = await toFile(uploadBuffer, fileName, {
    type: typeof file?.mimetype === 'string' && file.mimetype.trim() ? file.mimetype : undefined,
  });

  console.log('[imagekit] Upload request received', {
    folder: normalizedFolder,
    originalname: file?.originalname || null,
    mimetype: file?.mimetype || null,
    size: file?.size || uploadBuffer.length,
  });

  const result = await imagekit.files.upload({
    file: uploadableFile,
    fileName,
    folder: `/${normalizedFolder}`,
    useUniqueFileName: true,
  });

  if (!result?.url || !result?.fileId) {
    throw new Error('Invalid ImageKit upload response');
  }

  console.log('[imagekit] Upload success', {
    fileId: result.fileId,
    url: result.url,
  });

  return {
    url: result.url,
    fileId: result.fileId,
    name: result.name,
  };
};

const deleteFromImageKit = async (fileId) => {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('ImageKit fileId is required for deletion');
  }

  const imagekit = getImageKitClient();
  await imagekit.files.delete(fileId);
};

module.exports = {
  uploadToImageKit,
  deleteFromImageKit,
  isImageKitConfigured,
};
