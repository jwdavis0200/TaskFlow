const { HttpsError } = require('firebase-functions/v2/https');

// Role-Based Access Control System
const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  EDIT_PROJECT: 'edit_project',
  MANAGE_BOARDS: 'manage_boards',
  EDIT_TASKS: 'edit_tasks',
  VIEW_ONLY: 'view_only'
};

const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.EDIT_PROJECT,
    PERMISSIONS.MANAGE_BOARDS,
    PERMISSIONS.EDIT_TASKS,
    PERMISSIONS.VIEW_ONLY
  ],
  [ROLES.EDITOR]: [
    PERMISSIONS.MANAGE_BOARDS,
    PERMISSIONS.EDIT_TASKS,
    PERMISSIONS.VIEW_ONLY
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_ONLY
  ]
};

/**
 * Validates that the user is authenticated
 * @param {object} context - Firebase function context
 * @returns {string} - User ID
 */
function validateAuth(context) {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  return context.auth.uid;
}

/**
 * Validates user access to a project
 * @param {object} db - Firestore database instance
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Project data
 */
async function validateProjectAccess(db, projectId, userId) {
  const projectDoc = await db.collection('projects').doc(projectId).get();
  
  if (!projectDoc.exists) {
    throw new HttpsError('not-found', 'Project not found');
  }
  
  const projectData = projectDoc.data();
  
  if (projectData.owner !== userId && !projectData.members.includes(userId)) {
    throw new HttpsError('permission-denied', 'Access denied to this project');
  }
  
  return projectData;
}

/**
 * Validates role input against allowed roles
 * @param {string} role - Role to validate
 * @throws {HttpsError} - If role is invalid
 */
function validateRole(role) {
  if (!role || !Object.values(ROLES).includes(role)) {
    throw new HttpsError('invalid-argument', `Invalid role: ${role}. Must be one of: ${Object.values(ROLES).join(', ')}`);
  }
}

/**
 * Gets a user's role in a project
 * @param {object} projectData - Project data from Firestore
 * @param {string} userId - User ID
 * @returns {string} - User's role (owner, admin, editor, viewer)
 */
function getUserRole(projectData, userId) {
  // Owner has special status
  if (projectData.owner === userId) {
    return ROLES.OWNER;
  }
  
  // Check if user is a member and has a role
  if (projectData.members && projectData.members.includes(userId)) {
    if (projectData.memberRoles && projectData.memberRoles[userId]) {
      return projectData.memberRoles[userId];
    }
    // Default role for members without explicit role (backward compatibility)
    return ROLES.EDITOR;
  }
  
  // User not in project
  return null;
}

/**
 * Checks if a user has a specific permission in a project
 * @param {object} projectData - Project data from Firestore
 * @param {string} userId - User ID
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has permission
 */
function hasPermission(projectData, userId, permission) {
  const userRole = getUserRole(projectData, userId);
  
  if (!userRole) {
    return false;
  }
  
  const allowedPermissions = ROLE_PERMISSIONS[userRole];
  return allowedPermissions && allowedPermissions.includes(permission);
}

/**
 * Validates if an actor can modify a target user's role
 * @param {string} actorRole - Role of the user performing the action
 * @param {string} targetRole - Current role of target user
 * @param {string} newRole - New role being assigned
 * @returns {boolean} - Whether the action is allowed
 */
function canModifyRole(actorRole, targetRole, newRole) {
  // Only owner and admin can modify roles
  if (actorRole !== ROLES.OWNER && actorRole !== ROLES.ADMIN) {
    return false;
  }
  
  // Cannot modify owner role
  if (targetRole === ROLES.OWNER || newRole === ROLES.OWNER) {
    return false;
  }
  
  // Admin cannot promote to admin or above unless they're owner
  if (actorRole === ROLES.ADMIN && (newRole === ROLES.ADMIN || newRole === ROLES.OWNER)) {
    return false;
  }
  
  return true;
}

/**
 * Validates project access and specific permission
 * @param {object} db - Firestore database instance
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @param {string} permission - Required permission
 * @returns {Promise<object>} - Project data
 */
async function validateProjectPermission(db, projectId, userId, permission) {
  const projectData = await validateProjectAccess(db, projectId, userId);
  
  if (!hasPermission(projectData, userId, permission)) {
    throw new HttpsError('permission-denied', `Insufficient permissions. Required: ${permission}`);
  }
  
  return projectData;
}

module.exports = {
  // Original functions
  validateAuth,
  validateProjectAccess,
  
  // RBAC constants
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  
  // RBAC functions
  validateRole,
  getUserRole,
  hasPermission,
  canModifyRole,
  validateProjectPermission
};