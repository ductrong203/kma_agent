#!/usr/bin/env python3
"""
Build Department-Specific Graphs - Using Existing DepartmentGraphManager
Sử dụng DepartmentGraphManager builder có sẵn
"""
import sys
import os
import time
from pathlib import Path

# Add api to path for proper imports
project_root = Path(__file__).parent
api_path = project_root / "api"
sys.path.insert(0, str(api_path))

def main():
    print("=" * 80)
    print("🏢 BUILD DEPARTMENT-SPECIFIC GRAPHS")
    print("=" * 80)
    print()
    
    try:
        from src.rag.table_aware_chunking import load_documents_from_folder
        from src.graph_rag.department_graph_manager import DepartmentGraphManager
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print()
        print("Install dependencies:")
        print("  pip install langchain langchain-core langchain-ollama networkx numpy scikit-learn")
        return False
    
    # Paths
    project_root = Path(__file__).parent
    data_folder = project_root / "api" / "data"
    output_folder = project_root / "api" / "graphs" / "department_graphs"
    output_folder.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Data folder:    {data_folder}")
    print(f"📁 Output folder:  {output_folder}")
    print()
    
    # Load all documents
    print("📖 Loading ALL documents (table-aware chunking)...")
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
    
    # Initialize DepartmentGraphManager
    print("🏢 Analyzing documents by department...")
    dept_manager = DepartmentGraphManager(str(output_folder))
    
    # Analyze distribution
    dept_counts = {}
    for doc in documents:
        source_path = doc.metadata.get('full_path', doc.metadata.get('source', ''))
        dept = dept_manager.detect_department_from_path(source_path)
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
    
    print()
    for dept, count in sorted(dept_counts.items()):
        print(f"   📁 {dept:40} {count:4} chunks")
    print()
    
    # Build department graphs using existing manager
    print("🔗 Building department-specific graphs...")
    print("   - semantic_threshold=0.7")
    print("   - max_edges/node=7")
    print("   - Louvain community detection")
    print()
    
    start_time = time.time()
    try:
        department_stats = dept_manager.build_department_graphs(documents)
    except Exception as e:
        print(f"❌ Error building graphs: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    build_time = time.time() - start_time
    
    print(f"✅ Department graphs built in {build_time:.2f}s")
    print()
    
    # Get statistics
    print("📊 Summary:")
    final_stats = dept_manager.get_department_stats()
    
    total_nodes = 0
    total_edges = 0
    total_communities = 0
    
    for dept, stat in sorted(final_stats.items()):
        print(f"   {dept:40} nodes:{stat['nodes']:4} edges:{stat['edges']:5} communities:{stat['communities']:2}")
        total_nodes += stat['nodes']
        total_edges += stat['edges']
        total_communities += stat['communities']
    
    print()
    print(f"   Total:                               nodes:{total_nodes:4} edges:{total_edges:5} communities:{total_communities:2}")
    print()
    
    print("=" * 80)
    print("✅ SUCCESS! Department graphs built")
    print("=" * 80)
    print()
    print(f"Output: {output_folder}")
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
