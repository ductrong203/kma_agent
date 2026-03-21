#!/usr/bin/env python3
"""
Build Document Graph - Simplified Version
Không cần import từ src, tự định nghĩa hàm load documents
"""
import sys
import os
import time
import logging
import glob
import re
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
    print("🔨 BUILD DOCUMENT GRAPH - Simple Version")
    print("=" * 80)
    print()
    
    # Check if langchain is installed
    print("📦 Checking dependencies...")
    try:
        from langchain_core.documents import Document
        from langchain_ollama import OllamaEmbeddings
        import networkx as nx
        import numpy as np
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print()
        print("Install required packages:")
        print("  pip install langchain langchain-core langchain-ollama networkx numpy scikit-learn")
        print()
        return False
    
    print("✅ Dependencies OK")
    print()
    
    # Paths
    project_root = Path(__file__).parent
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "document_graph"
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
    
    # Step 3: Build simple graph
    print("🔗 Step 3: Building document graph...")
    print("   - Computing embeddings...")
    
    start_time = time.time()
    
    # Compute embeddings for all documents
    texts = [doc.page_content for doc in documents]
    embeddings_list = []
    
    batch_size = 10
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        batch_embs = embeddings.embed_documents(batch)
        embeddings_list.extend(batch_embs)
        if (i + batch_size) % 50 == 0:
            print(f"      Embedded {min(i+batch_size, len(texts))}/{len(texts)}")
    
    embeddings_array = np.array(embeddings_list).astype('float32')
    
    print(f"   - Building graph structure...")
    
    # Create simple graph
    import networkx as nx
    graph = nx.Graph()
    
    # Add nodes
    for i, doc in enumerate(documents):
        graph.add_node(i, content=doc.page_content, metadata=doc.metadata)
    
    # Add edges based on similarity (simplified - only top-k neighbors)
    similarities = cosine_similarity(embeddings_array)
    
    threshold = 0.7
    for i in range(len(documents)):
        for j in range(i+1, len(documents)):
            if similarities[i][j] >= threshold:
                graph.add_edge(i, j, weight=float(similarities[i][j]))
    
    graph_build_time = time.time() - start_time
    
    print(f"✅ Graph built in {graph_build_time:.2f}s")
    print(f"   📊 Nodes:  {graph.number_of_nodes()}")
    print(f"   🔗 Edges:  {graph.number_of_edges()}")
    print()
    
    # Step 4: Save graph
    print("💾 Step 4: Saving graph...")
    
    import pickle
    graph_path = output_folder / "graph.pkl"
    
    try:
        with open(graph_path, 'wb') as f:
            pickle.dump({'graph': graph, 'embeddings': embeddings_array, 'documents': documents}, f)
        print(f"✅ Graph saved to: {graph_path}")
    except Exception as e:
        print(f"❌ Error saving: {e}")
        return False
    
    # Save metadata
    try:
        import json
        metadata = {
            'num_documents': len(documents),
            'num_nodes': graph.number_of_nodes(),
            'num_edges': graph.number_of_edges(),
            'build_time_seconds': round(graph_build_time, 2),
            'total_time_seconds': round(load_time + graph_build_time, 2)
        }
        metadata_path = output_folder / "graph_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✅ Metadata saved to: {metadata_path}")
    except Exception as e:
        logger.warning(f"Could not save metadata: {e}")
    
    print()
    print("=" * 80)
    print("✅ SUCCESS! Document graph built")
    print("=" * 80)
    print()
    print(f"Output: {graph_path}")
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
