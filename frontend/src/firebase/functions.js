import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

// Helper function to format dates for frontend (HTML date inputs need yyyy-MM-dd format)
const formatDateForFrontend = (date) => {
  if (!date) return null;
  if (typeof date === 'string') return date;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]; // yyyy-MM-dd format
  }
  // Handle Firestore Timestamp objects
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toISOString().split('T')[0];
  }
  return null;
};

// Helper function to map Firebase IDs to frontend expected _id format
const mapFirebaseId = (item) => {
  if (!item) return item;
  return {
    ...item,
    _id: item.id
  };
};

// Helper function to map Firebase data to frontend format
const mapTaskData = (task) => {
  if (!task) return task;
  return {
    ...mapFirebaseId(task),
    // Convert dueDate to yyyy-MM-dd string format for HTML date inputs
    dueDate: formatDateForFrontend(task.dueDate),
    // Ensure timeSpent is preserved properly
    timeSpent: task.timeSpent || 0
  };
};

const mapColumnData = (column) => {
  if (!column) return column;
  return {
    ...mapFirebaseId(column),
    tasks: (column.tasks || []).map(mapTaskData)
  };
};

const mapBoardData = (board) => {
  if (!board) return board;
  return {
    ...mapFirebaseId(board),
    columns: (board.columns || []).map(mapColumnData)
  };
};

const mapProjectData = (project) => {
  if (!project) return project;
  return {
    ...mapFirebaseId(project),
    boards: (project.boards || []).map(mapBoardData)
  };
};

// Initialize Cloud Functions
const getProjectsFunction = httpsCallable(functions, 'getProjects');
const createProjectFunction = httpsCallable(functions, 'createProject');
const updateProjectFunction = httpsCallable(functions, 'updateProject');
const deleteProjectFunction = httpsCallable(functions, 'deleteProject');

const getBoardsFunction = httpsCallable(functions, 'getBoards');
const createBoardFunction = httpsCallable(functions, 'createBoard');
const updateBoardFunction = httpsCallable(functions, 'updateBoard');
const deleteBoardFunction = httpsCallable(functions, 'deleteBoard');

const getTasksFunction = httpsCallable(functions, 'getTasks');
const createTaskFunction = httpsCallable(functions, 'createTask');
const updateTaskFunction = httpsCallable(functions, 'updateTask');
const deleteTaskFunction = httpsCallable(functions, 'deleteTask');

// Project functions
export const fetchProjects = async () => {
  try {
    const result = await getProjectsFunction();
    return result.data.map(mapProjectData);
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const createProject = async (projectData) => {
  try {
    const result = await createProjectFunction(projectData);
    return result.data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const updateProject = async (projectId, updates) => {
  try {
    const result = await updateProjectFunction({ projectId, updates });
    return result.data;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId) => {
  try {
    const result = await deleteProjectFunction({ projectId });
    return result.data;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Board functions
export const fetchBoards = async (projectId) => {
  try {
    const result = await getBoardsFunction({ projectId });
    return result.data.map(mapBoardData);
  } catch (error) {
    console.error('Error fetching boards:', error);
    throw error;
  }
};

export const createBoard = async (projectId, name) => {
  try {
    const result = await createBoardFunction({ projectId, name });
    return result.data;
  } catch (error) {
    console.error('Error creating board:', error);
    throw error;
  }
};

export const updateBoard = async (boardId, updates) => {
  try {
    const result = await updateBoardFunction({ boardId, updates });
    return result.data;
  } catch (error) {
    console.error('Error updating board:', error);
    throw error;
  }
};

export const deleteBoard = async (boardId) => {
  try {
    const result = await deleteBoardFunction({ boardId });
    return result.data;
  } catch (error) {
    console.error('Error deleting board:', error);
    throw error;
  }
};

// Task functions
export const fetchTasks = async (projectId, boardId, columnId) => {
  try {
    const result = await getTasksFunction({ projectId, boardId, columnId });
    return result.data.map(mapTaskData);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

export const createTask = async (projectId, boardId, columnId, taskData) => {
  try {
    const result = await createTaskFunction({
      projectId,
      boardId,
      columnId,
      ...taskData
    });
    return mapTaskData(result.data);
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (projectId, boardId, columnId, taskId, updates) => {
  try {
    const result = await updateTaskFunction({ 
      taskId, 
      updates: {
        ...updates,
        // Include column ID in updates if provided
        ...(columnId && { columnId })
      }
    });
    return result.data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  try {
    const result = await deleteTaskFunction({ taskId });
    return result.data;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

