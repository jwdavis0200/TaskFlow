import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

// Projects API
export const fetchProjects = async () => {
  const getProjects = httpsCallable(functions, 'getProjects');
  const result = await getProjects();
  return result.data;
};

export const fetchProjectsWithBoards = async () => {
  // Firebase functions already return projects with boards populated
  return await fetchProjects();
};

export const createProject = async (projectData) => {
  const createProject = httpsCallable(functions, 'createProject');
  const result = await createProject(projectData);
  return result.data;
};

export const updateProject = async (projectId, projectData) => {
  const updateProject = httpsCallable(functions, 'updateProject');
  const result = await updateProject({ projectId, updates: projectData });
  return result.data;
};

export const deleteProject = async (projectId) => {
  console.log('API: Deleting project:', projectId);
  try {
    const deleteProject = httpsCallable(functions, 'deleteProject');
    const result = await deleteProject({ projectId });
    console.log('API: Project deletion response:', result.data);
    return result.data;
  } catch (error) {
    console.error('API: Error deleting project:', error.message);
    throw new Error(error.message || 'Failed to delete project');
  }
};

// Boards API
export const fetchBoards = async (projectId) => {
  console.log("API: Fetching boards for projectId:", projectId);
  const getBoards = httpsCallable(functions, 'getBoards');
  const result = await getBoards({ projectId });
  console.log("API: Boards received from server:", result.data);
  return result.data;
};

export const createBoard = async (projectId, boardData) => {
  console.log('API: Creating board with data:', { projectId, boardData });
  try {
    const createBoard = httpsCallable(functions, 'createBoard');
    const result = await createBoard({ projectId, name: boardData.name });
    console.log('API: Board creation response:', result.data);
    return result.data;
  } catch (error) {
    console.error('API: Error creating board:', error.message);
    throw new Error(error.message || 'Failed to create board');
  }
};

export const updateBoard = async (projectId, boardId, boardData) => {
  const updateBoard = httpsCallable(functions, 'updateBoard');
  const result = await updateBoard({ boardId, updates: boardData });
  return result.data;
};

export const deleteBoard = async (projectId, boardId) => {
  console.log('API: Deleting board:', { projectId, boardId });
  try {
    const deleteBoard = httpsCallable(functions, 'deleteBoard');
    const result = await deleteBoard({ boardId });
    console.log('API: Board deletion response:', result.data);
    return result.data;
  } catch (error) {
    console.error('API: Error deleting board:', error.message);
    throw new Error(error.message || 'Failed to delete board');
  }
};

// Note: Columns are managed automatically by Firebase functions when creating boards
// Default columns (To Do, In Progress, Done) are created with each board

// Tasks API
export const fetchTasks = async (projectId, boardId, columnId) => {
  const getTasks = httpsCallable(functions, 'getTasks');
  const result = await getTasks({ projectId, boardId, columnId });
  return result.data;
};

export const createTask = async (projectId, boardId, columnId, taskData) => {
  const createTask = httpsCallable(functions, 'createTask');
  const result = await createTask({
    projectId,
    boardId,
    columnId,
    ...taskData
  });
  return result.data;
};

export const updateTask = async (
  projectId,
  boardId,
  columnId,
  taskId,
  taskData
) => {
  const updateTask = httpsCallable(functions, 'updateTask');
  const result = await updateTask({ taskId, updates: taskData });
  return result.data;
};

export const deleteTask = async (taskId) => {
  const deleteTask = httpsCallable(functions, 'deleteTask');
  const result = await deleteTask({ taskId });
  return result.data;
};

// Timer API
export const startTimer = async (taskId) => {
  const startTimer = httpsCallable(functions, 'startTimer');
  const result = await startTimer({ taskId });
  return result.data;
};

export const stopTimer = async (taskId, timeElapsed) => {
  const stopTimer = httpsCallable(functions, 'stopTimer');
  const result = await stopTimer({ taskId, timeElapsed });
  return result.data;
};

// Collaboration API functions
export const inviteUserToProjectAPI = async (projectId, email, role) => {
  try {
    const inviteUserToProject = httpsCallable(functions, 'inviteUserToProject');
    const result = await inviteUserToProject({ projectId, email, role });
    return result.data;
  } catch (error) {
    console.error('API Error inviting user:', error);
    throw error;
  }
};

export const removeProjectMemberAPI = async (projectId, memberUserId) => {
  try {
    const removeProjectMember = httpsCallable(functions, 'removeProjectMember');
    const result = await removeProjectMember({ projectId, memberUserId });
    return result.data;
  } catch (error) {
    console.error('API Error removing member:', error);
    throw error;
  }
};

export const getMyInvitationsAPI = async () => {
  try {
    const getMyInvitations = httpsCallable(functions, 'getMyInvitations');
    const result = await getMyInvitations();
    return result.data;
  } catch (error) {
    console.error('API Error getting invitations:', error);
    throw error;
  }
};

export const acceptProjectInvitationAPI = async (invitationId) => {
  try {
    const acceptProjectInvitation = httpsCallable(functions, 'acceptProjectInvitation');
    const result = await acceptProjectInvitation({ invitationId });
    return result.data;
  } catch (error) {
    console.error('API Error accepting invitation:', error);
    throw error;
  }
};

// Helper function to get member details (requires new backend function)
export const getProjectMembersAPI = async (projectId, memberIds) => {
  try {
    const getProjectMembers = httpsCallable(functions, 'getProjectMembers');
    const result = await getProjectMembers({ projectId, memberIds });
    return result.data;
  } catch (error) {
    console.error('API Error getting members:', error);
    throw error;
  }
};

// RBAC Functions
export const changeUserRoleAPI = async (projectId, targetUserId, newRole) => {
  try {
    const changeUserRole = httpsCallable(functions, 'changeUserRole');
    const result = await changeUserRole({ projectId, targetUserId, newRole });
    return result.data;
  } catch (error) {
    console.error('API Error changing user role:', error);
    throw error;
  }
};

export const removeProjectMemberSecureAPI = async (projectId, memberUserId) => {
  try {
    const removeProjectMemberSecure = httpsCallable(functions, 'removeProjectMemberSecure');
    const result = await removeProjectMemberSecure({ projectId, memberUserId });
    return result.data;
  } catch (error) {
    console.error('API Error removing member (secure):', error);
    throw error;
  }
};

export const migrateProjectsToRBACAPI = async () => {
  try {
    const migrateProjectsToRBAC = httpsCallable(functions, 'migrateProjectsToRBAC');
    const result = await migrateProjectsToRBAC();
    return result.data;
  } catch (error) {
    console.error('API Error running RBAC migration:', error);
    throw error;
  }
};

// Note: Push notifications will be handled through Firebase Cloud Messaging
// when implemented in the migration
