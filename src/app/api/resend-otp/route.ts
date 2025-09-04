import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { otpUtils } from "@/lib/validation";
import { sendWelcomeEmailWithOTP } from "@/lib/email";
import {
  addSecurityHeaders,
  logSecurityEvent,
} from "@/lib/security";
import { z } from "zod";

const resendOtpSchema = z.object({
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
    const validatedData = resendOtpSchema.parse(body);

    // Find user by email
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      logSecurityEvent("otp_verification", ip, {
        reason: "user_not_found_resend",
        email: validatedData.email,
      });

      const response = NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );

      return addSecurityHeaders(response);
    }

    // Check if user is already authenticated
    if (user.authenticated) {
      logSecurityEvent("otp_verification", ip, {
        reason: "already_authenticated_resend",
        email: validatedData.email,
        userId: user._id,
      });

      const response = NextResponse.json(
        { error: "User is already verified" },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    // Generate new OTP
    const newOtp = otpUtils.generate();
    const newOtpExpiresAt = otpUtils.getExpirationTime();

    // Update user with new OTP
    user.otp = newOtp;
    user.otpExpiresAt = newOtpExpiresAt;
    await user.save();

    // Send new OTP email
    try {
      await sendWelcomeEmailWithOTP(
        { name: user.name, email: user.email },
        newOtp,
      );

      logSecurityEvent("otp_verification", ip, {
        success: true,
        action: "otp_resent",
        email: validatedData.email,
        userId: user._id,
      });

      const response = NextResponse.json(
        {
          message: "New verification code sent to your email",
        },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    } catch (emailError) {
      logSecurityEvent("otp_verification", ip, {
        reason: "email_send_failed_resend",
        email: validatedData.email,
        userId: user._id,
        emailError: emailError instanceof Error ? emailError.message : "Unknown email error",
      });

      const response = NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 },
      );

      return addSecurityHeaders(response);
    }
  } catch (error) {
    console.error("Resend OTP error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      logSecurityEvent("otp_verification", ip, {
        reason: "validation_error_resend",
        errors: error.issues,
      });

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

    logSecurityEvent("otp_verification", ip, {
      reason: "unknown_error_resend",
      error: error instanceof Error ? error.message : "Unknown",
    });

    const response = NextResponse.json(
      { error: "Failed to resend verification code. Please try again." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}