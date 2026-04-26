import "server-only";

import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import type { ApiErrorResponse } from "@/types";

export function mobileApiErrorResponse(
  error: unknown,
  fallbackMessage = "تعذر إكمال الطلب. تحقق من الاتصال وحاول مرة أخرى.",
  fallbackCode = "MOBILE_API_ERROR",
): NextResponse<ApiErrorResponse> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      message: fallbackMessage,
      code: fallbackCode,
    },
    { status: 500 },
  );
}
