from langchain_core.tools import tool
from ai.schemas import CreateActionSchema, FetchCaseStatusSchema, LegalSearchSchema
from cases.models import Case, CaseActionRequest
from django.utils import timezone
from datetime import datetime
from ai.rag.retriever import search_knowledge_base

def get_tools(user=None):

    @tool(args_schema=CreateActionSchema)
    def create_case_action_tool(case_number: str, action_description: str, due_date: str = None) -> str:
        """Creates a new action request for a specific legal case."""
        try:
            case = Case.objects.get(file_number=case_number)
            
            # Role-based access control for creating actions
            if user and not user.is_anonymous:
                if user.role == 'CITIZEN':
                    return f"Error: Citizens are not authorized to create case actions. Please contact the registrar."
                elif user.role == 'JUDGE':
                    # Check if judge is assigned
                    if not case.judge_assignments.filter(judge=user, is_active=True).exists():
                        return f"Error: You are not assigned to this case."
            else:
                return "Error: Authentication required to create actions."

            parsed_date = None
            if due_date:
                try:
                    parsed_date = datetime.strptime(due_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    return f"Error: Invalid date format {due_date}. Please use YYYY-MM-DD."

            action = CaseActionRequest.objects.create(
                case=case,
                action_description=action_description,
                due_date=parsed_date,
                requester=user
            )
            return f"Successfully created action (ID: {action.id}) for case {case_number}. Action: '{action_description}'"
        except Case.DoesNotExist:
            return f"Error: Case {case_number} not found. Please verify the case number."
        except Exception as e:
            return f"Failed to create action: {str(e)}"

    @tool(args_schema=FetchCaseStatusSchema)
    def fetch_case_status_tool(case_number: str) -> str:
        """Fetches the current status of a specific legal case."""
        try:
            case = Case.objects.get(file_number=case_number)
            
            # Role-based access control for viewing status
            if user and not user.is_anonymous:
                if user.role == 'CITIZEN':
                    if case.plaintiff_id != user.id and case.defendant_id != user.id:
                        return f"Error: You do not have permission to view this case."
            
            return f"Case {case_number} ({case.title}) is currently in status: {case.get_status_display()}."
        except Case.DoesNotExist:
            return f"Error: Case {case_number} not found."
        except Exception as e:
            return f"Failed to fetch case status: {str(e)}"

    @tool(args_schema=LegalSearchSchema)
    def search_legal_knowledge_base_tool(query: str) -> str:
        """Searches the legal knowledge base for procedures, laws, or guidelines. Use this for general legal questions."""
        try:
            return search_knowledge_base(query)
        except Exception as e:
            return f"Error searching knowledge base: {str(e)}"

    return [create_case_action_tool, fetch_case_status_tool, search_legal_knowledge_base_tool]
