import { z } from 'zod';
// PRD 5.8: admin password min 12. TOTP is a 6-digit code.
export const adminLoginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase().trim()),
  password: z.string().min(12),
  totp: z.string().regex(/^\d{6}$/),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
