const STORAGE_KEY = "agritrace-inspector-queue-codes";
const BATCH_CODE_PATTERN = /^BATCH-[A-Z0-9-]+$/;
const LEGACY_FAKE_CODE_PATTERN = /^BATCH-\d{8}-FAKE\d+$/;

function normalize(code) {
  return String(code ?? "").trim().toUpperCase();
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(codes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function isSupportedCode(code) {
  const normalized = normalize(code);
  return Boolean(normalized) && BATCH_CODE_PATTERN.test(normalized);
}

function sanitizeCodes(codes) {
  const normalized = (Array.isArray(codes) ? codes : [])
    .map(normalize)
    .filter((code) => isSupportedCode(code) && !LEGACY_FAKE_CODE_PATTERN.test(code));

  return Array.from(new Set(normalized));
}

function getSanitizedCodes() {
  const raw = read();
  const sanitized = sanitizeCodes(raw);
  if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
    write(sanitized);
  }
  return sanitized;
}

export const inspectorQueueService = {
  getCodes() {
    return getSanitizedCodes();
  },

  isSupportedCode,

  sanitizeStoredCodes() {
    return getSanitizedCodes();
  },

  addCode(batchCode) {
    const normalized = normalize(batchCode);
    if (!isSupportedCode(normalized)) {
      return getSanitizedCodes();
    }

    const existing = getSanitizedCodes();
    if (existing.includes(normalized)) {
      return existing;
    }

    const next = [normalized, ...existing];
    write(next);
    return next;
  },

  removeCode(batchCode) {
    const normalized = normalize(batchCode);
    const next = getSanitizedCodes().filter((item) => item !== normalized);
    write(next);
    return next;
  },

  replaceAll(codes) {
    const sanitized = sanitizeCodes(codes);
    write(sanitized);
    return sanitized;
  },
};
