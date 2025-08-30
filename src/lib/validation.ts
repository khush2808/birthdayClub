import validator from "validator";
import { z } from "zod";

// User registration validation schema
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim()
    .refine((val) => validator.isLength(val, { min: 1, max: 100 }), {
      message: "Name must be between 1 and 100 characters",
    })
    .refine((val) => !validator.contains(val, "<script"), {
      message: "Name contains invalid characters",
    }),

  email: z
    .string()
    .email("Invalid email format")
    .max(254, "Email must be less than 254 characters")
    .trim()
    .toLowerCase()
    .refine((val) => validator.isEmail(val), {
      message: "Invalid email format",
    })
    .refine((val) => !validator.contains(val, "<script"), {
      message: "Email contains invalid characters",
    }),

  dateOfBirth: z
    .string()
    .refine((val) => validator.isDate(val), {
      message: "Invalid date format",
    })
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 120, 0, 1); // 120 years ago
        const maxDate = new Date(now.getFullYear() - 5, 0, 1); // 5 years ago
        return date >= minDate && date <= maxDate;
      },
      {
        message: "Date of birth must be between 5 and 120 years ago",
      },
    ),
});

export type RegisterData = z.infer<typeof registerSchema>;

// API key validation
export const apiKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

// Sanitization utility functions
export const sanitizeInput = {
  name: (input: string): string => {
    return validator.escape(validator.trim(input));
  },

  email: (input: string): string => {
    return validator.normalizeEmail(validator.trim(input)) || input;
  },

  general: (input: string): string => {
    return validator.escape(validator.trim(input));
  },
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too many registration attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
};
