import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import {
  validateApiKey,
  addSecurityHeaders,
  logSecurityEvent,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Validate API key for this maintenance operation
    if (!validateApiKey(request)) {
      logSecurityEvent("auth_failure", ip, {
        endpoint: "cleanup-expired-otps",
        method: "POST",
      });

      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

      return addSecurityHeaders(response);
    }

    // Connect to database
    await dbConnect();

    const now = new Date();

    // Find users with expired OTPs
    const usersWithExpiredOTPs = await User.find({
      authenticated: false,
      otp: { $exists: true, $ne: null },
      otpExpiresAt: { $lt: now }
    });

    if (usersWithExpiredOTPs.length === 0) {
      logSecurityEvent("user_cleanup", ip, {
        success: true,
        action: "cleanup_expired_otps",
        cleanedCount: 0,
        reason: "no_expired_otps",
      });

      const response = NextResponse.json(
        { 
          message: "No expired OTPs found to cleanup",
          cleanedCount: 0
        },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    }

    // Clear expired OTPs
    const updateResult = await User.updateMany(
      {
        authenticated: false,
        otp: { $exists: true, $ne: null },
        otpExpiresAt: { $lt: now }
      },
      {
        $unset: {
          otp: "",
          otpExpiresAt: ""
        }
      }
    );

    logSecurityEvent("user_cleanup", ip, {
      success: true,
      action: "cleanup_expired_otps",
      foundExpired: usersWithExpiredOTPs.length,
      cleanedCount: updateResult.modifiedCount,
    });

    const response = NextResponse.json({
      message: "Expired OTPs cleanup completed successfully",
      foundExpiredOTPs: usersWithExpiredOTPs.length,
      cleanedCount: updateResult.modifiedCount,
      summary: `Cleaned up ${updateResult.modifiedCount} expired OTPs`,
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error("Cleanup expired OTPs error:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes("authentication failed") ||
        error.message.includes("bad auth") ||
        error.message.includes("MongoServerError")
      ) {
        logSecurityEvent("user_cleanup", ip, {
          error: "db_connection_failed",
          action: "cleanup_expired_otps",
          errorMessage: error.message,
        });

        const response = NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 },
        );

        return addSecurityHeaders(response);
      }
    }

    logSecurityEvent("user_cleanup", ip, {
      error: error instanceof Error ? error.message : "unknown",
      action: "cleanup_expired_otps",
    });

    const response = NextResponse.json(
      { error: "OTP cleanup failed. Please try again later." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}

// GET endpoint for monitoring expired OTPs
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Validate API key for debugging access
    if (!validateApiKey(request)) {
      logSecurityEvent("auth_failure", ip, {
        endpoint: "cleanup-expired-otps",
        method: "GET",
      });

      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

      return addSecurityHeaders(response);
    }

    // Connect to database
    await dbConnect();

    const now = new Date();

    // Count expired OTPs
    const expiredOTPsCount = await User.countDocuments({
      authenticated: false,
      otp: { $exists: true, $ne: null },
      otpExpiresAt: { $lt: now }
    });

    // Count active OTPs
    const activeOTPsCount = await User.countDocuments({
      authenticated: false,
      otp: { $exists: true, $ne: null },
      otpExpiresAt: { $gte: now }
    });

    // Count users without OTPs
    const noOTPsCount = await User.countDocuments({
      authenticated: false,
      $or: [
        { otp: { $exists: false } },
        { otp: null },
        { otp: "" }
      ]
    });

    const response = NextResponse.json({
      expiredOTPs: expiredOTPsCount,
      activeOTPs: activeOTPsCount,
      unauthenticatedWithoutOTP: noOTPsCount,
      totalUnauthenticated: expiredOTPsCount + activeOTPsCount + noOTPsCount,
      message: expiredOTPsCount > 0 
        ? `${expiredOTPsCount} expired OTPs ready for cleanup`
        : "No expired OTPs found",
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error("Error checking expired OTPs:", error);

    const response = NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}