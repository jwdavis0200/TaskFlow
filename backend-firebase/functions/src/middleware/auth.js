const { HttpsError } = require('firebase-functions/v2/https');

/**
 * Validates that the user is authenticated
 * @param {object} context - Firebase function context
 * @returns {string} - User ID
 */
function validateAuth(context) {
  // Skip auth only in local emulator environment
  if (process.env.FUNCTIONS_EMULATOR && process.env.NODE_ENV !== 'production') {
    return 'test-user-id';
  }
  
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

module.exports = {
  validateAuth,
  validateProjectAccess
};