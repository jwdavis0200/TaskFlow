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
  inviteUserToProjectAPI,
  removeProjectMemberAPI,
  getMyInvitationsAPI,
  acceptProjectInvitationAPI,
  getProjectMembersAPI,
  changeUserRoleAPI,
  removeProjectMemberSecureAPI,
} from "./services/api.js";
import { signIn, signUp, onAuthStateChange, logout, clearAnonymousSessions } from "./firebase/auth";

// Helper function to format column name for display
const formatColumnForDisplay = (columnName) => {
  return columnName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
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

  // State for Tasks (within a board/column)
  tasks: [],

  // Collaboration state
  projectMembers: [], // Current project member details
  invitations: [], // User's pending invitations
  collaborationLoading: false,
  
  // RBAC state
  userRoles: {}, // Map of projectId -> user's role in that project
  projectPermissions: {}, // Map of projectId -> user's permissions in that project

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
  initAuth: () => {
    // Clear any existing anonymous sessions first
    clearAnonymousSessions();
    
    return onAuthStateChange((user) => {
      // Only authenticate non-anonymous users
      if (user && !user.isAnonymous) {
        set({ user, isAuthenticated: true, authLoading: false });
        // Auto-load projects when user is authenticated
        const { loadProjects } = get();
        loadProjects();
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
      const { user } = get();
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
      const boardsWithCompatibleIds = boards.map(board => {
        // Map columns with _id and preserve their existing tasks
        const columnsWithIds = (board.columns || []).map(column => ({
          ...column,
          _id: column.id,
          // Normalize tasks and keep them in their current column
          tasks: (column.tasks || []).map((task, index) => ({
            ...task,
            _id: task.id || task._id || `task-${column.id}-${index}`,
            // Convert ISO strings back to Date objects for consistent frontend handling
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            createdAt: task.createdAt ? new Date(task.createdAt) : null,
            updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
            column: column.id
          }))
        }));

        return {
          ...board,
          _id: board.id,
          columns: columnsWithIds
        };
      });
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
        taskData
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
          (c) => c._id === updatedTask.columnId
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

    // Find the task in the boards array first (primary source of truth)
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

    // If not found in boards array, try selectedBoard as fallback
    if (!taskToMove && state.selectedBoard && state.selectedBoard._id === boardId) {
      for (const column of state.selectedBoard.columns) {
        const foundTask = column.tasks?.find((task) => task._id === taskId);
        if (foundTask) {
          taskToMove = foundTask;
          sourceColumnId = column._id;
          break;
        }
      }
    }

    if (!taskToMove) {
      console.error('Task not found for moveTask:', { taskId, boardId, availableBoards: state.boards.map(b => b._id) });
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
      // Update task on backend with column only
      await updateTaskAPI(projectId, boardId, sourceColumnId, taskId, {
        columnId: destColumnId
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

  // RBAC Helper Functions (UI optimization only - server enforces security)
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
    return role === 'owner' || role === 'admin' || role === 'editor';
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
      return result;
    } catch (error) {
      console.error('Store: Error inviting user:', error);
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
  
  removeProjectMember: async (projectId, memberUserId) => {
    set({ collaborationLoading: true, error: null });
    try {
      await removeProjectMemberAPI(projectId, memberUserId);
      
      // Update local state - remove member from current project
      set((state) => ({
        projects: state.projects.map(project => 
          project._id === projectId 
            ? { ...project, members: project.members.filter(id => id !== memberUserId) }
            : project
        ),
        selectedProject: state.selectedProject?._id === projectId
          ? { 
              ...state.selectedProject, 
              members: state.selectedProject.members.filter(id => id !== memberUserId)
            }
          : state.selectedProject,
        projectMembers: state.projectMembers.filter(member => member.uid !== memberUserId),
        collaborationLoading: false
      }));
    } catch (error) {
      console.error('Store: Error removing member:', error);
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
      console.error('Store: Error loading invitations:', error);
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
      
      return result;
    } catch (error) {
      console.error('Store: Error accepting invitation:', error);
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
      console.error('Store: Error loading project members:', error);
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
      
      return result;
    } catch (error) {
      console.error('Store: Error changing user role:', error);
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
    } catch (error) {
      console.error('Store: Error removing member (secure):', error);
      set({ error, collaborationLoading: false });
      throw error;
    }
  },
}));
