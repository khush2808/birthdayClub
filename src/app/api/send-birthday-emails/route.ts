import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendBirthdayEmails } from "@/lib/email";
import {
  validateApiKey,
  addSecurityHeaders,
  logSecurityEvent,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Validate API key for email sending (sensitive operation)
    if (!validateApiKey(request)) {
      logSecurityEvent("auth_failure", ip, {
        endpoint: "send-birthday-emails",
        method: "POST",
      });

      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

      return addSecurityHeaders(response);
    }

    // Connect to database with retry logic
    await dbConnect();

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfBirth" }, todayMonth] },
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, todayDate] },
        ],
      },
      authenticated: true, // Only find authenticated users
    });

    if (birthdayUsers.length === 0) {
      logSecurityEvent("email_trigger", ip, {
        success: true,
        reason: "no_birthdays",
      });

      const response = NextResponse.json(
        { message: "No birthdays today" },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    }

    const allUsers = await User.find({ authenticated: true }, "name email");

    if (allUsers.length < 2) {
      logSecurityEvent("email_trigger", ip, {
        success: true,
        reason: "insufficient_users",
      });

      const response = NextResponse.json(
        { message: "Not enough users to send birthday notifications" },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    }

    const emailPromises = birthdayUsers.map(async (birthdayUser) => {
      try {
        await sendBirthdayEmails(
          { name: birthdayUser.name, email: birthdayUser.email },
          allUsers.map((u) => ({ name: u.name, email: u.email })),
        );
        return { success: true, user: birthdayUser.name };
      } catch (error) {
        console.error(
          `Failed to send birthday emails for ${birthdayUser.name}:`,
          error,
        );
        return {
          success: false,
          user: birthdayUser.name,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    logSecurityEvent("email_trigger", ip, {
      success: true,
      totalBirthdays: birthdayUsers.length,
      successfulEmails: successCount,
      failedEmails: failedCount,
    });

    const response = NextResponse.json({
      message: `Birthday emails processed`,
      totalBirthdays: birthdayUsers.length,
      successfulEmails: successCount,
      failedEmails: failedCount,
      // Remove detailed results to avoid data exposure
      summary: `Processed ${birthdayUsers.length} birthday(s) with ${successCount} successful deliveries`,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error("Birthday email sending error:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes("authentication failed") ||
        error.message.includes("bad auth") ||
        error.message.includes("MongoServerError")
      ) {
        logSecurityEvent("email_trigger", ip, {
          error: "db_connection_failed",
        });

        const response = NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 },
        );

        return addSecurityHeaders(response);
      }
    }

    logSecurityEvent("email_trigger", ip, {
      error: error instanceof Error ? error.message : "unknown",
    });

    const response = NextResponse.json(
      { error: "Email sending failed. Please try again later." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}

// Secure GET endpoint - only returns aggregated data, no personal information
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Validate API key for debugging access
    if (!validateApiKey(request)) {
      logSecurityEvent("auth_failure", ip, {
        endpoint: "send-birthday-emails",
        method: "GET",
      });

      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

      return addSecurityHeaders(response);
    }

    // Connect to database with retry logic
    await dbConnect();

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfBirth" }, todayMonth] },
          { $eq: [{ $dayOfMonth: "$dateOfBirth" }, todayDate] },
        ],
      },
      authenticated: true, // Only find authenticated users
    });

    // Return only aggregated data - no personal information
    const response = NextResponse.json({
      todaysDate: today.toDateString(),
      birthdayCount: birthdayUsers.length,
      hasBirthdays: birthdayUsers.length > 0,
      // No user details exposed
      message:
        birthdayUsers.length > 0
          ? `${birthdayUsers.length} birthday(s) found for today`
          : "No birthdays today",
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error("Error checking birthdays:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes("authentication failed") ||
        error.message.includes("bad auth") ||
        error.message.includes("MongoServerError")
      ) {
        const response = NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 },
        );

        return addSecurityHeaders(response);
      }
    }

    const response = NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}
