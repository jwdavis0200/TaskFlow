# Project-Board Hierarchy System - Technical Specification

## Overview
Implementation of a hierarchical project-board system with nested navigation, optimized data fetching, and RESTful API architecture for TaskFlow Pro.

## Backend Implementation

### 1. Database Model Updates

#### Project Model Enhancement
**File**: [`backend/src/models/Project.js`](backend/src/models/Project.js)

```javascript
const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide project name"],
    maxlength: 50,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  owner: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  members: [{
    type: mongoose.Types.ObjectId,
    ref: "User",
  }],
  // NEW: Virtual population for boards array
  boards: [{
    type: mongoose.Types.ObjectId,
    ref: "Board",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual populate for boards
ProjectSchema.virtual('boardsList', {
  ref: 'Board',
  localField: '_id',
  foreignField: 'project'
});

ProjectSchema.set('toJSON', { virtuals: true });
ProjectSchema.set('toObject', { virtuals: true });
```

### 2. API Route Enhancements

#### Projects Routes Update
**File**: [`backend/src/routes/projects.js`](backend/src/routes/projects.js)

**Enhanced GET /projects endpoint:**
```javascript
// GET all projects with populated boards
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find()
      .populate({
        path: 'boardsList',
        select: 'name createdAt'
      });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

**New GET /projects/:id/boards endpoint:**
```javascript
// GET boards for a specific project
router.get("/:id/boards", async (req, res) => {
  try {
    const { id: projectId } = req.params;
    
    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Fetch boards with populated columns and tasks
    const boards = await Board.find({ project: projectId })
      .populate({
        path: 'columns',
        populate: {
          path: 'tasks',
          model: 'Task'
        }
      });

    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

#### Board Creation Enhancement
**File**: [`backend/src/routes/boards.js`](backend/src/routes/boards.js)

```javascript
// Enhanced CREATE board with Project.boards array update
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const board = new Board({
      name: req.body.name,
      project: req.body.projectId,
    });

    const newBoard = await board.save({ session });

    // Create default columns
    const defaultColumns = [
      { name: "To Do", board: newBoard._id },
      { name: "In Progress", board: newBoard._id },
      { name: "Done", board: newBoard._id },
    ];

    const createdColumns = await Column.insertMany(defaultColumns, { session });
    newBoard.columns = createdColumns.map((col) => col._id);
    await newBoard.save({ session });

    // Update Project.boards array
    await Project.findByIdAndUpdate(
      req.body.projectId,
      { $push: { boards: newBoard._id } },
      { session }
    );

    await session.commitTransaction();

    const populatedBoard = await Board.findById(newBoard._id).populate("columns");
    res.status(201).json(populatedBoard);
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
});
```

## Frontend Implementation

### 1. Component Architecture

#### Sidebar Component Hierarchy
**File**: `frontend/src/components/Sidebar.jsx` (NEW)

```javascript
import React from 'react';
import styled from '@emotion/styled';
import ProjectsList from './ProjectsList';

const SidebarContainer = styled.div`
  width: 280px;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  overflow-y: auto;
  z-index: 1000;
  transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease-in-out;
`;

const Sidebar = ({ isOpen }) => {
  return (
    <SidebarContainer isOpen={isOpen}>
      <ProjectsList />
    </SidebarContainer>
  );
};

export default Sidebar;
```

#### ProjectsList Component
**File**: `frontend/src/components/ProjectsList.jsx` (NEW)

```javascript
import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';
import BoardsList from './BoardsList';

const ProjectsContainer = styled.div`
  padding: 20px;
`;

const ProjectItem = styled.div`
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
`;

const ProjectHeader = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => props.isSelected ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const ProjectsList = () => {
  const { 
    projects, 
    selectedProject, 
    loadProjects, 
    setSelectedProject,
    loadProjectBoards 
  } = useStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectClick = async (project) => {
    setSelectedProject(project);
    await loadProjectBoards(project._id);
  };

  return (
    <ProjectsContainer>
      <h2>Projects</h2>
      {projects.map(project => (
        <ProjectItem key={project._id}>
          <ProjectHeader 
            isSelected={selectedProject?._id === project._id}
            onClick={() => handleProjectClick(project)}
          >
            <span>{project.name}</span>
            <span>({project.boardsList?.length || 0})</span>
          </ProjectHeader>
          {selectedProject?._id === project._id && (
            <BoardsList projectId={project._id} />
          )}
        </ProjectItem>
      ))}
    </ProjectsContainer>
  );
};

export default ProjectsList;
```

#### BoardsList Component
**File**: `frontend/src/components/BoardsList.jsx` (NEW)

```javascript
import React from 'react';
import styled from '@emotion/styled';
import { useStore } from '../store';

const BoardsContainer = styled.div`
  padding-left: 16px;
  background: rgba(0, 0, 0, 0.1);
`;

const BoardItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 4px 0;
  background: ${props => props.isSelected ? 'rgba(255, 255, 255, 0.3)' : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const BoardsList = ({ projectId }) => {
  const { 
    projectBoards, 
    selectedBoard, 
    setSelectedBoard,
    loading 
  } = useStore();

  const handleBoardClick = (board) => {
    setSelectedBoard(board);
  };

  if (loading) {
    return (
      <BoardsContainer>
        <div>Loading boards...</div>
      </BoardsContainer>
    );
  }

  return (
    <BoardsContainer>
      {projectBoards.map(board => (
        <BoardItem
          key={board._id}
          isSelected={selectedBoard?._id === board._id}
          onClick={() => handleBoardClick(board)}
        >
          {board.name}
        </BoardItem>
      ))}
    </BoardsContainer>
  );
};

export default BoardsList;
```

### 2. State Management Updates

#### Enhanced Store.js
**File**: [`frontend/src/store.js`](frontend/src/store.js)

**New state properties:**
```javascript
export const useStore = create((set, get) => ({
  // Existing state...
  
  // Enhanced project state
  projects: [],
  selectedProject: null,
  currentProject: null, // Currently active project
  
  // Enhanced board state
  boards: [], // All boards (legacy)
  projectBoards: [], // Boards for current project
  selectedBoard: null,
  currentBoard: null, // Currently active board
  
  // Enhanced UI state
  isSidebarOpen: true,
  sidebarMode: 'projects', // 'projects' | 'boards'
}));
```

**New actions:**
```javascript
// Enhanced project actions
loadProjectsWithBoards: async () => {
  set({ loading: true, error: null });
  try {
    const projects = await fetchProjectsWithBoards();
    set({ projects, loading: false });
  } catch (error) {
    set({ error, loading: false });
  }
},

loadProjectBoards: async (projectId) => {
  set({ loading: true, error: null });
  try {
    const boards = await fetchProjectBoards(projectId);
    set({ projectBoards: boards, loading: false });
  } catch (error) {
    set({ error, loading: false });
  }
},

setCurrentProject: (project) => {
  set({ 
    currentProject: project,
    selectedProject: project,
    currentBoard: null,
    selectedBoard: null 
  });
},

setCurrentBoard: (board) => {
  set({ 
    currentBoard: board,
    selectedBoard: board 
  });
},
```

### 3. API Service Enhancements

#### Updated API Methods
**File**: [`frontend/src/services/api.js`](frontend/src/services/api.js)

```javascript
// Enhanced Projects API
export const fetchProjectsWithBoards = async () => {
  const response = await api.get("/projects");
  return response.data;
};

export const fetchProjectBoards = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/boards`);
  return response.data;
};

// Optimized board fetching
export const fetchBoardsOptimized = async (projectId) => {
  if (projectId) {
    return fetchProjectBoards(projectId);
  }
  // Fallback to all boards
  const response = await api.get("/boards");
  return response.data;
};
```

## Architecture Patterns

### 1. RESTful Route Structure
```
GET    /api/projects                     # All projects with board counts
GET    /api/projects/:id                 # Single project details
GET    /api/projects/:id/boards          # Boards for specific project
POST   /api/projects                     # Create new project
PATCH  /api/projects/:id                 # Update project
DELETE /api/projects/:id                 # Delete project

GET    /api/boards                       # All boards (legacy support)
GET    /api/boards/:id                   # Single board with columns/tasks
POST   /api/boards                       # Create board (updates project.boards)
PATCH  /api/boards/:id                   # Update board
DELETE /api/boards/:id                   # Delete board (removes from project.boards)
```

### 2. Virtual Population Strategy
- Use Mongoose virtual population for `Project.boardsList`
- Maintain backward compatibility with existing `boards` array
- Optimize queries with selective field population

### 3. Optimistic UI Updates
```javascript
// Example: Board selection with optimistic update
const handleBoardSelect = async (board) => {
  // Immediate UI update
  setSelectedBoard(board);
  setCurrentBoard(board);
  
  try {
    // Background data sync
    await loadBoardDetails(board._id);
  } catch (error) {
    // Revert on failure
    setSelectedBoard(null);
    setCurrentBoard(null);
    setError(error);
  }
};
```

### 4. State Management Strategy
- **projects**: All available projects with board metadata
- **currentProject**: Active project for navigation context
- **selectedProject**: UI selection state
- **projectBoards**: Boards belonging to current project
- **currentBoard**: Active board for Kanban display
- **selectedBoard**: UI selection state

## Implementation Order

### Phase 1: Backend Foundation
1. Update [`Project.js`](backend/src/models/Project.js) model with virtual population
2. Enhance [`projects.js`](backend/src/routes/projects.js) routes
3. Update [`boards.js`](backend/src/routes/boards.js) creation logic

### Phase 2: Frontend State Layer
1. Update [`store.js`](frontend/src/store.js) with new state structure
2. Enhance [`api.js`](frontend/src/services/api.js) service methods
3. Test state management integration

### Phase 3: UI Components
1. Create [`Sidebar.jsx`](frontend/src/components/Sidebar.jsx) component
2. Implement [`ProjectsList.jsx`](frontend/src/components/ProjectsList.jsx)
3. Build [`BoardsList.jsx`](frontend/src/components/BoardsList.jsx)
4. Integrate with existing [`KanbanBoard.jsx`](frontend/src/components/KanbanBoard.jsx)

### Phase 4: Integration & Testing
1. Update main [`App.jsx`](frontend/src/App.jsx) layout
2. Test nested navigation flows
3. Verify optimistic update patterns
4. Performance optimization

## Success Criteria
- Projects display with board counts in sidebar
- Clicking project expands board list
- Board selection loads Kanban interface
- Optimistic updates provide responsive UI
- RESTful API maintains data consistency
- Backward compatibility preserved