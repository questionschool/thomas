const endpoint = "https://semester-teaching-checkin.yesandthomas.chatgpt.site/api/checkins";
export function requestCheckin(options: RequestInit) {
  const storageKey = "chech-in:device";
  let device = localStorage.getItem(storageKey);
  if (!device) {
    device = crypto.randomUUID();
    localStorage.setItem(storageKey, device);
  }
  const headers = new Headers(options.headers);
  headers.set("X-Checkin-Device", device);
  return fetch(endpoint, { ...options, headers, credentials: "omit" });
}
