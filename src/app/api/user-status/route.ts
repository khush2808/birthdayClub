import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { otpUtils } from "@/lib/validation";
import {
  addSecurityHeaders,
  logSecurityEvent,
} from "@/lib/security";
import { z } from "zod";

const userStatusSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .trim()
    .toLowerCase(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Connect to database
    await dbConnect();

    const body = await request.json();

    // Validate input
    const validatedData = userStatusSchema.parse(body);

    // Find user by email
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      const response = NextResponse.json(
        { 
          exists: false,
          message: "User not found" 
        },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    }

    // Check OTP expiration if user is not authenticated
    let otpExpired = false;
    if (!user.authenticated && user.otpExpiresAt) {
      otpExpired = otpUtils.isExpired(user.otpExpiresAt);
    }

    const response = NextResponse.json(
      {
        exists: true,
        authenticated: user.authenticated,
        hasOtp: Boolean(user.otp),
        otpExpired: otpExpired,
        needsVerification: !user.authenticated,
        canResendOtp: !user.authenticated && (otpExpired || !user.otp),
        message: user.authenticated 
          ? "User is verified and active"
          : user.otp 
            ? otpExpired 
              ? "Verification code expired. Please request a new one."
              : "Verification code sent. Please check your email."
            : "User needs to register to receive verification code",
      },
      { status: 200 },
    );

    return addSecurityHeaders(response);
  } catch (error) {
    console.error("User status check error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response = NextResponse.json(
        {
          error: "Invalid input data",
          details: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    const response = NextResponse.json(
      { error: "Failed to check user status. Please try again." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}