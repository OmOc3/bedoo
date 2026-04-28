import { NextResponse } from "next/server";
import { uploadProfileImageToCloudinary } from "@/lib/cloudinary/profile-images";
import { auth } from "@/lib/auth/better-auth";
import { headers } from "next/headers";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    let uid = formData.get("uid") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!uid) {
      uid = session.user.id;
    }

    // Only allow admin to upload images for other users
    if (uid !== session.user.id && session.user.role !== "manager" && session.user.role !== "supervisor") {
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
