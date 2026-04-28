from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from ai.rag.retriever import get_vector_store
import os

def index_document(file_path: str):
    """
    Utility script to index a text document into the Chroma vector store.
    Run this manually when you have new legal documents to add to the knowledge base.
    """
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return
        
    loader = TextLoader(file_path)
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    splits = text_splitter.split_documents(documents)
    
    vectorstore = get_vector_store()
    vectorstore.add_documents(documents=splits)
    print(f"Successfully indexed {len(splits)} chunks from {file_path}.")

if __name__ == "__main__":
    # Example usage: python -m ai.rag.indexer path/to/legal_code.txt
    import sys
    if len(sys.argv) > 1:
        index_document(sys.argv[1])
    else:
        print("Please provide a file path to index.")
