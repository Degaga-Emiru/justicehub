from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from django.conf import settings

def get_vector_store():
    # In production, use persistent storage or a proper DB like PGVector
    persist_directory = os.path.join(settings.BASE_DIR, 'ai', 'rag', 'chroma_db')
    
    # Use Google embeddings since the user has a Google API key
    api_key = os.getenv('OPENAI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001", 
        google_api_key=api_key
    ) 
    
    return Chroma(
        collection_name="legal_knowledge",
        embedding_function=embeddings,
        persist_directory=persist_directory
    )

def get_retriever():
    vectorstore = get_vector_store()
    return vectorstore.as_retriever(search_kwargs={"k": 3})

def search_knowledge_base(query: str) -> str:
    """Wrapper for the LangChain tool to call the retriever."""
    try:
        retriever = get_retriever()
        docs = retriever.invoke(query)
        
        if not docs:
            return "No relevant legal information found in the knowledge base."
            
        return "\n\n".join([f"Source: {doc.metadata.get('source', 'Unknown')}\n{doc.page_content}" for doc in docs])
    except Exception as e:
        # Graceful fallback if Chroma/OpenAI is not configured yet
        return f"Knowledge base is currently unavailable. Error: {str(e)}"
