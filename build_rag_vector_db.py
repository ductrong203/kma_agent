#!/usr/bin/env python3
"""
Build Traditional RAG Vector Database - Simplified Version
Không cần import từ src, tự định nghĩa hàm load documents
"""
import sys
import os
import time
import logging
import glob
import pickle
from pathlib import Path
from typing import List, Dict, Any

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_markdown_files(data_folder: str) -> List[Dict[str, Any]]:
    """Load all markdown files from data folder"""
    documents = []
    
    md_files = glob.glob(os.path.join(data_folder, "**/*.md"), recursive=True)
    
    for file_path in md_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Split into chunks (simple approach)
            chunk_size = 800
            chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
            
            for chunk_idx, chunk in enumerate(chunks):
                if chunk.strip():  # Skip empty chunks
                    documents.append({
                        'content': chunk,
                        'source': file_path,
                        'chunk_id': chunk_idx,
                        'title': os.path.basename(file_path)
                    })
        except Exception as e:
            logger.warning(f"Could not load {file_path}: {e}")
    
    return documents

def main():
    print("=" * 80)
    print("🔨 BUILD TRADITIONAL RAG - Vector Database (FAISS + BM25) - Simple Version")
    print("=" * 80)
    print()
    
    # Check if required packages are installed
    print("📦 Checking dependencies...")
    try:
        from langchain_core.documents import Document
        from langchain_community.retrievers import BM25Retriever
        from langchain_community.vectorstores import FAISS
        from langchain_ollama import OllamaEmbeddings
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print()
        print("Install required packages:")
        print("  pip install langchain langchain-core langchain-community langchain-ollama faiss-cpu rank-bm25")
        print()
        return False
    
    print("✅ Dependencies OK")
    print()
    
    # Paths
    project_root = Path(__file__).parent
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "vector_db"
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Data folder:    {data_folder}")
    print(f"📁 Output folder:  {output_folder}")
    print()
    
    # Step 1: Load documents
    print("📖 Step 1: Loading markdown files...")
    
    start_time = time.time()
    raw_docs = load_markdown_files(str(data_folder))
    load_time = time.time() - start_time
    
    if not raw_docs:
        print(f"❌ No markdown files found in {data_folder}")
        return False
    
    print(f"✅ Loaded {len(raw_docs)} document chunks in {load_time:.2f}s")
    print()
    
    # Convert to LangChain Document objects
    documents = [
        Document(
            page_content=doc['content'],
            metadata={
                'source': doc['source'],
                'chunk_id': doc['chunk_id'],
                'title': doc['title']
            }
        )
        for doc in raw_docs
    ]
    
    # Step 2: Setup embeddings
    print("🧠 Step 2: Setting up embeddings...")
    try:
        embeddings = OllamaEmbeddings(
            model="nomic-embed-text:latest",
            base_url="http://localhost:11434"
        )
        # Test embedding
        test_emb = embeddings.embed_query("test")
        print(f"✅ Ollama embeddings ready (dim: {len(test_emb)})")
    except Exception as e:
        print(f"❌ Ollama connection failed: {e}")
        print()
        print("Make sure Ollama is running:")
        print("  ollama serve")
        print()
        print("In another terminal:")
        print("  ollama pull nomic-embed-text:latest")
        print()
        return False
    
    print()
    
    # Step 3: Build FAISS vector database
    print("🔍 Step 3: Building FAISS vector database...")
    
    start_time = time.time()
    try:
        vectorstore = FAISS.from_documents(documents, embeddings)
        faiss_time = time.time() - start_time
        print(f"✅ FAISS built in {faiss_time:.2f}s")
    except Exception as e:
        print(f"❌ FAISS error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Save FAISS
    faiss_path = output_folder / "faiss_index"
    try:
        vectorstore.save_local(str(faiss_path))
        print(f"✅ FAISS saved to: {faiss_path}")
    except Exception as e:
        print(f"❌ Error saving FAISS: {e}")
        return False
    
    print()
    
    # Step 4: Build BM25 index
    print("🔎 Step 4: Building BM25 index...")
    
    start_time = time.time()
    try:
        bm25_retriever = BM25Retriever.from_documents(documents)
        bm25_time = time.time() - start_time
        print(f"✅ BM25 built in {bm25_time:.2f}s")
    except Exception as e:
        print(f"❌ BM25 error: {e}")
        return False
    
    # Save BM25
    bm25_path = output_folder / "bm25_index.pkl"
    try:
        with open(bm25_path, 'wb') as f:
            pickle.dump(bm25_retriever, f)
        print(f"✅ BM25 saved to: {bm25_path}")
    except Exception as e:
        print(f"❌ Error saving BM25: {e}")
        return False
    
    print()
    
    # Step 5: Save metadata
    print("💾 Step 5: Saving metadata...")
    
    try:
        import json
        metadata = {
            'num_documents': len(documents),
            'dimension': len(test_emb),
            'faiss_built': True,
            'bm25_built': True,
            'build_times': {
                'load': round(load_time, 2),
                'faiss': round(faiss_time, 2),
                'bm25': round(bm25_time, 2),
                'total': round(load_time + faiss_time + bm25_time, 2)
            }
        }
        metadata_path = output_folder / "vector_db_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✅ Metadata saved to: {metadata_path}")
    except Exception as e:
        logger.warning(f"Could not save metadata: {e}")
    
    print()
    print("=" * 80)
    print("✅ SUCCESS! Vector database built")
    print("=" * 80)
    print()
    print(f"FAISS:  {faiss_path}/")
    print(f"BM25:   {bm25_path}")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Cancelled")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
