import { NextResponse } from "next/server";

const AUTH_COOKIE = "taxi_access";
const MAX_AGE = 60 * 60 * 24 * 90;

export async function POST(request: Request) {
  const pin = process.env.ACCESS_PIN;
  if (!pin) {
    return NextResponse.json({ ok: true });
  }

  let body: { pin?: string };
  try {
    body = (await request.json()) as { pin?: string };
  } catch {
    return NextResponse.json({ error: "PINを入力してください" }, { status: 400 });
  }
  if (!body.pin || body.pin !== pin) {
    return NextResponse.json({ error: "PINが正しくありません" }, { status: 401 });
  }

  const proto = request.headers.get("x-forwarded-proto");
  const isHttps = proto === "https" || request.url.startsWith("https://");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, pin, {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
