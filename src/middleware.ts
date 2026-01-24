import { auth } from "@/lib/auth";

export default auth;

// Force Node.js runtime (Edge Runtime não suporta node:stream/net)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: 'nodejs',
};
