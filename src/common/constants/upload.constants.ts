export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_MB = 10;

export const UPLOAD_FILE_SIZE_LIMITS = {
  fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
} as const;

export const IMAGE_TOO_LARGE_MESSAGE = `Photo is too large. Please choose a smaller image (under ${MAX_UPLOAD_FILE_SIZE_MB} MB).`;
