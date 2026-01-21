export function logInfo(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] ${timestamp} | ${message}`, data || '');
}

export function logWarn(message, data = null) {
  const timestamp = new Date().toISOString();
  console.warn(`[WARN] ${timestamp} | ${message}`, data || '');
}

export function logError(message, data = null) {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] ${timestamp} | ${message}`, data || '');
}
