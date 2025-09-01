import type { NextRequest, NextResponse } from "next/server";

// In-memory rate limiting store (for serverless, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware
export function rateLimit(
  request: NextRequest,
  maxRequests = 5,
  windowMs = 15 * 60 * 1000,
) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  const current = rateLimitStore.get(ip);

  if (!current) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (now > current.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetTime - now) / 1000),
    };
  }

  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

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
  type: "registration" | "email_trigger" | "rate_limit" | "auth_failure",
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
