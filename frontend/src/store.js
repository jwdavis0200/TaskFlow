import { create } from "zustand";
import {
  createProject,
  updateProject,
  deleteProject,
  fetchBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  createTask,
  updateTask as updateTaskAPI,
  deleteTask,
  inviteUserToProjectAPI,
  getMyInvitationsAPI,
  acceptProjectInvitationAPI,
  declineProjectInvitationAPI,
  getProjectMembersAPI,
  changeUserRoleAPI,
  removeProjectMemberSecureAPI,
  fetchProjectsWithBoards,
} from "./services/api.js";
import { signIn, signUp, onAuthStateChange, logout, clearAnonymousSessions } from "./firebase/auth";
import { toastService } from './components/toast/toastService.jsx';

// Helper function to safely create Date objects
const safeCreateDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? null : date;
};

// Utility function for exponential backoff retry
const retryOperation = async (operation, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.code === 'permission-denied' || 
          error.code === 'not-found' || 
          error.code === 'invalid-argument') {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};


// Helper function to safely get ISO string from task updatedAt for version control
const getExpectedVersion = (task) => {
  if (!task?.updatedAt) return null;
  
  try {
    // If it's already a Date object, validate it first
    if (task.updatedAt instanceof Date) {
      // Check if the Date object is valid before calling toISOString()
      if (isNaN(task.updatedAt.getTime())) {
        console.warn('Invalid Date object in getExpectedVersion:', task.updatedAt);
        return null;
      }
      return task.updatedAt.toISOString();
    }
    // If it's a string, validate it's a proper ISO string
    if (typeof task.updatedAt === 'string') {
      const date = new Date(task.updatedAt);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return null;
  } catch (error) {
    console.warn('Invalid updatedAt format in getExpectedVersion:', task.updatedAt, error);
    return null;
  }
};

// Helper function to validate optimistic updates against server response
const validateOptimisticUpdate = (optimisticState, serverResponse, taskId) => {
  // Find the task in the optimistic state (could be in boards or tasks array)
  let optimisticTask = null;
  
  // First try to find in boards array (primary source of truth)
  for (const board of optimisticState.boards) {
    for (const column of board.columns) {
      const foundTask = column.tasks?.find(task => task._id === taskId);
      if (foundTask) {
        optimisticTask = foundTask;
        break;
      }
    }
    if (optimisticTask) break;
  }
  
  // Task should always be found in boards structure
  
  if (!optimisticTask || !serverResponse) {
    return false;
  }
  
  // Compare key fields that matter for optimistic updates
  // For moveTask, columnId is the most important
  // For other updates, title and priority matter too
  const columnMatches = optimisticTask.columnId === serverResponse.columnId;
  const titleMatches = !serverResponse.title || optimisticTask.title === serverResponse.title;
  const priorityMatches = !serverResponse.priority || optimisticTask.priority === serverResponse.priority;
  
  // Debug logging for failed validations
  if (!columnMatches || !titleMatches || !priorityMatches) {
    console.warn('Optimistic update validation details:', {
      taskId,
      optimisticColumnId: optimisticTask.columnId,
      serverColumnId: serverResponse.columnId,
      columnMatches,
      optimisticTitle: optimisticTask.title,
      serverTitle: serverResponse.title,
      titleMatches,
      optimisticPriority: optimisticTask.priority,
      serverPriority: serverResponse.priority,
      priorityMatches
    });
  }
  
  return columnMatches && titleMatches && priorityMatches;
};

export const useStore = create((set, get) => ({
  // Auth State
  user: null,
  isAuthenticated: false,
  authLoading: true,

  // State for Projects
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,

  // State for Boards (within a project)
  boards: [],
  selectedBoard: null,

  // Tasks are stored within selectedBoard.columns[].tasks structure

  // Collaboration state
  projectMembers: [], // Current project member details
  invitations: [], // User's pending invitations
  collaborationLoading: false,
  
  // RBAC state, user-specific - maps ALL projects to CURRENT user's role
  userRoles: {}, // Map of projectId -> user's role in that project
  projectPermissions: {}, // Map of projectId -> user's permissions in that project

  // UI State
  isSidebarOpen: JSON.parse(localStorage.getItem('taskflow-sidebar-open') ?? 'true'),
  isModalOpen: false,
  modalContent: null, // e.g., 'addProject', 'addTask', 'editBoard'
  // Theme State
  themePreference: 'system', // 'system' | 'light' | 'dark'
  resolvedTheme: undefined,  // 'light' | 'dark'
  
  // Drag & Drop State
  isDragInProgress: false,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Auth Actions
  setUser: (user) => set({ user, isAuthenticated: !!user, authLoading: false }),
  signInUser: async (email, password) => {
    try {
      set({ authLoading: true });
      const user = await signIn(email, password);
      set({ user, isAuthenticated: true, authLoading: false });
      return user;
    } catch (error) {
      console.error('Error signing in:', error);
      set({ authLoading: false });
      throw error;
    }
  },
  signUpUser: async (email, password) => {
    try {
      set({ authLoading: true });
      const user = await signUp(email, password);
      set({ user, isAuthenticated: true, authLoading: false });
      return user;
    } catch (error) {
      console.error('Error signing up:', error);
      set({ authLoading: false });
      throw error;
    }
  },
  signOut: async () => {
    try {
      await logout();
      set({ 
        user: null, 
        isAuthenticated: false,
        projects: [],
        selectedProject: null,
        boards: [],
        selectedBoard: null
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },
  initAuth: () => {
    // Clear any existing anonymous sessions first
    clearAnonymousSessions();
    
    return onAuthStateChange((user) => {
      // Only authenticate non-anonymous users
      if (user && !user.isAnonymous) {
        set({ user, isAuthenticated: true, authLoading: false });
        // Load projects when user is authenticated without blocking
        get().loadProjects();
      } else {
        // Sign out anonymous users or null users
        set({ user: null, isAuthenticated: false, authLoading: false });
      }
    });
  },

  // Project Actions
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      console.log("Store: Fetching projects from API...");
      const projects = await fetchProjectsWithBoards();
      console.log("Store: Projects fetched:", projects);
      // Firebase functions return boards directly (not boardsList)
      // Map Firebase 'id' to '_id' for compatibility with existing components
      const projectsWithBoards = projects.map(project => ({
        ...project,
        _id: project.id, // Map Firebase id to _id for compatibility
        boards: (project.boards || []).map(board => ({
          ...board,
          _id: board.id // Also map board ids
        }))
      }));
      console.log("Store: Projects with boards mapped:", projectsWithBoards);
      const user = get().user;
      if (user) {
        const userRoles = {};
        
        projectsWithBoards.forEach(project => {
          // Determine user role in project (UI purposes only)
          let userRole = 'viewer'; // default
          
          if (project.owner === user.uid) {
            userRole = 'owner';
          } else if (project.memberRoles && project.memberRoles[user.uid]) {
            userRole = project.memberRoles[user.uid];
          }
          
          userRoles[project.id] = userRole;
        });
        
        set({ 
          projects: projectsWithBoards, 
          userRoles,
          loading: false 
        });
      } else {
        set({ projects: projectsWithBoards, loading: false });
      }
    } catch (error) {
      toastService.handleError(error, 'load projects');
      set({ error, loading: false });
    }
  },
  addProject: async (projectData) => {
    set({ loading: true, error: null });
    try {
      console.log('Store: Creating project with data:', projectData);
      const result = await createProject(projectData);
      console.log('Store: Project creation result:', result);
      
      // Firebase function returns {projectId, boardId}, so reload projects to get full data
      await get().loadProjects();
      
      toastService.success('Project created successfully!');
      set({ loading: false });
    } catch (error) {
      toastService.handleError(error, 'create project');
      set({ error, loading: false });
    }
  },
  updateProject: async (projectId, projectData) => {
    set({ loading: true, error: null });
    try {
      const updatedProject = await updateProject(projectId, projectData);
      set((state) => ({
        projects: state.projects.map((project) =>
          project._id === updatedProject._id ? updatedProject : project
        ),
        selectedProject:
          state.selectedProject?._id === updatedProject._id
            ? updatedProject
            : state.selectedProject,
        loading: false,
      }));
      toastService.success('Project updated successfully!');
    } catch (error) {
      toastService.handleError(error, 'update project');
      set({ error, loading: false });
    }
  },
  deleteProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      await deleteProject(projectId);
      set((state) => ({
        projects: state.projects.filter((project) => project._id !== projectId),
        selectedProject:
          state.selectedProject?._id === projectId
            ? null
            : state.selectedProject,
        loading: false,
      }));
      toastService.success('Project deleted successfully!');
    } catch (error) {
      toastService.handleError(error, 'delete project');
      set({ error, loading: false });
    }
  },
  // Sets which project is currently active for the user
  setSelectedProject: (project) => {
    // Validate project has required properties
    if (project && (!project._id || !project.name)) {
      console.error("Store: Invalid project data provided:", project);
      return;
    }
    
    console.log("Store: Setting selected project:", project?.name);
    set({ selectedProject: project });
  },

  // Board Actions
  loadBoards: async (projectId) => {
    const isDragInProgress = get().isDragInProgress;
    if (isDragInProgress) {
      console.log('Store: Skipping loadBoards during drag operation');
      return;
    }
    set({ loading: true, error: null });
    try {
      const boards = await fetchBoards(projectId);
      // Map Firebase 'id' to '_id' for compatibility with existing components
      const boardsWithCompatibleIds = boards.map(board => {
        // Map columns with _id and preserve their existing tasks
        const columnsWithIds = (board.columns || []).map(column => ({
          ...column,
          _id: column.id,
          // Normalize tasks and keep them in their current column
          tasks: (column.tasks || []).map((task) => {
            return {
              ...task,
              _id: task.id || task._id,
              // Convert ISO strings back to Date objects for consistent frontend handling
              dueDate: safeCreateDate(task.dueDate),
              createdAt: safeCreateDate(task.createdAt),
              updatedAt: safeCreateDate(task.updatedAt),
              column: column.id
            };
          })
        }));

        return {
          ...board,
          _id: board.id,
          columns: columnsWithIds
        };
      });
      // Load boards with tasks in nested structure
      set({ boards: boardsWithCompatibleIds, loading: false });
    } catch (error) {
      set({ error, loading: false });
    }
  },
  addBoard: async (projectId, boardData) => {
    const loadProjects = get().loadProjects;
    const loadBoards = get().loadBoards;
    set({ loading: true, error: null });
    try {
      const newBoard = await createBoard(projectId, boardData);
      console.log("Store: Board created successfully:", newBoard);
      
      // Reload boards for the current project to get the updated data with columns
      await loadBoards(projectId);
      
      // Also reload projects to update the project-level board list
      await loadProjects();
      
      set({ loading: false });
      toastService.success('Board created successfully!');
    } catch (error) {
      console.error("Store: Error creating board:", error);
      set({ error, loading: false });
      throw error; // Re-throw to handle in component
    }
  },
  updateBoard: async (projectId, boardId, boardData) => {
    set({ loading: true, error: null });
    try {
      const updatedBoard = await updateBoard( boardId, boardData);
      set((state) => ({
        boards: state.boards.map((board) =>
          board._id === updatedBoard._id ? updatedBoard : board
        ),
        selectedBoard:
          state.selectedBoard?._id === updatedBoard._id
            ? updatedBoard
            : state.selectedBoard,
        loading: false,
      }));
      toastService.success('Board updated successfully!');
    } catch (error) {
      toastService.handleError(error, 'update board');
      set({ error, loading: false });
    }
  },
  deleteBoard: async (projectId, boardId) => {
    set({ loading: true, error: null });
    try {
      await deleteBoard(projectId, boardId);
      set((state) => ({
        boards: state.boards.filter((board) => board._id !== boardId),
        projects: state.projects.map((project) =>
          project._id === projectId
            ? {
                ...project,
                boards: project.boards.filter((board) => board._id !== boardId),
              }
            : project
        ),
        selectedBoard:
          state.selectedBoard?._id === boardId ? null : state.selectedBoard,
        loading: false,
      }));
      toastService.success('Board deleted successfully!');
    } catch (error) {
      toastService.handleError(error, 'delete board');
      set({ error, loading: false });
    }
  },
  setSelectedBoard: (board) => {
    const { isDragInProgress } = get();
    if (isDragInProgress) {
      console.log('Store: Skipping setSelectedBoard during drag operation');
      return;
    }

    // Validate board has required properties
    if (board && (!board._id || !board.name)) {
      console.error("Store: Invalid board data provided:", board);
      return;
    }

    console.log("Store: Setting selected board:", board?.name);
    set({ selectedBoard: board });
  },
  // Task Actions
  // Local-only timer state updates (no network call)
  applyTaskTimerUpdate: (boardId, columnId, taskId, updates) => {
    set((state) => {
      const updatedBoards = state.boards.map((board) => {
        if (board._id !== boardId) return board;
        return {
          ...board,
          columns: board.columns.map((column) => {
            if (column._id !== columnId) return column;
            return {
              ...column,
              tasks: column.tasks.map((task) =>
                task._id === taskId ? { ...task, ...updates } : task
              ),
            };
          }),
        };
      });
      const updatedSelectedBoard =
        state.selectedBoard && state.selectedBoard._id === boardId
          ? {
              ...state.selectedBoard,
              columns: state.selectedBoard.columns.map((column) => {
                if (column._id !== columnId) return column;
                return {
                  ...column,
                  tasks: column.tasks.map((task) =>
                    task._id === taskId ? { ...task, ...updates } : task
                  ),
                };
              }),
            }
          : state.selectedBoard;
      return { boards: updatedBoards, selectedBoard: updatedSelectedBoard };
    });
  },
  addTask: async (projectId, boardId, columnId, taskData) => {
    set({ loading: true, error: null });
    try {
      const newTask = await retryOperation(async () => {
        return await createTask(projectId, boardId, columnId, taskData);
      });
      
      // Firebase functions return ISO strings for dates, convert to Date objects
      const normalizedTask = {
        ...newTask,
        _id: newTask.id,
        // Convert ISO strings back to Date objects for consistent frontend handling
        dueDate: safeCreateDate(newTask.dueDate),
        createdAt: safeCreateDate(newTask.createdAt),
        updatedAt: safeCreateDate(newTask.updatedAt)
      };
      
      set((state) => ({
        boards: state.boards.map((board) =>
          board._id === boardId
            ? {
                ...board,
                columns: board.columns.map((column) =>
                  column._id === columnId
                    ? { ...column, tasks: [...(column.tasks || []), normalizedTask] }
                    : column
                ),
              }
            : board
        ),
        selectedBoard:
          state.selectedBoard && state.selectedBoard._id === boardId
            ? {
                ...state.selectedBoard,
                columns: state.selectedBoard.columns.map((column) =>
                  column._id === columnId
                    ? { ...column, tasks: [...(column.tasks || []), normalizedTask] }
                    : column
                ),
              }
            : state.selectedBoard,
        loading: false,
      }));
      
      console.log("Store: Task created successfully:", normalizedTask);
      toastService.success('Task created successfully!');
      return normalizedTask; // Return the created task
    } catch (error) {
      toastService.handleError(error, 'create task');
      set({ loading: false });
    }
  },
  updateTask: async (projectId, boardId, columnId, taskId, taskData) => {
    set({ loading: true, error: null });
    console.log("Store updateTask: Starting update", {
      projectId,
      boardId,
      columnId,
      taskId,
      taskData,
    });

    try {
      // Get current task data for conflict detection
      const state = get();
      let currentTask = null;
      
      // Find the current task in the state
      for (const board of state.boards) {
        if (board._id === boardId) {
          for (const column of board.columns) {
            const foundTask = column.tasks?.find(task => task._id === taskId);
            if (foundTask) {
              currentTask = foundTask;
              break;
            }
          }
          break;
        }
      }

      const expectedVersion = getExpectedVersion(currentTask);

      // 1. Call the API to update the task on the backend with retry logic
      const updatedTask = await retryOperation(async () => {
        return await updateTaskAPI(
          taskId,
          taskData,
          expectedVersion
        );
      });

      console.log("Store updateTask: API response", updatedTask);

      // 2. Update the frontend state
      set((state) => {
        // Deep copy of boards to ensure immutability
        const newBoards = JSON.parse(JSON.stringify(state.boards));
        const boardToUpdate = newBoards.find((b) => b._id === boardId);

        if (!boardToUpdate) {
          return { ...state, loading: false }; // Or handle error
        }

        let originalColumn = null;
        let taskFound = false;

        // Find and remove the task from its original column
        for (const col of boardToUpdate.columns) {
          const taskIndex = col.tasks.findIndex((t) => t._id === taskId);
          if (taskIndex !== -1) {
            originalColumn = col;
            col.tasks.splice(taskIndex, 1);
            taskFound = true;
            break;
          }
        }

        // Find the new column and add the updated task
        const newColumn = boardToUpdate.columns.find(
          (c) => c._id === updatedTask.columnId
        );

        if (newColumn) {
          const normalizedTask = {
            ...updatedTask,
            _id: updatedTask.id,
            // Convert ISO strings back to Date objects for consistent frontend handling
            createdAt: safeCreateDate(updatedTask.createdAt),
            updatedAt: safeCreateDate(updatedTask.updatedAt),
            dueDate: safeCreateDate(updatedTask.dueDate)
          };
          // Add the task to the new column
          newColumn.tasks.push(normalizedTask);
        } else if (taskFound) {
          // If the new column doesn't exist (which is unlikely),
          // add the task back to its original column to prevent data loss.
          originalColumn.tasks.push(updatedTask);
        }

        // Update the selectedBoard state as well
        const newSelectedBoard =
          state.selectedBoard?._id === boardId
            ? boardToUpdate
            : state.selectedBoard;

        return {
          boards: newBoards,
          selectedBoard: newSelectedBoard,
          loading: false,
        };
      });
      
      toastService.success('Task updated successfully!');
    } catch (error) {
      toastService.handleError(error, 'update task');
      
      // Handle conflict errors specially
      if (error.code === 'failed-precondition') {
        // Refresh the board data to get latest state
        const { loadBoards } = get();
        await loadBoards(projectId);
        set({ loading: false });
        return;
      }
      
      set({ loading: false });
    }
  },
  deleteTask: async (projectId, boardId, columnId, taskId) => {
    set({ loading: true, error: null });
    try {
      await retryOperation(async () => {
        return await deleteTask(taskId);
      });
      set((state) => ({
        boards: state.boards.map((board) =>
          board._id === boardId
            ? {
                ...board,
                columns: board.columns.map((column) =>
                  column._id === columnId
                    ? { ...column, tasks: column.tasks.filter((task) => task._id !== taskId) }
                    : column
                ),
              }
            : board
        ),
        selectedBoard:
          state.selectedBoard && state.selectedBoard._id === boardId
            ? {
                ...state.selectedBoard,
                columns: state.selectedBoard.columns.map((column) =>
                  column._id === columnId
                    ? { ...column, tasks: column.tasks.filter((task) => task._id !== taskId) }
                    : column
                ),
              }
            : state.selectedBoard,
        loading: false,
      }));
      
      toastService.success('Task deleted successfully!');
    } catch (error) {
      // Handle specific error cases
      if (error.code === 'not-found') {
        // Task was already deleted by another user, just update UI
        toastService.success('Task was already deleted.');
        set({ loading: false });
        return;
      }
      
      toastService.handleError(error, 'delete task');
      set({ loading: false });
    }
  },

  
  // Optimistically update task attachments after successful upload
  updateTaskAttachments: (boardId, taskId, newAttachment) => {
    set((state) => ({
      boards: state.boards.map((board) =>
        board._id === boardId
          ? {
              ...board,
              columns: board.columns.map((column) => ({
                ...column,
                tasks: column.tasks.map((task) =>
                  task._id === taskId
                    ? { ...task, attachments: [...(task.attachments || []), newAttachment] }
                    : task
                ),
              })),
            }
          : board
      ),
      selectedBoard:
        state.selectedBoard && state.selectedBoard._id === boardId
          ? {
              ...state.selectedBoard,
              columns: state.selectedBoard.columns.map((column) => ({
                ...column,
                tasks: column.tasks.map((task) =>
                  task._id === taskId
                    ? { ...task, attachments: [...(task.attachments || []), newAttachment] }
                    : task
                ),
              })),
            }
          : state.selectedBoard,
    }));
  },

  // Remove attachment from task (for rollback on upload failure)
  removeTaskAttachment: (boardId, taskId, attachmentId) => {
    set((state) => ({
      boards: state.boards.map((board) =>
        board._id === boardId
          ? {
              ...board,
              columns: board.columns.map((column) => ({
                ...column,
                tasks: column.tasks.map((task) =>
                  task._id === taskId
                    ? { ...task, attachments: (task.attachments || []).filter(att => att.id !== attachmentId) }
                    : task
                ),
              })),
            }
          : board
      ),
      // Need to update selectedBoard too so active board does not show stale data
      selectedBoard:
        state.selectedBoard && state.selectedBoard._id === boardId
          ? {
              ...state.selectedBoard,
              columns: state.selectedBoard.columns.map((column) => ({
                ...column,
                tasks: column.tasks.map((task) =>
                  task._id === taskId
                    ? { ...task, attachments: (task.attachments || []).filter(att => att.id !== attachmentId) }
                    : task
                ),
              })),
            }
          : state.selectedBoard,
    }));
  },
  moveTask: async (taskId, destColumnId, projectId, boardId) => {
    const state = get();
    
    // Set drag in progress to prevent other state operations
    set({ isDragInProgress: true });
    let taskToMove = null;
    let sourceColumnId = null;

    // Find the task in selectedBoard first since drag operations happen on active board
    if (state.selectedBoard && state.selectedBoard._id === boardId) {
      for (const column of state.selectedBoard.columns) {
        const foundTask = column.tasks?.find((task) => task._id === taskId);
        if (foundTask) {
          taskToMove = foundTask;
          sourceColumnId = column._id;
          break;
        }
      }
    }

    // If not found in selectedBoard, fallback to boards array
    if (!taskToMove) {
      const boardInArray = state.boards.find((board) => board._id === boardId);
      if (boardInArray) {
        for (const column of boardInArray.columns) {
          const foundTask = column.tasks?.find((task) => task._id === taskId);
          if (foundTask) {
            taskToMove = foundTask;
            sourceColumnId = column._id;
            break;
          }
        }
      }
    }

    if (!taskToMove) {
      console.error('Task not found for moveTask:', { taskId, boardId, availableBoards: state.boards.map(b => b._id) });
      set({ isDragInProgress: false });
      return;
    }
    
    // Additional check: ensure source and destination columns are different
    if (sourceColumnId === destColumnId) {
      console.log('Task already in destination column, skipping move');
      set({ isDragInProgress: false });
      return;
    }


    // Optimistic update - Update state immediately
    set((state) => {
      // Ensure the board exists in the boards array
      const boardExists = state.boards.some(board => board._id === boardId);
      if (!boardExists && state.selectedBoard && state.selectedBoard._id === boardId) {
        // Add selectedBoard to boards array if it's missing
        console.warn('Board found in selectedBoard but missing from boards array, adding it');
        state.boards.push(state.selectedBoard);
      }

      const newBoards = state.boards.map((board) => {
        if (board._id !== boardId) return board;

        const newColumns = board.columns.map((column) => {
          if (column._id === sourceColumnId) {
            // Remove task from source column
            return {
              ...column,
              tasks: column.tasks.filter((task) => task._id !== taskId)
            };
          } else if (column._id === destColumnId) {
            // Add task to destination column
            return {
              ...column,
              tasks: [...(column.tasks || []), { ...taskToMove, columnId: destColumnId }]
            };
          }
          return column;
        });

        return { ...board, columns: newColumns };
      });

      // Update selectedBoard if it's the current board
      const newSelectedBoard = state.selectedBoard?._id === boardId
        ? newBoards.find((board) => board._id === boardId)
        : state.selectedBoard;

      return {
        boards: newBoards,
        selectedBoard: newSelectedBoard
      };
    });

    try {
      // Update task on backend with column only, using retry logic
      const serverResponse = await retryOperation(async () => {
        return await updateTaskAPI(
          taskId, 
          { columnId: destColumnId },
          getExpectedVersion(taskToMove)
        );
      });
      
      // Validate optimistic update against server response
      const currentState = get();
      const isValidOptimisticUpdate = validateOptimisticUpdate(
        currentState, 
        serverResponse, 
        taskId
      );
      
      if (!isValidOptimisticUpdate) {
        console.warn('Optimistic update validation failed for moveTask, refreshing board data');
        console.log('Expected columnId:', destColumnId, 'Server response:', serverResponse);
        // Refresh board data to ensure consistency
        const { loadBoards } = get();
        await loadBoards(projectId);
      }
      
      // Clear drag state on success
      set({ isDragInProgress: false });
    } catch (error) {
      // Check if it's a conflict error
      if (error.code === 'failed-precondition') {
        // Refresh the board data to get latest state
        const { loadBoards } = get();
        await loadBoards(projectId);
        toastService.handleError(error, 'move task');
        set({ isDragInProgress: false });
        return;
      }
      
      toastService.handleError(error, 'move task');
      
      // Revert optimistic update on failure
      set((state) => {
        const revertedBoards = state.boards.map((board) => {
          if (board._id !== boardId) return board;

          const revertedColumns = board.columns.map((column) => {
            if (column._id === destColumnId) {
              // Remove task from destination column
              return {
                ...column,
                tasks: column.tasks.filter((task) => task._id !== taskId)
              };
            } else if (column._id === sourceColumnId) {
              // Add task back to source column
              return {
                ...column,
                tasks: [...(column.tasks || []), taskToMove]
              };
            }
            return column;
          });

          return { ...board, columns: revertedColumns };
        });

        const revertedSelectedBoard = state.selectedBoard?._id === boardId
          ? revertedBoards.find((board) => board._id === boardId)
          : state.selectedBoard;

        return {
          boards: revertedBoards,
          selectedBoard: revertedSelectedBoard
        };
      });
      
      // Clear drag state on error
      set({ isDragInProgress: false });
    }
  },

  // UI Actions
  toggleSidebar: () =>
    set((state) => {
      const newSidebarState = !state.isSidebarOpen;
      localStorage.setItem('taskflow-sidebar-open', JSON.stringify(newSidebarState));
      return { isSidebarOpen: newSidebarState };
    }),
  openModal: (content = null) =>
    set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),
  
  // Drag & Drop Actions
  setDragInProgress: (isDragging) => set({ isDragInProgress: isDragging }),

  // Theme Actions
  setThemePreference: (preference) => {
    if (preference !== 'system' && preference !== 'light' && preference !== 'dark') return;
    localStorage.setItem('taskflow-theme-preference', preference);
    set({ themePreference: preference });
  },
  setResolvedTheme: (theme) => {
    if (theme !== 'light' && theme !== 'dark') return;
    set({ resolvedTheme: theme });
  },

  // RBAC Helper Functions (UI logic only - server enforces security)
  getUserRole: (projectId) => {
    const { userRoles } = get();
    return userRoles[projectId] || 'viewer';
  },

  canInviteMembers: (projectId) => {
    const role = get().getUserRole(projectId);
    return role === 'owner' || role === 'admin';
  },

  canRemoveMembers: (projectId) => {
    const role = get().getUserRole(projectId);
    return role === 'owner' || role === 'admin';
  },

  canEditProject: (projectId) => {
    const role = get().getUserRole(projectId);
    return role === 'owner' || role === 'admin';
  },

  canManageBoards: (projectId) => {
    const role = get().getUserRole(projectId);
    return role === 'owner' || role === 'admin' || role === 'editor';
  },

  canEditTasks: (projectId) => {
    const role = get().getUserRole(projectId);
    return role === 'owner' || role === 'admin' || role === 'editor';
  },

  isProjectOwner: (projectId) => {
    return get().getUserRole(projectId) === 'owner';
  },

  // Collaboration Actions
  inviteUserToProject: async (projectId, email, role = 'editor') => {
    set({ collaborationLoading: true, error: null });
    try {
      const result = await inviteUserToProjectAPI(projectId, email, role);
      set({ collaborationLoading: false });
      toastService.success(`Invitation sent to ${email}!`);
      return result;
    } catch (error) {
      toastService.handleError(error, 'invite user to project');
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
  
  
  loadMyInvitations: async () => {
    set({ collaborationLoading: true, error: null });
    try {
      const invitations = await getMyInvitationsAPI();
      set({ invitations, collaborationLoading: false });
    } catch (error) {
      toastService.handleError(error, 'load invitations');
      set({ error, collaborationLoading: false });
    }
  },
  
  acceptProjectInvitation: async (invitationId) => {
    set({ collaborationLoading: true, error: null });
    try {
      const result = await acceptProjectInvitationAPI(invitationId);
      
      // Remove invitation from local state
      set((state) => ({
        invitations: state.invitations.filter(inv => inv.id !== invitationId),
        collaborationLoading: false
      }));
      
      // Reload projects to include the new project
      await get().loadProjects();
      
      toastService.success('Invitation accepted! Project added to your workspace.');
      return result;
    } catch (error) {
      toastService.handleError(error, 'accept invitation');
      set({ error, collaborationLoading: false });
      throw error;
    }
  },

  
  declineProjectInvitation: async (invitationId) => {
    set({ collaborationLoading: true, error: null });
    try {
      const result = await declineProjectInvitationAPI(invitationId);
      
      // Remove invitation from local state
      set((state) => ({
        invitations: state.invitations.filter(inv => inv.id !== invitationId),
        collaborationLoading: false
      }));
      
      toastService.success('Invitation declined.');
      return result;
    } catch (error) {
      toastService.handleError(error, 'decline invitation');
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
  
  loadProjectMembers: async (projectId) => {
    set({ collaborationLoading: true, error: null });
    try {
      // Get project to get member IDs
      const project = get().projects.find(p => p._id === projectId) || get().selectedProject;
      if (!project) {
        throw new Error('Project not found');
      }
      
      // Get member details from Firebase Auth (this would need a new backend function)
      const members = await getProjectMembersAPI(projectId, project.members);
      set({ projectMembers: members, collaborationLoading: false });
    } catch (error) {
      toastService.handleError(error, 'load project members');
      set({ error, collaborationLoading: false });
    }
  },

  // RBAC Actions
  changeUserRole: async (projectId, targetUserId, newRole) => {
    set({ collaborationLoading: true, error: null });
    try {
      const result = await changeUserRoleAPI(projectId, targetUserId, newRole);
      
      // Update local state
      set((state) => {
        const updatedProjects = state.projects.map(project => {
          if (project._id === projectId) {
            const updatedMemberRoles = { ...project.memberRoles };
            updatedMemberRoles[targetUserId] = newRole;
            return { ...project, memberRoles: updatedMemberRoles };
          }
          return project;
        });
        
        // Update userRoles for UI
        const updatedUserRoles = { ...state.userRoles };
        if (state.user && targetUserId === state.user.uid) {
          updatedUserRoles[projectId] = newRole;
        }
        
        return {
          projects: updatedProjects,
          userRoles: updatedUserRoles,
          selectedProject: state.selectedProject?._id === projectId
            ? updatedProjects.find(p => p._id === projectId)
            : state.selectedProject,
          collaborationLoading: false
        };
      });
      
      toastService.success('User role updated successfully!');
      return result;
    } catch (error) {
      toastService.handleError(error, 'change user role');
      set({ error, collaborationLoading: false });
      throw error;
    }
  },

  removeProjectMemberSecure: async (projectId, memberUserId) => {
    set({ collaborationLoading: true, error: null });
    try {
      await removeProjectMemberSecureAPI(projectId, memberUserId);
      
      // Update local state - remove member from project
      set((state) => ({
        projects: state.projects.map(project => 
          project._id === projectId 
            ? { 
                ...project, 
                members: project.members.filter(id => id !== memberUserId),
                memberRoles: Object.fromEntries(
                  Object.entries(project.memberRoles || {}).filter(([key]) => key !== memberUserId)
                )
              }
            : project
        ),
        selectedProject: state.selectedProject?._id === projectId
          ? { 
              ...state.selectedProject, 
              members: state.selectedProject.members.filter(id => id !== memberUserId),
              memberRoles: Object.fromEntries(
                Object.entries(state.selectedProject.memberRoles || {}).filter(([key]) => key !== memberUserId)
              )
            }
          : state.selectedProject,
        projectMembers: state.projectMembers.filter(member => member.uid !== memberUserId),
        collaborationLoading: false
      }));
      toastService.success('Member removed from project.');
    } catch (error) {
      toastService.handleError(error, 'remove project member');
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
}));
