const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { ROLES, validateAuth } = require('./middleware/auth');

/**
 * Enhanced RBAC Migration for individual user's owned projects
 * Each user can migrate only their own projects
 */
exports.migrateMyProjectsToRBAC = onCall(async (request) => {
  const userId = validateAuth(request);
  const { dryRun = false, roleMapping = {} } = request.data;
  
  const db = admin.firestore();
  
  try {
    console.log(`Starting ${dryRun ? 'DRY RUN' : 'LIVE'} RBAC migration for user ${userId}...`);
    
    // Phase 1: Discovery and Validation - Only user's owned projects
    const projectsSnapshot = await db.collection('projects')
      .where('owner', '==', userId)
      .get();
    const totalProjects = projectsSnapshot.docs.length;
    
    let validationResults = {
      totalProjects,
      validProjects: [],
      invalidProjects: [],
      alreadyMigrated: [],
      warnings: []
    };
    
    // Validate each project
    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const projectId = projectDoc.id;
      
      const validation = await validateProjectForMigration(projectData, projectId, db);
      
      if (validation.alreadyMigrated) {
        validationResults.alreadyMigrated.push({
          projectId,
          name: projectData.name || 'Unnamed Project'
        });
      } else if (validation.isValid) {
        validationResults.validProjects.push({
          projectId,
          name: projectData.name || 'Unnamed Project',
          owner: projectData.owner,
          memberCount: (projectData.members || []).length,
          suggestedRoles: validation.suggestedRoles
        });
      } else {
        validationResults.invalidProjects.push({
          projectId,
          name: projectData.name || 'Unnamed Project',
          errors: validation.errors
        });
      }
      
      if (validation.warnings.length > 0) {
        validationResults.warnings.push({
          projectId,
          name: projectData.name || 'Unnamed Project',
          warnings: validation.warnings
        });
      }
    }
    
    // If dry run, return validation results
    if (dryRun) {
      return {
        phase: 'validation',
        dryRun: true,
        ...validationResults,
        migrationPlan: {
          projectsToMigrate: validationResults.validProjects.length,
          estimatedTime: validationResults.validProjects.length * 2, // seconds (2 seconds per project)
          wouldFail: validationResults.invalidProjects.length
        }
      };
    }
    
    // Phase 2: Live Migration
    const migrationResults = {
      ...validationResults,
      migrationStarted: new Date().toISOString(),
      successful: [],
      failed: [],
      rolledBack: []
    };
    
    // Create migration log entry for this user
    const migrationLogRef = db.collection('user_migration_logs').doc();
    await migrationLogRef.set({
      type: 'rbac_migration',
      status: 'in_progress',
      userId: userId,
      userEmail: request.auth.token.email,
      startedAt: FieldValue.serverTimestamp(),
      totalProjects: validationResults.validProjects.length,
      results: {}
    });
    
    // Process valid projects (no batching needed for individual users)
    const validProjects = validationResults.validProjects;
    for (let i = 0; i < validProjects.length; i++) {
      const project = validProjects[i];
      
      try {
        const migrationResult = await migrateProjectWithRollback(
          project.projectId, 
          project.suggestedRoles,
          roleMapping[project.projectId] || {},
          db
        );
        
        migrationResults.successful.push({
          projectId: project.projectId,
          name: project.name,
          rolesAssigned: migrationResult.rolesAssigned,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`Migration failed for project ${project.projectId}:`, error);
        migrationResults.failed.push({
          projectId: project.projectId,
          name: project.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Update progress in migration log
      await migrationLogRef.update({
        [`progress.project_${i}`]: {
          projectId: project.projectId,
          completed: i + 1,
          total: validProjects.length,
          timestamp: FieldValue.serverTimestamp()
        }
      });
    }
    
    // Phase 3: Post-Migration Verification
    const verificationResults = await verifyMigrationIntegrity(
      migrationResults.successful.map(p => p.projectId),
      db
    );
    
    // Update final migration log
    await migrationLogRef.update({
      status: migrationResults.failed.length === 0 ? 'completed' : 'completed_with_errors',
      completedAt: FieldValue.serverTimestamp(),
      results: {
        successful: migrationResults.successful.length,
        failed: migrationResults.failed.length,
        verification: verificationResults
      }
    });
    
    return {
      phase: 'completed',
      migrationId: migrationLogRef.id,
      migrationCompleted: new Date().toISOString(),
      ...migrationResults,
      verification: verificationResults
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw new HttpsError('internal', `Migration failed: ${error.message}`);
  }
});

/**
 * Validate a single project for migration readiness
 */
async function validateProjectForMigration(projectData, _projectId, _db) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    alreadyMigrated: false,
    suggestedRoles: {}
  };
  
  // Check if already migrated
  if (projectData.memberRoles) {
    validation.alreadyMigrated = true;
    return validation;
  }
  
  // Validate required fields
  if (!projectData.owner) {
    validation.isValid = false;
    validation.errors.push('Missing owner field');
  }
  
  if (!projectData.members || !Array.isArray(projectData.members)) {
    validation.isValid = false;
    validation.errors.push('Missing or invalid members array');
  } else {
    // Validate owner is in members
    if (!projectData.members.includes(projectData.owner)) {
      validation.warnings.push('Owner is not in members array - will be added');
    }
    
    // Check for duplicate members
    const uniqueMembers = [...new Set(projectData.members)];
    if (uniqueMembers.length !== projectData.members.length) {
      validation.warnings.push('Duplicate members found - will be deduplicated');
    }
    
    // Validate member IDs exist in Firebase Auth
    for (const memberId of uniqueMembers) {
      if (memberId !== projectData.owner) {
        try {
          await admin.auth().getUser(memberId);
          validation.suggestedRoles[memberId] = ROLES.EDITOR; // Default assignment
        } catch (error) {
          validation.warnings.push(`Member ${memberId} not found in Firebase Auth - will be removed`);
        }
      }
    }
  }
  
  return validation;
}

/**
 * Migrate a single project with rollback capability
 */
async function migrateProjectWithRollback(projectId, suggestedRoles, customRoles, db) {
  const projectRef = db.collection('projects').doc(projectId);
  
  // Get current project state for rollback
  const currentDoc = await projectRef.get();
  const currentData = currentDoc.data();
  
  try {
    // Merge suggested roles with custom overrides
    const finalRoles = { ...suggestedRoles, ...customRoles };
    
    // Clean up members array (remove duplicates, ensure owner is included)
    const cleanMembers = [...new Set([currentData.owner, ...(currentData.members || [])])];
    
    await db.runTransaction(async (transaction) => {
      transaction.update(projectRef, {
        memberRoles: finalRoles,
        members: cleanMembers, // Clean up members array
        updatedAt: FieldValue.serverTimestamp(),
        migratedAt: FieldValue.serverTimestamp()
      });
      
      // Create audit entry
      const auditRef = db.collection('audit_logs').doc();
      transaction.set(auditRef, {
        action: 'rbac_migration',
        projectId,
        rolesAssigned: finalRoles,
        memberCount: Object.keys(finalRoles).length,
        timestamp: FieldValue.serverTimestamp()
      });
    });
    
    return { rolesAssigned: finalRoles };
    
  } catch (error) {
    console.error(`Rolling back project ${projectId}:`, error);
    // Rollback is implicit since transaction failed
    throw error;
  }
}

/**
 * Verify migration integrity across all migrated projects
 */
async function verifyMigrationIntegrity(migratedProjectIds, db) {
  const verification = {
    verified: [],
    inconsistencies: [],
    totalChecked: migratedProjectIds.length
  };
  
  for (const projectId of migratedProjectIds) {
    try {
      const projectDoc = await db.collection('projects').doc(projectId).get();
      const projectData = projectDoc.data();
      
      const checks = {
        hasMemberRoles: !!projectData.memberRoles,
        hasValidOwner: !!projectData.owner,
        ownerNotInMemberRoles: !projectData.memberRoles[projectData.owner],
        allMembersHaveRoles: true,
        noOrphanedRoles: true
      };
      
      // Check all members have corresponding roles (except owner)
      const nonOwnerMembers = (projectData.members || []).filter(m => m !== projectData.owner);
      for (const memberId of nonOwnerMembers) {
        if (!projectData.memberRoles[memberId]) {
          checks.allMembersHaveRoles = false;
          break;
        }
      }
      
      // Check no roles exist for non-members
      for (const roleUserId of Object.keys(projectData.memberRoles || {})) {
        if (!projectData.members.includes(roleUserId)) {
          checks.noOrphanedRoles = false;
          break;
        }
      }
      
      const isConsistent = Object.values(checks).every(check => check === true);
      
      if (isConsistent) {
        verification.verified.push(projectId);
      } else {
        verification.inconsistencies.push({
          projectId,
          name: projectData.name,
          failedChecks: Object.entries(checks)
            .filter(([_, passed]) => !passed)
            .map(([check, _]) => check)
        });
      }
      
    } catch (error) {
      verification.inconsistencies.push({
        projectId,
        error: `Verification failed: ${error.message}`
      });
    }
  }
  
  return verification;
}

/**
 * Get user's migration status and logs
 */
exports.getMyMigrationStatus = onCall(async (request) => {
  const userId = validateAuth(request);
  const { migrationId } = request.data;
  
  const db = admin.firestore();
  
  try {
    if (migrationId) {
      // Get specific migration log for this user
      const migrationDoc = await db.collection('user_migration_logs').doc(migrationId).get();
      if (!migrationDoc.exists) {
        throw new HttpsError('not-found', 'Migration log not found');
      }
      
      const migrationData = migrationDoc.data();
      // Ensure user can only see their own migration logs
      if (migrationData.userId !== userId) {
        throw new HttpsError('permission-denied', 'Access denied to migration log');
      }
      
      return { id: migrationId, ...migrationData };
    } else {
      // Get recent migration logs for this user only
      try {
        const migrationsSnapshot = await db.collection('user_migration_logs')
          .where('userId', '==', userId)
          .orderBy('startedAt', 'desc')
          .limit(10)
          .get();
        
        return {
          migrations: migrationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        };
      } catch (queryError) {
        // Collection doesn't exist yet or missing index, return empty array
        console.log('Migration logs collection query failed, returning empty array:', queryError.message);
        return {
          migrations: []
        };
      }
    }
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw new HttpsError('internal', 'Failed to get migration status');
  }
});

/**
 * Check if user has any projects that need migration
 */
exports.checkMigrationNeeded = onCall(async (request) => {
  const userId = validateAuth(request);
  const db = admin.firestore();
  
  try {
    // Get user's owned projects
    const projectsSnapshot = await db.collection('projects')
      .where('owner', '==', userId)
      .get();
    
    let needsMigration = false;
    let projectsToMigrate = 0;
    let totalProjects = projectsSnapshot.docs.length;
    
    for (const doc of projectsSnapshot.docs) {
      const projectData = doc.data();
      if (!projectData.memberRoles) {
        needsMigration = true;
        projectsToMigrate++;
      }
    }
    
    return {
      needsMigration,
      totalProjects,
      projectsToMigrate,
      projectsAlreadyMigrated: totalProjects - projectsToMigrate
    };
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    throw new HttpsError('internal', 'Failed to check migration status');
  }
});