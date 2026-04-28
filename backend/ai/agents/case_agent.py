from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from ai.agents.tools import get_tools
import os

# Note: For tool-calling to work reliably, you should use a model that explicitly 
# supports OpenAI's tool-calling format (e.g., gpt-4o-mini, gpt-3.5-turbo, or Claude 3).
# If you use a HuggingFace model via the HF router, ensure it is a tool-calling capable model 
# (like mistralai/Mistral-7B-Instruct-v0.3 or meta-llama/Meta-Llama-3-70B-Instruct).

from langchain_google_genai import ChatGoogleGenerativeAI

def get_llm():
    import os
    
    # 1. Check for Google Gemini (Prioritize since Groq has strict rate limits)
    openai_key = os.getenv('OPENAI_API_KEY')
    google_key = os.getenv('GOOGLE_API_KEY') or (openai_key if openai_key and openai_key.startswith('AIza') else None)
    if google_key and os.getenv('USE_HF_FOR_AGENT') != 'true':
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview", # Updated to the latest available model
            temperature=0.7,
            api_key=google_key
        )
        
    # 2. Check for OpenAI (GPT-4o-mini)
    if openai_key and not openai_key.startswith('AIza'):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        
    # 3. Check for Groq (Llama-3.3-70b)
    groq_key = os.getenv('GROQ_API_KEY')
    if groq_key:
        from langchain_groq import ChatGroq
        return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.7)
    
    # 4. Fallback to the HuggingFace configuration from ai.utils
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=os.getenv('HF_MODEL_ID', "mistralai/Mistral-7B-Instruct-v0.3"), # v0.3 supports tools better
        api_key=os.getenv('HF_API_KEY', 'dummy-key'), 
        base_url='https://router.huggingface.co/v1',
        max_tokens=400,
        temperature=0.7
    )

# System prompt defining the persona and instructions
system_prompt = """You are a helpful AI assistant for the JusticeHub legal system.
Your job is to assist users with their legal cases and provide general legal information.

You have access to tools that can:
1. Fetch the status of a specific legal case.
2. Create a new Case Action Request (a task/deadline for a case).
3. Search the legal knowledge base for general legal questions.

Guidelines:
- ALWAYS use the `fetch_case_status_tool` if the user asks about the status of a specific case (e.g., JH-2026-001).
- ALWAYS use the `create_case_action_tool` if the user wants to add an action or deadline to a case. If they don't provide a due date, that's okay, it's optional.
- ALWAYS use the `search_legal_knowledge_base_tool` for general questions about the law, procedures, or requirements.
- Be concise and professional. Do not hallucinate case details.
- If a case does not exist based on the tool's response, inform the user politely.
"""

def get_agent_executor(user=None):
    from ai.constants import SYSTEM_PROMPTS
    
    user_role = user.role if user and hasattr(user, 'role') else 'default'
    role_prompt = SYSTEM_PROMPTS.get(user_role.lower(), SYSTEM_PROMPTS.get('default', system_prompt))
    
    full_prompt = role_prompt + "\n\n" + """You have access to tools that can:
1. Fetch the status of a specific legal case.
2. Create a new Case Action Request (a task/deadline for a case).
3. Search the knowledge base for legal questions AND system usage instructions (e.g., how to login, how to file a case).

Guidelines:
- ALWAYS use the `fetch_case_status_tool` if the user asks about the status of a specific case (e.g., JH-2026-001).
- ALWAYS use the `create_case_action_tool` if the user wants to add an action or deadline to a case. If they don't provide a due date, that's okay, it's optional.
- ALWAYS use the `search_legal_knowledge_base_tool` for general questions about the law, procedures, or how to use this software system.
- Be concise and professional. Do not hallucinate case details or system instructions.
- If a case does not exist based on the tool's response, inform the user politely.
"""

    return create_react_agent(
        model=get_llm(),
        tools=get_tools(user),
        prompt=SystemMessage(content=full_prompt)
    )

def process_with_agent(message: str, history_messages: list, user=None) -> dict:
    """
    Process a user message using the LangGraph agent.
    `history_messages` should be a list of dicts: [{'role': 'USER'/'ASSISTANT', 'content': '...'}]
    """
    agent_executor = get_agent_executor(user)
    
    # Convert dict history to LangChain message objects
    lc_messages = []
    for msg in history_messages:
        if msg['role'].upper() == 'USER':
            lc_messages.append(HumanMessage(content=msg['content']))
        elif msg['role'].upper() == 'ASSISTANT':
            lc_messages.append(AIMessage(content=msg['content']))
            
    # Append the new user message
    lc_messages.append(HumanMessage(content=message))
    
    # Run the agent
    response = agent_executor.invoke({"messages": lc_messages})
    
    # The last message in the response state is the AI's final answer
    ai_message = response["messages"][-1]
    
    # Normalize content (Gemini sometimes returns a list of dicts)
    content = ai_message.content
    if isinstance(content, list):
        # Extract text from list of content blocks
        text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in content]
        content = "".join(text_parts)
    
    llm = get_llm()
    model_name = getattr(llm, 'model_name', getattr(llm, 'model', 'unknown'))
    
    return {
        "content": content,
        "model": model_name
    }
