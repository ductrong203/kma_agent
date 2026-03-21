# Build Scripts - Quick Guide

## 2 Standalone Scripts để Build Graph và RAG Vector DB

### 1️⃣ **build_graph.py** - Build Document Graph

```bash
python build_graph.py
```

**Làm gì:**

- 📖 Load documents từ `api/data/` (table-aware chunking)
- 🔗 Build document graph với 3 loại edges:
  - Structural edges (cùng file)
  - Metadata edges (cùng category)
  - Semantic edges (similarity)
- 💾 Save graph tới `api/graphs/document_graph/graph.pkl`

**Output:**

- `graph.pkl` - Saved graph object
- `graph_metadata.json` - Statistics

**Thời gian:** ~5-10 phút (tùy vào số documents)

---

### 2️⃣ **build_rag_vector_db.py** - Build Traditional RAG (Vector DB)

```bash
python build_rag_vector_db.py
```

**Làm gì:**

- 📖 Load documents từ `api/data/` (table-aware chunking)
- 🧠 Setup Ollama embeddings (nomic-embed-text)
- 🔍 Build **FAISS** vector database (similarity search)
- 🔎 Build **BM25** index (keyword search)
- 💾 Save cả hai tới `api/graphs/vector_db/`

**Output:**

- `faiss_index/` - FAISS vector database
- `bm25_index.pkl` - BM25 keyword index
- `vector_db_metadata.json` - Statistics

**Thời gian:** ~3-8 phút (tùy vào số documents)

---

## 🚀 Quick Start

### Step 1: Build Graph

```bash
python build_graph.py
```

Expected output:

```
✅ Loaded 500 document chunks in 2.34s
✅ Graph built in 120.45s
   📊 Nodes:  500
   🔗 Edges:  2534
   📁 Output: api/graphs/document_graph/graph.pkl
```

### Step 2: Build Vector DB

```bash
python build_rag_vector_db.py
```

Expected output:

```
✅ Loaded 500 document chunks in 2.34s
✅ FAISS index built in 45.32s
✅ BM25 index built in 3.21s
   📁 Output: api/graphs/vector_db/
```

### Step 3: Test

```bash
cd api
python test_rag_quick.py
```

---

## 📊 Điểm khác biệt giữa 2 systems

| Aspect             | Document Graph             | Traditional RAG                     |
| ------------------ | -------------------------- | ----------------------------------- |
| **Type**           | Knowledge graph            | Vector database                     |
| **Search**         | Graph traversal + semantic | FAISS (similarity) + BM25 (keyword) |
| **Build time**     | Lâu hơn (10+ min)          | Nhanh hơn (5-8 min)                 |
| **Memory**         | Cao (graph object)         | Trung bình                          |
| **Query strategy** | Department-aware routing   | Hybrid search                       |
| **Output**         | `graph.pkl`                | `faiss_index/` + `bm25_index.pkl`   |

---

## ⚙️ Requirements

### Python packages (auto từ requirements.txt):

- langchain>=0.3.22
- langchain-ollama>=0.3.0
- faiss-cpu>=1.10.0
- rank-bm25>=0.2.2
- pandas>=2.3.0

### External:

- **Ollama** running locally (for embeddings)
  ```bash
  ollama serve
  # In another terminal:
  ollama pull nomic-embed-text
  ```

---

## 🔧 Troubleshooting

### ❌ "Ollama connection refused"

```bash
# Check Ollama is running
ollama serve

# In another terminal, pull the embedding model
ollama pull nomic-embed-text
```

### ❌ "No documents loaded"

Check that `api/data/` folder contains markdown files:

```bash
ls api/data/              # Should show folders like: default/, phongdaotao/, etc
ls api/data/default/      # Should show markdown files
```

### ❌ "Permission denied"

Make scripts executable:

```bash
chmod +x build_graph.py
chmod +x build_rag_vector_db.py
```

### ❌ "Out of memory"

- Reduce chunk size in the script (default: 800)
- Or reduce the number of documents to process

---

## 📁 File Structure After Build

```
api/graphs/
├── document_graph/
│   ├── graph.pkl              ← DocumentGraph object
│   ├── graph_metadata.json    ← Stats
│   └── embeddings/            ← Cached embeddings
│
└── vector_db/
    ├── faiss_index/           ← FAISS database
    │   ├── index.faiss
    │   └── index.pkl
    ├── bm25_index.pkl         ← BM25 index
    └── vector_db_metadata.json
```

---

## 📝 Next Steps

After building both:

1. **Test individual retriever:**

   ```bash
   cd api
   python test_rag_quick.py
   ```

2. **Compare Graph vs Traditional RAG:**

   ```bash
   python test_rag_comparison.py
   ```

3. **Use in your application:**
   ```python
   from src.rag.retriever import MetadataEnhancedHybridRetriever
   # Load FAISS + BM25 for hybrid retrieval
   ```

---

## 💡 Tips

- Chạy `build_graph.py` trước, có thể mất lâu lần đầu
- Lần chạy thứ 2 sẽ nhanh hơn (cache embeddings)
- FAISS không cần retrain, chỉ cần load documents
- BM25 rất nhanh, có thể build lại nhiều lần

---

**Created:** 2026-03-21  
**Status:** ✅ Ready to use
