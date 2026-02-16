import { z } from 'zod';

export const EmailIREmailDataSchema = z
  .object({
    // Top-level result from API (e.g., "Simulation", "Malicious", "Clean")
    result: z.string().optional(),

    // Core Identifiers
    htmlBody: z.string().optional(),
    from: z.string(),
    subject: z.string(),
    folderName: z.string().optional(),
    senderName: z.string().optional(),
    senderIp: z.string().optional(),
    geoLocation: z.string().optional(),

    // Recipients
    to: z.array(z.string()).optional(),
    cc: z.array(z.string()).optional(),
    bcc: z.array(z.string()).optional(),

    // Analysis Data
    urls: z
      .array(
        z.object({
          resourceId: z.string().optional(),
          url: z.string(),
          result: z.string().optional(),
          analysisList: z.array(z.any()).optional(), // Keeping flexible for now
        })
      )
      .optional(),

    attachments: z
      .array(
        z.object({
          resourceId: z.string().optional(),
          name: z.string(),
          sha512: z.string().optional(),
          md5: z.string().optional(),
          contentType: z.string().optional(),
          result: z.string().optional(),
          analysisList: z.array(z.any()).optional(),
        })
      )
      .optional(),

    ips: z
      .array(
        z.object({
          resourceId: z.string().optional(),
          ip: z.string(),
          result: z.string().optional(),
          analysisList: z.array(z.any()).optional(),
        })
      )
      .optional(),

    // Metadata
    headers: z
      .array(
        z.object({
          key: z.string(),
          value: z.string(),
        })
      )
      .optional(),

    analysisDate: z.string().optional(),
    receivedDate: z.string().optional(),
  })
  .passthrough(); // Allow extra fields

export type EmailIREmailData = z.infer<typeof EmailIREmailDataSchema>;
