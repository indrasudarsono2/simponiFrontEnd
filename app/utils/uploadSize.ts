// Keep these existing per-file limits aligned with server/lib/multer.js.
export function uploadLimitBytes(url: string): number | null {
  const path = new URL(url, 'http://local.invalid').pathname.replace(/^\/(?:backend\/)?api\//, '/');
  if (/^\/logbookUser(?:\/|$)/.test(path)) return 4 * 1024 * 1024;
  if (/^\/(preview|briefings)(?:\/|$)/.test(path)) return 5 * 1024 * 1024;
  if (/^\/(licenseUser|ielpUser|medexUser|competenceUser|mats\/questions|essays|multipleChoices|multipleChoice|events|room|practicalExam)(?:\/|$)/.test(path)) return 2 * 1024 * 1024;
  return null;
}

export function validateUploadSize(url: string, body: unknown): void {
  const limit = uploadLimitBytes(url);
  if (!limit || !(body instanceof FormData)) return;
  for (const value of body.values()) {
    if (typeof value === 'string' || value.size <= limit) continue;
    const message = `File is too large. Maximum file size is ${limit / (1024 * 1024)} MB per file. Please choose a smaller file.`;
    throw Object.assign(new Error(message), { statusCode: 413, data: { code: 'LIMIT_FILE_SIZE', message, statusMessage: message, maxFileSize: limit } });
  }
}
