import type { NextRequest, NextResponse } from "next/server";



// API key authentication middleware
export function validateApiKey(request: NextRequest): boolean {
  const apiKey =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  const validApiKey = process.env.API_KEY;

  // If no API key is configured, allow access (for development)
  if (!validApiKey) {
    console.warn("No API key configured - allowing access");
    return true;
  }

  return apiKey === validApiKey;
}

// Security headers
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
}

// Honeypot validation (for bot detection)
export function validateHoneypot(body: Record<string, unknown>): boolean {
  // Check for common honeypot fields that should be empty
  const honeypotFields = ["website", "url", "phone", "fax"];

  for (const field of honeypotFields) {
    if (body[field] && typeof body[field] === 'string' && body[field].trim() !== "") {
      return false; // Bot detected
    }
  }

  return true;
}

// Request logging for security monitoring
export function logSecurityEvent(
  type: "registration" | "email_trigger" | "auth_failure",
  ip: string,
  details?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  console.log(
    `[SECURITY] ${timestamp} - ${type.toUpperCase()} - IP: ${ip}`,
    details || "",
  );

  // In production, you might want to send this to a monitoring service
  // like Datadog, New Relic, or store in a security log database
}
