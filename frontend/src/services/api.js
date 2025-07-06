import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Assuming token is stored in localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Projects API
export const fetchProjects = async () => {
  const response = await api.get("/projects");
  return response.data;
};

export const fetchProjectsWithBoards = async () => {
  const response = await api.get("/projects");
  const projects = response.data;
  
  // Fetch boards for each project
  const projectsWithBoards = await Promise.all(
    projects.map(async (project) => {
      try {
        const boards = await fetchBoards(project._id);
        return { ...project, boards };
      } catch (error) {
        console.error(`Error fetching boards for project ${project._id}:`, error);
        return { ...project, boards: [] };
      }
    })
  );
  
  return projectsWithBoards;
};

export const createProject = async (projectData) => {
  const response = await api.post("/projects", projectData);
  return response.data;
};

export const updateProject = async (projectId, projectData) => {
  const response = await api.put(`/projects/${projectId}`, projectData);
  return response.data;
};

export const deleteProject = async (projectId) => {
  console.log('API: Deleting project:', projectId);
  try {
    const response = await api.delete(`/projects/${projectId}`);
    console.log('API: Project deletion response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Error deleting project:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete project');
  }
};

// Boards API
export const fetchBoards = async (projectId) => {
  console.log("API: Fetching boards for projectId:", projectId);
  const response = await api.get(`/boards`);
  console.log("API: All boards from server:", response.data);
  const filteredBoards = response.data.filter(
    (board) => board.project === projectId
  );
  console.log("API: Filtered boards:", filteredBoards);
  return filteredBoards;
};

export const createBoard = async (projectId, boardData) => {
  console.log('API: Creating board with data:', { projectId, boardData });
  try {
    const response = await api.post(`/boards`, { ...boardData, projectId });
    console.log('API: Board creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Error creating board:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to create board');
  }
};

export const updateBoard = async (projectId, boardId, boardData) => {
  const response = await api.patch(`/boards/${boardId}`, boardData);
  return response.data;
};

export const deleteBoard = async (projectId, boardId) => {
  console.log('API: Deleting board:', { projectId, boardId });
  try {
    const response = await api.delete(`/boards/${boardId}`);
    console.log('API: Board deletion response:', response.data);
    return response.data;
  } catch (error) {
    console.error('API: Error deleting board:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete board');
  }
};

// Columns API
export const createColumn = async (projectId, boardId, columnData) => {
  const response = await api.post(
    `/projects/${projectId}/boards/${boardId}/columns`,
    columnData
  );
  return response.data;
};

export const updateColumn = async (
  projectId,
  boardId,
  columnId,
  columnData
) => {
  const response = await api.put(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}`,
    columnData
  );
  return response.data;
};

export const deleteColumn = async (projectId, boardId, columnId) => {
  const response = await api.delete(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}`
  );
  return response.data;
};

// Tasks API
export const fetchTasks = async (projectId, boardId, columnId) => {
  const response = await api.get(
    `/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
  );
  return response.data;
};

export const createTask = async (projectId, boardId, columnId, taskData) => {
  const response = await api.post(
    `/tasks`,
    {
      ...taskData,
      projectId,
      boardId,
      columnId
    }
  );
  return response.data;
};

export const updateTask = async (
  projectId,
  boardId,
  columnId,
  taskId,
  taskData
) => {
  const response = await api.patch(`/tasks/${taskId}`, taskData);
  return response.data;
};

export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

// Push Notifications API
export const registerPushSubscription = async (subscription) => {
  const response = await api.post("/subscribe", subscription);
  return response.data;
};

export default api;
