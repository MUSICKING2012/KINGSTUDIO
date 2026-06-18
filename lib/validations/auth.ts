import { z } from 'zod';

// PRD §5.10: password min 10, letters + digits.
export const passwordSchema = z
  .string()
  .min(10, 'password.min')
  .regex(/[A-Za-z]/, 'password.letter')
  .regex(/[0-9]/, 'password.digit');

export const signupSchema = z.object({
  email: z.string().email('email.invalid').transform((s) => s.toLowerCase().trim()),
  password: passwordSchema,
  name: z.string().min(1, 'name.required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
