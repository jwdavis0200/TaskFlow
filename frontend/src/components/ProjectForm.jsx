import React, { useState } from "react";
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
  LoadingSpinner
} from "./common/FormComponents";


const ProjectForm = ({ project, onClose }) => {
  const addProject = useStore((state) => state.addProject);
  const updateProject = useStore((state) => state.updateProject);
  
  const [formData, setFormData] = useState({
    name: project?.name || ""
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  );
};

export default ProjectForm;