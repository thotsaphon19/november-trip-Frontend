/** Uploads a single image file to the backend and returns its public URL.
 *  Uses fetch directly (not the shared axios instance) so the browser can
 *  set the multipart/form-data boundary itself. */
export async function uploadImage(file) {
  const token = localStorage.getItem("nt_token");
  const formData = new FormData();
  formData.append("file", file);

  const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
  const res = await fetch(`${baseURL}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Upload failed");
  }
  return data; // { url, filename, size, mimetype }
}
