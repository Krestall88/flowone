/**
 * Server-side Audit Mode checker
 * Prevents data modifications when audit session is active
 * This is a critical security feature - must be enforced at database level
 */

import { prisma } from './prisma';

export interface AuditModeStatus {
  isActive: boolean;
  sessionId?: number;
  auditType?: string;
  auditorName?: string;
  startedAt?: Date;
}

/**
 * Check if audit mode is currently active
 * This should be called before any write operations
 */
export async function isAuditModeActive(): Promise<AuditModeStatus> {
  try {
    const activeSession = await prisma.auditSession.findFirst({
      where: {
        status: 'active',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (activeSession) {
      return {
        isActive: true,
        sessionId: activeSession.id,
        auditType: activeSession.auditType,
        auditorName: activeSession.auditorName || undefined,
        startedAt: activeSession.startedAt,
      };
    }

    return { isActive: false };
  } catch (error) {
    console.error('[AuditMode] Error checking audit mode status:', error);
    // Fail-safe: if we can't check, assume audit mode is active
    return { isActive: true };
  }
}

/**
 * Throw error if audit mode is active
 * Use this in API routes before write operations
 */
export async function blockIfAuditMode(operation: string): Promise<void> {
  const status = await isAuditModeActive();
  
  if (status.isActive) {
    throw new AuditModeError(
      `Операция "${operation}" заблокирована: активен режим проверки (${status.auditType})`,
      status
    );
  }
}

/**
 * Custom error for audit mode violations
 */
export class AuditModeError extends Error {
  public readonly status: AuditModeStatus;
  public readonly httpCode = 403;

  constructor(message: string, status: AuditModeStatus) {
    super(message);
    this.name = 'AuditModeError';
    this.status = status;
  }
}

/**
 * Middleware wrapper for API routes
 * Usage: export const POST = withAuditModeCheck(async (req) => { ... })
 */
export function withAuditModeCheck(
  handler: (req: Request, context?: any) => Promise<Response>,
  allowedMethods: string[] = ['GET', 'HEAD', 'OPTIONS']
) {
  return async (req: Request, context?: any): Promise<Response> => {
    // Allow read-only operations
    if (allowedMethods.includes(req.method)) {
      return handler(req, context);
    }

    // Check audit mode for write operations
    try {
      await blockIfAuditMode(req.method);
      return handler(req, context);
    } catch (error) {
      if (error instanceof AuditModeError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            auditMode: error.status,
            code: 'AUDIT_MODE_ACTIVE',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      throw error;
    }
  };
}

/**
 * Get current audit session details
 */
export async function getCurrentAuditSession() {
  return prisma.auditSession.findFirst({
    where: {
      status: 'active',
    },
    orderBy: {
      startedAt: 'desc',
    },
  });
}
