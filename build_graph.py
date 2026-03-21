#!/usr/bin/env python3
"""
Build Document Graph - Xây dựng graph từ documents
Sử dụng existing DocumentGraph builder
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
    print("🔨 BUILD DOCUMENT GRAPH")
    print("=" * 80)
    print()
    
    # Import here after path is set
    from rag.table_aware_chunking import load_documents_from_folder
    from graph_rag.graph_builder import DocumentGraph
    
    # Paths
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "document_graph"
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
        print(f"   📊 Table chunks:  {table_chunks}")
        print(f"   📝 Text chunks:   {len(documents) - table_chunks}")
    print()
    
    # Step 2: Build graph
    print("🔗 Step 2: Building document graph...")
    print("   - Semantic threshold: 0.7")
    print("   - Max edges/node: 5")
    print("   - Embeddings: Ollama (nomic-embed-text)")
    print()
    
    start_time = time.time()
    try:
        graph_builder = DocumentGraph(
            semantic_threshold=0.7,
            max_semantic_edges_per_node=5
        )
        graph = graph_builder.build_graph(documents)
    except Exception as e:
        logger.error(f"❌ Error building graph: {e}")
        print(f"❌ Error building graph: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    graph_build_time = time.time() - start_time
    
    print(f"✅ Graph built in {graph_build_time:.2f}s")
    print(f"   📊 Nodes:  {graph.number_of_nodes()}")
    print(f"   🔗 Edges:  {graph.number_of_edges()}")
    print(f"   📈 Density: {(2 * graph.number_of_edges() / (graph.number_of_nodes() * (graph.number_of_nodes() - 1)) if graph.number_of_nodes() > 1 else 0):.4f}")
    print()
    
    # Step 3: Save graph
    print("💾 Step 3: Saving graph...")
    graph_path = output_folder / "graph.pkl"
    
    try:
        graph_builder.save_graph(str(graph_path))
        print(f"✅ Graph saved to: {graph_path}")
    except Exception as e:
        logger.error(f"❌ Error saving graph: {e}")
        print(f"❌ Error saving graph: {e}")
        return False
    
    # Save metadata
    metadata_path = output_folder / "graph_metadata.json"
    try:
        import json
        metadata = {
            'num_documents': len(documents),
            'num_nodes': graph.number_of_nodes(),
            'num_edges': graph.number_of_edges(),
            'semantic_threshold': 0.7,
            'max_edges_per_node': 5,
            'table_chunks': table_chunks,
            'build_time_seconds': round(graph_build_time, 2),
            'total_time_seconds': round(load_time + graph_build_time, 2)
        }
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"✅ Metadata saved to: {metadata_path}")
    except Exception as e:
        logger.warning(f"⚠️  Could not save metadata: {e}")
    
    print()
    print("=" * 80)
    print("✅ SUCCESS! Document graph built successfully")
    print("=" * 80)
    print()
    print("📊 Summary:")
    print(f"   - Documents: {len(documents)}")
    print(f"   - Graph nodes: {graph.number_of_nodes()}")
    print(f"   - Graph edges: {graph.number_of_edges()}")
    print(f"   - Build time: {graph_build_time:.2f}s")
    print(f"   - Output: {graph_path}")
    print()
    print("🔗 Next steps:")
    print("   1. Run: python build_rag_vector_db.py  (build traditional RAG)")
    print("   2. Run: python test_rag_quick.py       (test the RAG system)")
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
