import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { otpVerificationSchema, otpUtils } from "@/lib/validation";
import {
  addSecurityHeaders,
  logSecurityEvent,
} from "@/lib/security";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Connect to database with retry logic
    await dbConnect();

    const body = await request.json();

    // Validate and sanitize input
    const validatedData = otpVerificationSchema.parse(body);

    // Find user by email
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      logSecurityEvent("otp_verification", ip, {
        reason: "user_not_found",
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
        reason: "already_authenticated",
        email: validatedData.email,
        userId: user._id,
      });

      const response = NextResponse.json(
        { error: "User is already verified" },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    // Check if OTP exists
    if (!user.otp || !user.otpExpiresAt) {
      logSecurityEvent("otp_verification", ip, {
        reason: "no_otp_found",
        email: validatedData.email,
        userId: user._id,
      });

      const response = NextResponse.json(
        { error: "No verification code found. Please register again." },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    // Check if OTP has expired
    if (otpUtils.isExpired(user.otpExpiresAt)) {
      logSecurityEvent("otp_verification", ip, {
        reason: "otp_expired",
        email: validatedData.email,
        userId: user._id,
      });

      // Clear expired OTP
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      const response = NextResponse.json(
        { error: "Verification code has expired. Please register again." },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    // Verify OTP
    if (user.otp !== validatedData.otp) {
      logSecurityEvent("otp_verification", ip, {
        reason: "invalid_otp",
        email: validatedData.email,
        userId: user._id,
      });

      const response = NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    // OTP is valid - authenticate user
    user.authenticated = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    logSecurityEvent("otp_verification", ip, {
      success: true,
      email: validatedData.email,
      userId: user._id,
    });

    const response = NextResponse.json(
      {
        message: "Email verified successfully. Welcome to Birthday Club!",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          authenticated: true,
        },
      },
      { status: 200 },
    );

    return addSecurityHeaders(response);
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      logSecurityEvent("otp_verification", ip, {
        reason: "validation_error",
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

    console.error("OTP verification error:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes("authentication failed") ||
        error.message.includes("bad auth") ||
        error.message.includes("MongoServerError")
      ) {
        logSecurityEvent("otp_verification", ip, {
          reason: "db_error",
          error: error.message,
        });

        const response = NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 },
        );

        return addSecurityHeaders(response);
      }
    }

    logSecurityEvent("otp_verification", ip, {
      reason: "unknown_error",
      error: error instanceof Error ? error.message : "Unknown",
    });

    const response = NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}