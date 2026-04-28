from pydantic import BaseModel, Field
from typing import Optional

class CreateActionSchema(BaseModel):
    """Schema for creating a new Case Action Request."""
    case_number: str = Field(..., description="The unique case file number, e.g., JH-2026-001")
    action_description: str = Field(..., description="Clear description of the requested action or task")
    due_date: Optional[str] = Field(None, description="Due date for the action in YYYY-MM-DD format. Only provide if explicitly requested.")

class FetchCaseStatusSchema(BaseModel):
    """Schema for fetching the status of a specific case."""
    case_number: str = Field(..., description="The unique case file number, e.g., JH-2026-001")

class LegalSearchSchema(BaseModel):
    """Schema for searching the legal knowledge base."""
    query: str = Field(..., description="The semantic search query about legal procedures, laws, or guidelines.")
