#!/usr/bin/env python3
"""
Build Traditional RAG Vector Database (FAISS + BM25) - Reusing Existing Retriever
Sử dụng MetadataEnhancedHybridRetriever và table-aware chunking có sẵn
"""
import sys
import os
import time
import pickle
from pathlib import Path

# Add api to path for proper imports
project_root = Path(__file__).parent
api_path = project_root / "api"
sys.path.insert(0, str(api_path))

def main():
    print("=" * 80)
    print("🔨 BUILD TRADITIONAL RAG - FAISS + BM25 Vector Database")
    print("=" * 80)
    print()
    
    try:
        from src.rag.table_aware_chunking import load_documents_from_folder
        from langchain_community.retrievers import BM25Retriever
        from langchain_community.vectorstores import FAISS
        from langchain_ollama import OllamaEmbeddings
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print()
        print("Install dependencies:")
        print("  pip install langchain langchain-core langchain-community langchain-ollama faiss-cpu rank-bm25")
        return False
    
    # Paths
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "vector_db"
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Data folder:    {data_folder}")
    print(f"📁 Output folder:  {output_folder}")
    print()
    
    # Load documents using table-aware chunking
    print("📖 Loading documents (table-aware chunking)...")
    print("   - Chunk size: 800")
    print("   - Chunk overlap: 200")
    print()
    
    start_time = time.time()
    try:
        documents = load_documents_from_folder(
            data_folder=str(data_folder),
            chunk_size=800,
            chunk_overlap=200
        )
    except Exception as e:
        print(f"❌ Error loading: {e}")
        return False
    
    load_time = time.time() - start_time
    
    if not documents:
        print(f"❌ No documents found")
        return False
    
    print(f"✅ Loaded {len(documents)} chunks in {load_time:.2f}s")
    
    # Count table chunks
    table_chunks = sum(1 for doc in documents if doc.metadata.get('contains_table', False))
    if table_chunks > 0:
        print(f"   📊 Tables: {table_chunks}")
        print(f"   📝 Text:   {len(documents) - table_chunks}")
    print()
    
    # Setup embeddings
    print("🧠 Setting up Ollama embeddings...")
    try:
        embeddings = OllamaEmbeddings(
            model="nomic-embed-text:latest",
            base_url="http://localhost:11434"
        )
        test_emb = embeddings.embed_query("test")
        print(f"✅ Ollama OK (dim: {len(test_emb)})")
    except Exception as e:
        print(f"❌ Ollama error: {e}")
        print()
        print("Make sure Ollama is running:")
        print("  ollama serve")
        print()
        print("And pull embedding model:")
        print("  ollama pull nomic-embed-text")
        return False
    
    print()
    
    # Build FAISS vector database
    print("🔍 Building FAISS vector database...")
    
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
        print(f"✅ Saved: {faiss_path}/")
    except Exception as e:
        print(f"❌ Error saving FAISS: {e}")
        return False
    
    print()
    
    # Build BM25 index
    print("🔎 Building BM25 index...")
    
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
        print(f"✅ Saved: {bm25_path}")
    except Exception as e:
        print(f"❌ Error saving BM25: {e}")
        return False
    
    print()
    
    # Save metadata
    print("💾 Saving metadata...")
    
    try:
        import json
        metadata = {
            'num_documents': len(documents),
            'embedding_dimension': len(test_emb),
            'embedding_model': 'nomic-embed-text',
            'faiss_built': True,
            'bm25_built': True,
            'build_times': {
                'load': round(load_time, 2),
                'faiss': round(faiss_time, 2),
                'bm25': round(bm25_time, 2),
                'total': round(load_time + faiss_time + bm25_time, 2)
            },
            'config': {
                'chunk_size': 800,
                'chunk_overlap': 200,
                'ollama_url': 'http://localhost:11434'
            }
        }
        metadata_path = output_folder / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✅ Metadata saved: {metadata_path}")
    except Exception as e:
        print(f"⚠️  Could not save metadata: {e}")
    
    print()
    print("=" * 80)
    print("✅ SUCCESS! Vector database built")
    print("=" * 80)
    print()
    print("📊 Summary:")
    print(f"   Documents:  {len(documents)}")
    print(f"   Dimension:  {len(test_emb)}")
    print(f"   FAISS:      {faiss_path}/")
    print(f"   BM25:       {bm25_path}")
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
        print(f"❌ Fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
