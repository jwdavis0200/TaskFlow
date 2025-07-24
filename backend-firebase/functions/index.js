const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import and export functions
const projects = require('./src/projects');
const boards = require('./src/boards');
const tasks = require('./src/tasks');
const notifications = require('./src/notifications');
const migration = require('./src/migration');

// Export projects functions
exports.getProjects = projects.getProjects;
exports.createProject = projects.createProject;
exports.updateProject = projects.updateProject;
exports.deleteProject = projects.deleteProject;

// Export collaboration functions
exports.inviteUserToProject = projects.inviteUserToProject;
exports.acceptProjectInvitation = projects.acceptProjectInvitation;
exports.declineProjectInvitation = projects.declineProjectInvitation;
exports.getMyInvitations = projects.getMyInvitations;
exports.getProjectMembers = projects.getProjectMembers;

// Export migration functions
exports.migrateProjectsToRBAC = projects.migrateProjectsToRBAC;
exports.migrateMyProjectsToRBAC = migration.migrateMyProjectsToRBAC;
exports.getMyMigrationStatus = migration.getMyMigrationStatus;
exports.checkMigrationNeeded = migration.checkMigrationNeeded;

// Export new RBAC functions
exports.changeUserRole = projects.changeUserRole;
exports.removeProjectMemberSecure = projects.removeProjectMemberSecure;

// Export boards functions
exports.getBoards = boards.getBoards;
exports.createBoard = boards.createBoard;
exports.updateBoard = boards.updateBoard;
exports.deleteBoard = boards.deleteBoard;

// Export tasks functions
exports.getTasks = tasks.getTasks;
exports.createTask = tasks.createTask;
exports.updateTask = tasks.updateTask;
exports.deleteTask = tasks.deleteTask;
exports.startTimer = tasks.startTimer;
exports.stopTimer = tasks.stopTimer;

// Export notification functions
exports.sendTaskNotification = notifications.sendTaskNotification;
exports.sendDueDateReminder = notifications.sendDueDateReminder;