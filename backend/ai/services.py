from django.utils import timezone
from django.db.models import Count, Avg, Q, F
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import ChatSession, ChatMessage, AIReportJob
from .constants import SYSTEM_PROMPTS, INTENT_CLASSIFICATION_PROMPT, BLOCKED_PATTERNS
from .utils import generate, estimate_tokens
import re

User = get_user_model()

def detect_language(text):
    """Simple Amharic detection via Unicode Ethiopic range (U+1200–U+137F)."""
    ethiopic_chars = len(re.findall(r'[\u1200-\u137F]', text))
    ratio = ethiopic_chars / max(len(text), 1)
    return 'am' if ratio > 0.3 else 'en'

def classify_intent(message):
    try:
        prompt = INTENT_CLASSIFICATION_PROMPT.format(message=message[:300])
        result = generate(prompt, {'temperature': 0.1, 'max_new_tokens': 20})
        text = result['text'].upper().strip()
        text = re.sub(r'[^A-Z_]', '', text)
        
        valid_intents = [
            'CASE_STATUS', 'HEARING_INFO', 'FILING_HELP', 
            'LEGAL_PROCEDURE', 'PAYMENT_ASSISTANCE', 
            'ACCOUNT_HELP', 'GREETING', 'GENERAL_SUPPORT'
        ]
        return text if text in valid_intents else 'GENERAL_SUPPORT'
    except:
        return 'GENERAL_SUPPORT'

def generate_llm_response(message, user, history=None):
    if history is None:
        history = []
        
    lang = detect_language(message)
    intent = classify_intent(message)
    
    import time
    start_time = time.time()
    
    try:
        from ai.agents.case_agent import process_with_agent
        
        # Format history for the agent
        formatted_history = []
        for msg in history[-10:]: # Pass more history to the agent if needed
            formatted_history.append({'role': msg['role'], 'content': msg['content']})
            
        result = process_with_agent(message, formatted_history, user)
        
        return {
            'content': result['content'],
            'intent': intent,
            'language': lang,
            'model': result['model'],
            'latency_ms': int((time.time() - start_time) * 1000)
        }
    except Exception as e:
        # Fallback response with detailed logging
        import traceback
        error_details = traceback.format_exc()
        print(f"[AI] Agent failed: {str(e)}\n{error_details}")
        
        return {
            'content': "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later or contact support if the issue persists.",
            'intent': intent,
            'language': lang,
            'error': f"{str(e)}: {error_details[:200]}...",
            'latency_ms': int((time.time() - start_time) * 1000)
        }

@transaction.atomic
def process_chat_message(session_id, user, message_text):
    session = ChatSession.objects.get(id=session_id)
    if session.status != 'OPEN':
        raise ValueError("Chat session is closed.")
        
    # Save user message
    ChatMessage.objects.create(
        session=session,
        role='USER',
        content=message_text
    )
    
    # Get history
    history_objs = session.messages.all().order_by('created_at')
    history = [{'role': m.role, 'content': m.content} for m in history_objs]
    
    # Generate response
    response = generate_llm_response(message_text, user, history)
    
    # Save assistant message
    assistant_msg = ChatMessage.objects.create(
        session=session,
        role='ASSISTANT',
        content=response['content'],
        tokens=estimate_tokens(response['content']),
        metadata={
            'intent': response.get('intent'),
            'language': response.get('language'),
            'model': response.get('model'),
            'latency_ms': response.get('latency_ms'),
            'error': response.get('error')
        }
    )
    
    # Update session title if default
    if session.title == 'New conversation':
        session.title = message_text[:80]
    
    session.last_message_at = timezone.now()
    session.last_message_at = timezone.now()
    session.save()
    
    return assistant_msg

def process_public_chat_message(message_text):
    """
    Process a message from an unauthenticated user on the public landing page.
    Restricts the prompt to general answers and does not save to DB.
    """
    lang = detect_language(message_text)
    intent = classify_intent(message_text)
    
    import time
    start_time = time.time()
    
    # Custom public prompt wrapper
    system_instruction = "You are a JusticeHub assistant for the public landing page. Answer general questions about the system, its features, and basic legal terms. DO NOT provide legal advice or ask for case specifics. Keep it brief and friendly."
    
    # We construct a simple prompt
    prompt = f"System: {system_instruction}\n\nUser: {message_text}"
    
    try:
        result = generate(prompt, {'temperature': 0.3})
        return {
            'content': result['text'],
            'intent': intent,
            'language': lang,
            'latency_ms': int((time.time() - start_time) * 1000)
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[AI] Public Agent failed: {str(e)}\n{error_details}")
        
        return {
            'content': "I'm currently unable to answer questions. Please try again later.",
            'error': str(e)
        }

# --- Report Generation Logic (Justice Hub Models) ---

from cases.models import Case, CaseCategory
from hearings.models import Hearing

def get_case_load_summary(filters=None):
    """Summarize cases by status and category."""
    query = Case.objects.all()
    if filters and filters.get('category_id'):
        query = query.filter(category_id=filters['category_id'])
        
    status_counts = query.values('status').annotate(count=Count('id'))
    category_counts = query.values('category__name').annotate(count=Count('id'))
    
    return {
        'total_cases': query.count(),
        'by_status': {row['status']: row['count'] for row in status_counts},
        'by_category': {row['category__name']: row['count'] for row in category_counts}
    }

def get_hearing_efficiency(filters=None):
    """Analyze hearing performance."""
    # This requires looking at cases and their first hearings
    # For simplicity, let's just count hearings by status for now
    hearings = Hearing.objects.all()
    status_counts = hearings.values('status').annotate(count=Count('id'))
    
    return {
        'total_hearings': hearings.count(),
        'by_status': {row['status']: row['count'] for row in status_counts},
    }

def run_report_job(job_id):
    job = AIReportJob.objects.get(id=job_id)
    try:
        report_type = job.type
        filters = job.filters or {}
        
        if report_type == 'CASE_LOAD_SUMMARY':
            result = get_case_load_summary(filters)
        elif report_type == 'HEARING_EFFICIENCY':
            result = get_hearing_efficiency(filters)
        else:
            raise ValueError(f"Unsupported report type: {report_type}")
            
        job.status = 'COMPLETED'
        job.result = result
        job.completed_at = timezone.now()
        job.save()
        
    except Exception as e:
        job.status = 'FAILED'
        job.error_message = str(e)
        job.completed_at = timezone.now()
        job.save()
