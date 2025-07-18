import { create } from "zustand";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  fetchBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  fetchTasks,
  createTask,
  updateTask as updateTaskAPI,
  deleteTask,
} from "./services/api.js";
import { signIn, signUp, signInAnonymously, onAuthStateChange, logout } from "./firebase/auth";

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

  // State for Tasks (within a board/column)
  tasks: [],

  // UI State
  isSidebarOpen: JSON.parse(localStorage.getItem('taskflow-sidebar-open') ?? 'true'),
  isModalOpen: false,
  modalContent: null, // e.g., 'addProject', 'addTask', 'editBoard'

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
        selectedBoard: null,
        tasks: []
      });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },
  signInAnonymous: async () => {
    try {
      set({ authLoading: true });
      const user = await signInAnonymously();
      set({ user, isAuthenticated: true, authLoading: false });
      return user;
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      set({ error, authLoading: false });
      throw error;
    }
  },
  initAuth: () => {
    return onAuthStateChange((user) => {
      set({ user, isAuthenticated: !!user, authLoading: false });
      if (user) {
        // Auto-load projects when user is authenticated
        const { loadProjects } = get();
        loadProjects();
      }
    });
  },

  // Project Actions
  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      console.log("Store: Fetching projects from API...");
      const projects = await fetchProjects();
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
      set({ projects: projectsWithBoards, loading: false });
    } catch (error) {
      console.error("Store: Error fetching projects:", error);
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
      
      set({ loading: false });
    } catch (error) {
      console.error('Store: Error creating project:', error);
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
    } catch (error) {
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
    } catch (error) {
      set({ error, loading: false });
    }
  },
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
    set({ loading: true, error: null });
    try {
      const boards = await fetchBoards(projectId);
      // Map Firebase 'id' to '_id' for compatibility with existing components
      const boardsWithCompatibleIds = boards.map(board => ({
        ...board,
        _id: board.id,
        columns: (board.columns || []).map(column => ({
          ...column,
          _id: column.id,
          tasks: (column.tasks || []).map((task, index) => ({
            ...task,
            _id: task.id || task._id || `task-${column.id}-${index}`, // Ensure unique key
            // Convert ISO strings back to Date objects for consistent frontend handling
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            createdAt: task.createdAt ? new Date(task.createdAt) : null,
            updatedAt: task.updatedAt ? new Date(task.updatedAt) : null
          }))
        }))
      }));
      // Clear tasks when loading boards for a different project
      set({ boards: boardsWithCompatibleIds, tasks: [], loading: false });
    } catch (error) {
      set({ error, loading: false });
    }
  },
  addBoard: async (projectId, boardData) => {
    const { loadProjects, loadBoards } = get();
    set({ loading: true, error: null });
    try {
      const newBoard = await createBoard(projectId, boardData);
      console.log("Store: Board created successfully:", newBoard);
      
      // Reload boards for the current project to get the updated data with columns
      await loadBoards(projectId);
      
      // Also reload projects to update the project-level board list
      await loadProjects();
      
      set({ loading: false });
    } catch (error) {
      console.error("Store: Error creating board:", error);
      set({ error, loading: false });
      throw error; // Re-throw to handle in component
    }
  },
  updateBoard: async (projectId, boardId, boardData) => {
    set({ loading: true, error: null });
    try {
      const updatedBoard = await updateBoard(projectId, boardId, boardData);
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
    } catch (error) {
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
    } catch (error) {
      set({ error, loading: false });
    }
  },
  setSelectedBoard: (board) => {
    console.log("Store: Setting selected board and clearing tasks:", board?.name);
    
    // Validate board has required properties
    if (board && (!board._id || !board.name)) {
      console.error("Store: Invalid board data provided:", board);
      return;
    }
    
    set({ selectedBoard: board, tasks: [] });
  },
  clearTasks: () => set({ tasks: [] }),

  // Column Actions
  addColumn: async (projectId, boardId, columnData) => {
    set({ loading: true, error: null });
    try {
      const newColumn = await createColumn(projectId, boardId, columnData);
      set((state) => ({
        boards: state.boards.map((board) =>
          board._id === boardId
            ? { ...board, columns: [...board.columns, newColumn] }
            : board
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error, loading: false });
    }
  },
  updateColumn: async (projectId, boardId, columnId, columnData) => {
    set({ loading: true, error: null });
    try {
      const updatedColumn = await updateColumn(
        projectId,
        boardId,
        columnId,
        columnData
      );
      set((state) => ({
        boards: state.boards.map((board) =>
          board._id === boardId
            ? {
                ...board,
                columns: board.columns.map((column) =>
                  column._id === updatedColumn._id ? updatedColumn : column
                ),
              }
            : board
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error, loading: false });
    }
  },
  deleteColumn: async (projectId, boardId, columnId) => {
    set({ loading: true, error: null });
    try {
      await deleteColumn(projectId, boardId, columnId);
      set((state) => ({
        boards: state.boards.map((board) =>
          board._id === boardId
            ? {
                ...board,
                columns: board.columns.filter(
                  (column) => column._id !== columnId
                ),
              }
            : board
        ),
        loading: false,
      }));
    } catch (error) {
      set({ error, loading: false });
    }
  },

  // Task Actions
  loadTasks: async (projectId, boardId, columnId) => {
    set({ loading: true, error: null });
    try {
      const tasks = await fetchTasks(projectId, boardId, columnId);
      // Apply proper date conversion - backend now returns ISO strings
      const tasksWithConvertedDates = tasks.map(task => ({
        ...task,
        _id: task.id || task._id,
        // Convert ISO strings back to Date objects
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        createdAt: task.createdAt ? new Date(task.createdAt) : null,
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : null
      }));
      set({ tasks: tasksWithConvertedDates, loading: false });
    } catch (error) {
      set({ error, loading: false });
    }
  },
  addTask: async (projectId, boardId, columnId, taskData) => {
    set({ loading: true, error: null });
    try {
      const newTask = await createTask(projectId, boardId, columnId, taskData);
      
      // Firebase functions now return ISO strings for dates, convert to Date objects
      const normalizedTask = {
        ...newTask,
        _id: newTask.id,
        // Convert ISO strings back to Date objects for consistent frontend handling
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
        createdAt: newTask.createdAt ? new Date(newTask.createdAt) : null,
        updatedAt: newTask.updatedAt ? new Date(newTask.updatedAt) : null
      };
      
      console.log("Store: Task created successfully:", normalizedTask);
      
      set((state) => ({
        tasks: [...state.tasks, normalizedTask],
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
    } catch (error) {
      console.error("Store: Error creating task:", error);
      set({ error, loading: false });
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
      // 1. Call the API to update the task on the backend
      const updatedTask = await updateTaskAPI(
        projectId,
        boardId,
        columnId,
        taskId,
        { ...taskData, column: columnId }
      );

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
          (c) => c._id === updatedTask.column
        );

        if (newColumn) {
          const normalizedTask = {
            ...updatedTask,
            _id: updatedTask.id,
            // Convert ISO strings back to Date objects for consistent frontend handling
            createdAt: updatedTask.createdAt ? new Date(updatedTask.createdAt) : null,
            updatedAt: updatedTask.updatedAt ? new Date(updatedTask.updatedAt) : null,
            dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate) : null
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
          tasks: state.tasks.map((t) =>
            t._id === updatedTask._id ? updatedTask : t
          ),
          loading: false,
        };
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      set({ error, loading: false });
    }
  },
  deleteTask: async (projectId, boardId, columnId, taskId) => {
    set({ loading: true, error: null });
    try {
      await deleteTask(taskId);
      set((state) => ({
        tasks: state.tasks.filter((task) => task._id !== taskId),
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
    } catch (error) {
      set({ error, loading: false });
    }
  },
  moveTask: async (taskId, destColumnId, projectId, boardId) => {
    const state = get();
    let taskToMove = null;
    let sourceColumnId = null;

    // Find the task in the current board's columns
    const currentBoard = state.boards.find((board) => board._id === boardId) || state.selectedBoard;
    if (!currentBoard) {
      console.error('Board not found for moveTask');
      return;
    }

    // Find the task in the board's columns
    for (const column of currentBoard.columns) {
      const foundTask = column.tasks?.find((task) => task._id === taskId);
      if (foundTask) {
        taskToMove = foundTask;
        sourceColumnId = column._id;
        break;
      }
    }

    if (!taskToMove) {
      console.error('Task not found for moveTask:', taskId);
      return;
    }

    // Optimistic update - Update state immediately
    set((state) => {
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
              tasks: [...(column.tasks || []), { ...taskToMove, column: destColumnId }]
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
      // Update task on backend
      await updateTaskAPI(projectId, boardId, sourceColumnId, taskId, {
        column: destColumnId
      });
    } catch (error) {
      console.error('Failed to move task:', error);
      set({ error });
      
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
}));
