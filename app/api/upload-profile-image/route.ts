import { NextResponse } from "next/server";
import { uploadProfileImageToCloudinary } from "@/lib/cloudinary/profile-images";
import { getCurrentSession } from "@/lib/auth/server-session";
import { AppError } from "@/lib/errors";

function getUploadedImageFile(value: FormDataEntryValue | null): File | null {
  return typeof File !== "undefined" && value instanceof File && value.size > 0 ? value : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = getUploadedImageFile(formData.get("image"));
    const requestedUid = formData.get("uid");
    const requestedUidValue = typeof requestedUid === "string" ? requestedUid.trim() : "";
    const uid = requestedUidValue.length > 0 ? requestedUidValue : session.uid;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Only allow admin to upload images for other users
    if (uid !== session.uid && session.role !== "manager" && session.role !== "supervisor") {
      return NextResponse.json({ error: "Unauthorized to upload image for other user" }, { status: 403 });
    }

    const imageUrl = await uploadProfileImageToCloudinary(file, uid);

    return NextResponse.json({ url: imageUrl });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء رفع الصورة." }, { status: 500 });
  }
}
