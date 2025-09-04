import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { registerSchema, sanitizeInput } from "@/lib/validation";
import {
  addSecurityHeaders,
  validateHoneypot,
  logSecurityEvent,
} from "@/lib/security";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Connect to database with retry logic
    await dbConnect();

    const body = await request.json();

    // Validate honeypot fields for bot detection
    if (!validateHoneypot(body)) {
      logSecurityEvent("registration", ip, {
        reason: "bot_detected",
        body: Object.keys(body),
      });

      // Return success to avoid revealing bot detection
      const response = NextResponse.json(
        { message: "Registration submitted successfully" },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    }

    // Validate and sanitize input
    const validatedData = registerSchema.parse(body);

    // Additional sanitization
    const sanitizedData = {
      name: sanitizeInput.name(validatedData.name),
      email: sanitizeInput.email(validatedData.email),
      dateOfBirth: new Date(validatedData.dateOfBirth),
    };

    // Check for existing user
    const existingUser = await User.findOne({ email: sanitizedData.email });
    if (existingUser) {
      logSecurityEvent("registration", ip, {
        reason: "duplicate_email",
        email: sanitizedData.email,
      });

      const response = NextResponse.json(
        { error: "Email already registered" },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    // Create new user
    const user = new User(sanitizedData);
    await user.save();

    logSecurityEvent("registration", ip, { success: true, userId: user._id });

    const response = NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user._id,
          name: sanitizedData.name,
          email: sanitizedData.email,
        },
      },
      { status: 201 },
    );

    return addSecurityHeaders(response);
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      logSecurityEvent("registration", ip, {
        reason: "validation_error",
        errors: error.issues,
      });

      const response = NextResponse.json(
        {
          error: "Invalid input data",
          details: error.issues.map((err: any) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      );

      return addSecurityHeaders(response);
    }

    console.error("Registration error:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes("authentication failed") ||
        error.message.includes("bad auth") ||
        error.message.includes("MongoServerError")
      ) {
        logSecurityEvent("registration", ip, {
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

    logSecurityEvent("registration", ip, {
      reason: "unknown_error",
      error: error instanceof Error ? error.message : "Unknown",
    });

    const response = NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}
