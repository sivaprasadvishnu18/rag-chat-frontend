import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, session_id } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    console.log("Forwarding request to backend URL:", `${process.env.NEXT_PUBLIC_BACKEND_URL}`); 
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`;
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // forward exactly what FastAPI expects
      body: JSON.stringify({ message, session_id }),
      // Let Next.js server call your backend directly
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Upstream ${res.status}: ${text}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
