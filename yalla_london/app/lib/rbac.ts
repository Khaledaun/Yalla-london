/**
 * Role-Based Access Control (RBAC) System
 * Comprehensive authorization and permission management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

/**
 * IMPORTANT: authOptions and prisma are loaded via dynamic import() inside
 * async functions below. Top-level imports caused a circular dependency
 * (rbac → auth → rbac) that crashed the [...nextauth] route handler.
 */

// Define role hierarchy and permissions
export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor', 
  REVIEWER: 'reviewer',
  VIEWER: 'viewer'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Define granular permissions
export const PERMISSIONS = {
  // Content management
  CREATE_CONTENT: 'create_content',
  EDIT_CONTENT: 'edit_content',
  DELETE_CONTENT: 'delete_content',
  PUBLISH_CONTENT: 'publish_content',
  REVIEW_CONTENT: 'review_content',
  APPROVE_CONTENT: 'approve_content',
  
  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // System administration
  MANAGE_SYSTEM: 'manage_system',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',
  
  // Audit and compliance
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_PERMISSIONS: 'manage_permissions',
  CONDUCT_AUDITS: 'conduct_audits',
  
  // Feature flags and configuration
  MANAGE_FEATURES: 'manage_features',
  VIEW_REPORTS: 'view_reports'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-to-permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.PUBLISH_CONTENT,
    PERMISSIONS.REVIEW_CONTENT,
    PERMISSIONS.APPROVE_CONTENT,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_PERMISSIONS,
    PERMISSIONS.CONDUCT_AUDITS,
    PERMISSIONS.MANAGE_FEATURES,
    PERMISSIONS.VIEW_REPORTS
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.PUBLISH_CONTENT,
    PERMISSIONS.REVIEW_CONTENT,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.CONDUCT_AUDITS,
    PERMISSIONS.VIEW_REPORTS
  ],
  [ROLES.REVIEWER]: [
    PERMISSIONS.REVIEW_CONTENT,
    PERMISSIONS.APPROVE_CONTENT,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.CONDUCT_AUDITS,
    PERMISSIONS.VIEW_REPORTS
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REPORTS
  ]
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  permissions: Permission[];
  isActive: boolean;
}

/**
 * Get user with role and permissions from database
 */
export async function getUserWithPermissions(email: string): Promise<AuthenticatedUser | null> {
  try {
    const { prisma } = await import('@/lib/db');
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    // Get base permissions from role
    const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];
    
    // Combine with additional permissions
    const allPermissions = [...new Set([...rolePermissions, ...user.permissions])];

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as Role,
      permissions: allPermissions as Permission[],
      isActive: user.isActive
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: any, permission: Permission): boolean {
  if (!user || !user.isActive || !user.role) return false;
  
  // Get permissions based on role only (prevents tampering with user.permissions array)
  const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];
  
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user: any, permissions: Permission[]): boolean {
  if (!user || !user.isActive || !user.role) return false;
  
  // Get permissions based on role only (prevents tampering with user.permissions array)
  const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];
  
  return permissions.some(permission => rolePermissions.includes(permission));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(user: any, permissions: Permission[]): boolean {
  if (!user || !user.isActive || !user.role) return false;
  
  // Get permissions based on role only (prevents tampering with user.permissions array)
  const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];
  
  return permissions.every(permission => rolePermissions.includes(permission));
}

/**
 * Enhanced authentication middleware with RBAC
 */
export async function requireAuth(request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const { authOptions } = await import('@/lib/auth');
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserWithPermissions(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Log authentication event
    await logAuditEvent({
      userId: user.id,
      action: 'access',
      resource: request.url,
      success: true,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return { user };
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Require specific permission middleware
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  const { user } = authResult;

  if (!hasPermission(user, permission)) {
    await logAuditEvent({
      userId: user.id,
      action: 'access_denied',
      resource: request.url,
      success: false,
      details: { required_permission: permission, user_permissions: user.permissions },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: `Permission required: ${permission}` },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Require any of the specified permissions
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  if (!hasAnyPermission(user, permissions)) {
    await logAuditEvent({
      userId: user.id,
      action: 'access_denied', 
      resource: request.url,
      success: false,
      details: { required_permissions: permissions, user_permissions: user.permissions },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: `One of these permissions required: ${permissions.join(', ')}` },
      { status: 403 }
    );
  }

  return { user };
}

/**
 * Require admin role (backward compatibility)
 */
export async function requireAdmin(request: NextRequest): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requirePermission(request, PERMISSIONS.MANAGE_SYSTEM);
}

/**
 * Wrapper function for permission-protected API routes
 */
export function withPermission(
  permission: Permission,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requirePermission(request, permission);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return handler(request, authResult.user);
  };
}

/**
 * Wrapper function for admin-only API routes (backward compatibility)
 */
export function withAdminAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withPermission(PERMISSIONS.MANAGE_SYSTEM, handler);
}

/**
 * Log audit events for compliance
 */
export async function logAuditEvent(event: any) {
  if (
    !event ||
    typeof event !== 'object' ||
    typeof event.action !== 'string' ||
    event.action.trim() === ''
  ) {
    console.error('Failed to log audit event: invalid or missing event object');
    return;
  }
  
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.auditLog.create({
      data: {
        userId: event.userId || null,
        action: event.action,
        resource: event.resource || null,
        resourceId: event.resourceId || null,
        details: event.details || null,
        success: event.success ?? true,
        errorMessage: event.errorMessage || null,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get all roles and their permissions for documentation
 */
export function getRolePermissions(): Record<string, { role: Role; permissions: Permission[] }> {
  return Object.entries(ROLE_PERMISSIONS).reduce((acc, [role, permissions]) => {
    acc[role] = {
      role: role as Role,
      permissions
    };
    return acc;
  }, {} as Record<string, { role: Role; permissions: Permission[] }>);
}