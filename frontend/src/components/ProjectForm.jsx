import { useState } from "react";
import { useStore } from "../store";
import {
  FormContainer,
  FormHeader,
  FormTitle,
  FormBody,
  FormGroup,
  Label,
  Input,
  FormActions,
  PrimaryButton,
  SecondaryButton,
  ErrorMessage,
  Button
} from "./common/FormComponents";
import LoadingSpinner from "./common/LoadingSpinner";
import ProjectMembersModal from './ProjectMembersModal';


const ProjectForm = ({ project, onClose }) => {
  const addProject = useStore((state) => state.addProject);
  const updateProject = useStore((state) => state.updateProject);
  
  const [formData, setFormData] = useState({
    name: project?.name || ""
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Project name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Project name must be less than 50 characters";
    }
    
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: `Project: ${formData.name.trim()}`
      };

      if (project) {
        // Update existing project
        await updateProject(project._id, projectData);
      } else {
        // Create new project
        await addProject(projectData);
      }

      onClose();
    } catch (error) {
      console.error("Error saving project:", error);
      setErrors({ 
        submit: error.message || "Failed to save project. Please try again." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FormContainer>
        <FormHeader>
          <FormTitle>{project ? "Edit Project" : "Create New Project"}</FormTitle>
        </FormHeader>

        <FormBody onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter project name"
              className={errors.name ? "error" : ""}
              maxLength={50}
            />
            {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
          </FormGroup>

          {project && (
            <FormGroup>
              <Label>Project Members</Label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                padding: '10px 0'
              }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  {project.members?.length || 1} member{(project.members?.length || 1) !== 1 ? 's' : ''}
                </span>
                <Button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '0.85rem',
                    background: '#6c757d',
                    color: 'white'
                  }}
                >
                  Manage Members
                </Button>
              </div>
            </FormGroup>
          )}

          {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}

          <FormActions>
            <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner />}
              {isSubmitting 
                ? "Saving..." 
                : project 
                  ? "Update Project" 
                  : "Create Project"
              }
            </PrimaryButton>
          </FormActions>
        </FormBody>
      </FormContainer>
      
      {showMembersModal && project && (
        <ProjectMembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          project={project}
        />
      )}
    </>
  );
};

export default ProjectForm;