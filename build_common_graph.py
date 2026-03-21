#!/usr/bin/env python3
"""
Build Common Document Graph - Using Existing GraphBuilder
Sử dụng DocumentGraph builder có sẵn với cấu hình table-aware chunking
"""
import sys
import os
import time
from pathlib import Path

# Add src to path
project_root = Path(__file__).parent
src_path = project_root / "api" / "src"
sys.path.insert(0, str(src_path))

def main():
    print("=" * 80)
    print("🔨 BUILD COMMON DOCUMENT GRAPH")
    print("=" * 80)
    print()
    
    try:
        from rag.table_aware_chunking import load_documents_from_folder
        from graph_rag.graph_builder import DocumentGraph
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print()
        print("Install dependencies:")
        print("  pip install langchain langchain-core langchain-ollama networkx numpy scikit-learn")
        return False
    
    # Paths
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "document_graph"
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Data folder:    {data_folder}")
    print(f"📁 Output folder:  {output_folder}")
    print()
    
    # Load documents using table-aware chunking
    print("📖 Loading documents (table-aware chunking)...")
    print("   - Chunk size: 800")
    print("   - Chunk overlap: 200")
    print("   - Table preservation: ✓")
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
    
    # Build graph using existing DocumentGraph builder
    print("🔗 Building graph (DocumentGraph)...")
    print("   - semantic_threshold=0.7")
    print("   - max_edges/node=5")
    print("   - Edges: structural + metadata + semantic")
    print()
    
    start_time = time.time()
    try:
        graph_builder = DocumentGraph(
            semantic_threshold=0.7,
            max_semantic_edges_per_node=5
        )
        graph = graph_builder.build_graph(documents)
    except Exception as e:
        print(f"❌ Error building graph: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    build_time = time.time() - start_time
    
    print(f"✅ Graph built in {build_time:.2f}s")
    print(f"   📊 Nodes:  {graph.number_of_nodes()}")
    print(f"   🔗 Edges:  {graph.number_of_edges()}")
    print()
    
    # Save graph
    print("💾 Saving graph...")
    graph_path = output_folder / "graph.pkl"
    
    try:
        graph_builder.save_graph(str(graph_path))
        print(f"✅ Graph saved: {graph_path}")
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
            'build_time_seconds': round(build_time, 2),
            'total_time_seconds': round(load_time + build_time, 2),
            'config': {
                'semantic_threshold': 0.7,
                'max_edges_per_node': 5,
                'chunk_size': 800,
                'chunk_overlap': 200
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
    print("✅ SUCCESS! Document graph built using DocumentGraph builder")
    print("=" * 80)
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
