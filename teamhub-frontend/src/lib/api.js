export async function apiFetch(path, options = {}) {
  const url = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg = data?.error || data?.detail || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}
