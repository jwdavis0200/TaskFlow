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
} from "./common/FormComponents";
import LoadingSpinner from "./common/LoadingSpinner";



const BoardForm = ({ board, projectId, onClose }) => {
  const addBoard = useStore((state) => state.addBoard);
  const updateBoard = useStore((state) => state.updateBoard);
  const loadProjects = useStore((state) => state.loadProjects);
  
  const [formData, setFormData] = useState({
    name: board?.name || ""
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Board name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Board name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Board name must be less than 50 characters";
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
      const boardData = {
        name: formData.name.trim(),
        description: `Board: ${formData.name.trim()}`
      };

      if (board) {
        // Update existing board
        await updateBoard(projectId, board._id, boardData);
      } else {
        // Create new board
        await addBoard(projectId, boardData);
      }

      // Reload projects to get updated data
      await loadProjects();
      onClose();
    } catch (error) {
      console.error("Error saving board:", error);
      setErrors({ 
        submit: error.message || "Failed to save board. Please try again." 
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <FormContainer>
      <FormHeader>
        <FormTitle>{board ? "Edit Board" : "Create New Board"}</FormTitle>
      </FormHeader>

      <FormBody onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name">Board Name *</Label>
          <Input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Enter board name"
            className={errors.name ? "error" : ""}
            maxLength={50}
          />
          {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
        </FormGroup>

        <div style={{ 
          background: "#f0f8ff", 
          border: "1px solid #cce7ff", 
          borderRadius: "8px", 
          padding: "12px", 
          marginBottom: "16px",
          fontSize: "14px",
          color: "#0066cc"
        }}>
          <strong>Default Columns:</strong> Your board will be created with "To Do", "In Progress", and "Done" columns.
        </div>

        {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}

        <FormActions>
          <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoadingSpinner />}
            {isSubmitting 
              ? "Saving..." 
              : board 
                ? "Update Board" 
                : "Create Board"
            }
          </PrimaryButton>
        </FormActions>
      </FormBody>
    </FormContainer>
  );
};

export default BoardForm;