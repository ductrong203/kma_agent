#!/usr/bin/env python3
"""
Build Traditional RAG Vector Database (FAISS + BM25)
Xây dựng vector database cho Traditional RAG (keyword + similarity search)
"""
import sys
import os
import time
import logging
from pathlib import Path

# Add src to path
project_root = Path(__file__).parent
src_path = project_root / "api" / "src"
sys.path.insert(0, str(src_path))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    print("=" * 80)
    print("🔨 BUILD TRADITIONAL RAG - VECTOR DATABASE (FAISS + BM25)")
    print("=" * 80)
    print()
    
    # Import here after path is set
    from rag.table_aware_chunking import load_documents_from_folder
    from langchain_community.retrievers import BM25Retriever
    from langchain_community.vectorstores import FAISS
    from langchain_ollama import OllamaEmbeddings
    import pickle
    
    # Paths
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "vector_db"
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Data folder:    {data_folder}")
    print(f"📁 Output folder:  {output_folder}")
    print()
    
    # Step 1: Load documents
    print("📖 Step 1: Loading documents with table-aware chunking...")
    print("   - Chunk size: 800")
    print("   - Chunk overlap: 200")
    print("   - Table preservation: ✓ Enabled")
    print()
    
    start_time = time.time()
    try:
        documents = load_documents_from_folder(
            data_folder=str(data_folder),
            chunk_size=800,
            chunk_overlap=200
        )
    except Exception as e:
        logger.error(f"❌ Error loading documents: {e}")
        print(f"❌ Error loading documents: {e}")
        return False
    
    load_time = time.time() - start_time
    
    if not documents:
        print("❌ No documents loaded!")
        return False
    
    print(f"✅ Loaded {len(documents)} document chunks in {load_time:.2f}s")
    
    # Count special chunks
    table_chunks = sum(1 for doc in documents if doc.metadata.get('contains_table', False))
    if table_chunks > 0:
        print(f"   📊 Table chunks: {table_chunks}")
        print(f"   📝 Text chunks: {len(documents) - table_chunks}")
    print()
    
    # Step 2: Setup embeddings
    print("🧠 Step 2: Setting up embeddings...")
    print("   - Model: Ollama (nomic-embed-text)")
    print("   - URL: http://localhost:11434")
    print()
    
    try:
        embeddings = OllamaEmbeddings(
            model="nomic-embed-text:latest",
            base_url="http://localhost:11434"
        )
        # Test embedding
        test_embedding = embeddings.embed_query("test")
        print(f"✅ Embeddings ready (dimension: {len(test_embedding)})")
    except Exception as e:
        logger.error(f"❌ Error setting up embeddings: {e}")
        print(f"❌ Error setting up embeddings: {e}")
        print("   Try running: ollama pull nomic-embed-text")
        return False
    
    print()
    
    # Step 3: Build FAISS vector database
    print("🔍 Step 3: Building FAISS vector database...")
    print("   - Method: Similarity search with embeddings")
    print("   - Building vectors for all documents...")
    print()
    
    start_time = time.time()
    try:
        vectorstore = FAISS.from_documents(
            documents,
            embeddings,
            metadatas=[doc.metadata for doc in documents]
        )
        faiss_time = time.time() - start_time
        print(f"✅ FAISS index built in {faiss_time:.2f}s")
    except Exception as e:
        logger.error(f"❌ Error building FAISS: {e}")
        print(f"❌ Error building FAISS: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Save FAISS
    faiss_path = output_folder / "faiss_index"
    try:
        vectorstore.save_local(str(faiss_path))
        print(f"✅ FAISS saved to: {faiss_path}")
    except Exception as e:
        logger.error(f"❌ Error saving FAISS: {e}")
        print(f"❌ Error saving FAISS: {e}")
        return False
    
    print()
    
    # Step 4: Build BM25 index
    print("🔎 Step 4: Building BM25 index...")
    print("   - Method: Keyword-based retrieval")
    print("   - Building BM25 index for all documents...")
    print()
    
    start_time = time.time()
    try:
        bm25_retriever = BM25Retriever.from_documents(documents)
        bm25_time = time.time() - start_time
        print(f"✅ BM25 index built in {bm25_time:.2f}s")
    except Exception as e:
        logger.error(f"❌ Error building BM25: {e}")
        print(f"❌ Error building BM25: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Save BM25
    bm25_path = output_folder / "bm25_index.pkl"
    try:
        with open(bm25_path, 'wb') as f:
            pickle.dump(bm25_retriever, f)
        print(f"✅ BM25 saved to: {bm25_path}")
    except Exception as e:
        logger.error(f"❌ Error saving BM25: {e}")
        print(f"❌ Error saving BM25: {e}")
        return False
    
    print()
    
    # Step 5: Save metadata
    print("💾 Step 5: Saving metadata...")
    
    try:
        import json
        metadata = {
            'num_documents': len(documents),
            'faiss_dimension': len(test_embedding),
            'table_chunks': table_chunks,
            'embedding_model': 'nomic-embed-text',
            'bm25_built': True,
            'faiss_built': True,
            'build_time_seconds': {
                'documents_load': round(load_time, 2),
                'faiss_build': round(faiss_time, 2),
                'bm25_build': round(bm25_time, 2),
                'total': round(load_time + faiss_time + bm25_time, 2)
            }
        }
        
        metadata_path = output_folder / "vector_db_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✅ Metadata saved to: {metadata_path}")
    except Exception as e:
        logger.warning(f"⚠️  Could not save metadata: {e}")
    
    print()
    print("=" * 80)
    print("✅ SUCCESS! Traditional RAG Vector Database built successfully")
    print("=" * 80)
    print()
    print("📊 Summary:")
    print(f"   - Documents: {len(documents)}")
    print(f"   - FAISS dimension: {len(test_embedding)}")
    print(f"   - Table chunks: {table_chunks}")
    print(f"   - Total build time: {round(load_time + faiss_time + bm25_time, 2)}s")
    print()
    print("📁 Output files:")
    print(f"   - FAISS index: {faiss_path}/")
    print(f"   - BM25 index: {bm25_path}")
    print(f"   - Metadata: {metadata_path}")
    print()
    print("🎯 What's been created:")
    print("   - ✅ FAISS: Vector similarity search")
    print("   - ✅ BM25: Keyword-based retrieval")
    print("   - ✅ Hybrid RAG: Combines both methods")
    print()
    print("🔗 Next steps:")
    print("   1. Run: python test_rag_quick.py    (test the RAG system)")
    print("   2. Run: python test_rag_comparison.py (compare with GraphRAG)")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
