import { z } from 'zod'

// Auth Validation
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  role: z.enum(['CONTRIBUTOR', 'TESTER', 'REVIEWER', 'ADMIN']),
})

export const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

// Profile Validation
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
})

// Submission Validation
export const submissionSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  domain: z
    .string()
    .min(2, 'Domain must be at least 2 characters')
    .max(50, 'Domain must be less than 50 characters'),
  language: z
    .string()
    .min(2, 'Language must be at least 2 characters')
    .max(50, 'Language must be less than 50 characters'),
})

// Review Validation
export const reviewSchema = z.object({
  feedback: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be less than 2000 characters'),
  markEligible: z.boolean(),
  accountPostedIn: z.string().max(200, 'Account info must be less than 200 characters').optional(),
})

// File Validation
export const fileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'text/plain',
  ],
  allowedExtensions: ['.pdf', '.zip', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt'],
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > fileValidation.maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${fileValidation.maxSize / 1024 / 1024}MB limit`,
    }
  }

  // Check if file size is 0
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  // Check file type
  if (!fileValidation.allowedTypes.includes(file.type)) {
    // If type check fails, also check extension as fallback
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!extension || !fileValidation.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File type not allowed. Accepted types: PDF, ZIP, DOC, DOCX, PNG, JPG, TXT`,
      }
    }
  }

  // Check filename
  const sanitizedName = sanitizeFilename(file.name)
  if (sanitizedName !== file.name) {
    return {
      valid: false,
      error: 'Filename contains invalid characters',
    }
  }

  // Check for potential path traversal
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename',
    }
  }

  return { valid: true }
}

// Sanitize filename
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '')

  // Remove directory separators
  sanitized = sanitized.replace(/[\/\\]/g, '')

  // Remove special characters except dots, dashes, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.split('.').pop()
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
    sanitized = nameWithoutExt.substring(0, 250) + '.' + extension
  }

  return sanitized
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Validate and sanitize search query
export function sanitizeSearchQuery(query: string): string {
  // Remove potentially dangerous SQL/NoSQL injection attempts
  let sanitized = query.trim()

  // Remove special characters that could be used in injection
  sanitized = sanitized.replace(/[;'"\\${}]/g, '')

  // Limit length
  sanitized = sanitized.substring(0, 100)

  return sanitized
}

// Rate limiting helper (frontend)
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map()

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = this.timestamps.get(key) || []

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs)

    if (validTimestamps.length >= maxRequests) {
      return false
    }

    validTimestamps.push(now)
    this.timestamps.set(key, validTimestamps)
    return true
  }

  reset(key: string): void {
    this.timestamps.delete(key)
  }
}

// Export types
export type SignupInput = z.infer<typeof signupSchema>
export type SigninInput = z.infer<typeof signinSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type SubmissionInput = z.infer<typeof submissionSchema>
export type ReviewInput = z.infer<typeof reviewSchema>
