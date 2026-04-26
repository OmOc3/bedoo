import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/better-auth";

export const runtime = "nodejs";

export const { DELETE, GET, PATCH, POST, PUT } = toNextJsHandler(auth);
