#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test imports to debug the issue"""
import sys
import os
import io
import traceback
from pathlib import Path

# Force UTF-8 encoding for stdout on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

project_root = Path(__file__).parent
api_path = project_root / "api"

print(f"Project root: {project_root}")
print(f"API path: {api_path}")
print(f"sys.path before: {sys.path[:3]}")

sys.path.insert(0, str(project_root))
print(f"sys.path after: {sys.path[:3]}")

try:
    print("\n1. Trying to import api.src.rag.table_aware_chunking...")
    from api.src.rag.table_aware_chunking import load_documents_from_folder
    print("   ✓ Success!")
except Exception as e:
    print(f"   ✗ Failed: {type(e).__name__}: {e}")
    traceback.print_exc()

try:
    print("\n2. Trying to import api.src.graph_rag.graph_builder...")
    from api.src.graph_rag.graph_builder import DocumentGraph
    print("   ✓ Success!")
except Exception as e:
    print(f"   ✗ Failed: {type(e).__name__}: {e}")
    traceback.print_exc()

print("\nDone!")
