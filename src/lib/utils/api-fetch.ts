export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`サーバー応答エラー (${res.status})`);
  }

  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err.error ?? `エラー (${res.status})`);
  }

  return data as T;
}
