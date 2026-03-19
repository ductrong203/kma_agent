# LMA Agent - Chatbot Platform

A modern, production-ready chatbot platform built with FastAPI, React 18, PostgreSQL, and Docker. Featuring AI-powered conversations, document processing, and knowledge graph integration.

## 🚀 Features

- **AI-Powered Conversations**: Integration with OpenAI, Google Generative AI, and local Ollama models
- **Document Processing**: Support for PDF, DOCX, and various document formats
- **Vector Database**: FAISS-based semantic search with embeddings
- **Knowledge Graphs**: Department-specific knowledge organization
- **Real-time Updates**: WebSocket support for live conversations
- **Multi-department Support**: Organized data for different departments
- **Admin Dashboard**: User and system management interface
- **RESTful API**: Complete API documentation with OpenAPI/Swagger
- **Responsive UI**: Modern React frontend with Tailwind CSS
- **Database**: PostgreSQL with async support for high performance

## 📋 Requirements

### System Requirements

- Docker & Docker Compose (v1.29+)
- 8GB RAM minimum
- 20GB disk space (for ML models and data)
- Windows 10/11 (WSL2), Linux, or macOS

### API Keys

- OpenAI API Key (for GPT models)
- Google API Key (for Gemini models)
- Optional: Ollama (local LLM)

## 🏗️ Project Structure

```
lma_agent/
├── api/                           # Backend (FastAPI)
│   ├── src/
│   │   ├── backend/              # Core API endpoints
│   │   ├── agent/                # AI agent logic
│   │   ├── graph_rag/            # Graph-based RAG
│   │   ├── rag/                  # RAG implementations
│   │   └── llm/                  # LLM integrations
│   ├── data/
│   │   ├── department_graphs/    # Knowledge graphs
│   │   ├── default/              # Default data
│   │   ├── phongdaotao/          # Department data
│   │   └── vector_db/            # FAISS indices
│   ├── requirements.txt
│   └── Dockerfile
├── client/                         # Frontend (React)
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── services/             # API services
│   │   └── utils/                # Utilities
│   ├── public/                   # Static assets
│   ├── package.json
│   └── Dockerfile
├── config/
│   ├── nginx/                    # Nginx config
│   └── database/                 # DB migrations
├── scripts/                       # Utility scripts
├── docker-compose.yml             # Main compose config
├── docker-compose.dev.yml         # Dev overrides
├── docker-compose.prod.yml        # Prod overrides
├── Makefile                       # Make commands
├── start.bat / start.sh           # Startup scripts
├── stop.bat / stop.sh             # Shutdown scripts
└── .env.example                   # Environment template
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API keys
# nano .env  (or use your editor)
```

### 2. Start Services

**Windows:**

```bash
start.bat
```

**Linux/macOS:**

```bash
chmod +x start.sh stop.sh
./start.sh
```

**Using Docker Compose:**

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

**Using Make:**

```bash
make up
```

### 3. Access Services

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432

### 4. Stop Services

**Windows:**

```bash
stop.bat
```

**Linux/macOS:**

```bash
./stop.sh
```

**Using Make:**

```bash
make down
```

## 🔧 Development

### Backend Development

```bash
# Install dependencies
cd api
pip install -r requirements.txt

# Run locally with hot reload
make shell-api
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000

# Format code
make format

# Lint code
make lint

# Run tests
make test
```

### Frontend Development

```bash
# Install dependencies
cd client
npm install

# Run development server
npm start

# Build production
npm run build
```

### Database

```bash
# Connect to PostgreSQL
make shell-db

# Run migrations
docker-compose exec api alembic upgrade head
```

## 🐳 Docker Commands

```bash
# View logs
make logs

# See running containers
make ps

# Get API status
make status

# Clean everything (remove containers and volumes)
make clean

# Rebuild images
make build

# Production setup
make prod-up
```

## 📦 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_NAME=lma_chatbot
DB_USER=lma_user
DB_PASSWORD=your_secure_password

# API Keys
OPENAI_API_KEY=sk-xxx
GOOGLE_API_KEY=xxx

# LLM Settings
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7

# Logging
LOG_LEVEL=INFO
ENVIRONMENT=development
```

### Docker Compose Profiles

Use optional services:

```bash
# Start with Redis caching
docker-compose --profile optional up -d
```

## 🔐 Security

- Passwords are hashed with bcrypt
- JWT token-based authentication
- CORS configuration for production
- Environment-based secrets management
- Input validation with Pydantic
- SQL injection prevention with async ORM

## 📊 Database Schema

### Main Tables

- `users` - User accounts
- `conversations` - Chat conversations
- `messages` - Chat messages
- `documents` - Uploaded documents
- `embeddings` - Vector embeddings for RAG

## 🚀 Deployment

### Production Deployment

```bash
# Update environment for production
cp .env.prod .env

# Deploy
make prod-up

# Or with docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Docker Image Optimization

Images use:

- Python 3.12-slim (API)
- Node 18-alpine (Frontend)
- Alpine Linux for smaller footprint
- Multi-stage builds to reduce size

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Custom health check
curl http://localhost:8000/health
```

## 🔍 Monitoring & Logging

```bash
# View all logs
make logs

# Follow specific service
docker-compose logs -f api
docker-compose logs -f client

# Stream logs
docker-compose logs -f --tail=50
```

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# View error logs
docker-compose logs

# Rebuild images
make clean
make build
```

### Database connection issues

```bash
# Check database is running
docker-compose ps postgres

# Connect to database
make shell-db
```

### Port already in use

```bash
# Change ports in .env
API_PORT=8001
CLIENT_PORT=3001
DB_PORT=5433
```

### Memory issues

```bash
# Reduce torch batch size in .env
# Or increase Docker memory allocation
```

## 📚 API Documentation

### Main Endpoints

**Health & Status**

- `GET /health` - Service health check
- `GET /status` - System status

**Authentication**

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

**Conversations**

- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/{id}` - Get conversation
- `POST /api/conversations/{id}/messages` - Send message

**Documents**

- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `POST /api/documents/{id}/process` - Process document

**RAG**

- `POST /api/rag/search` - Search in knowledge base
- `POST /api/rag/index` - Index documents

Full API docs: http://localhost:8000/docs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Format code: `make format`
5. Lint code: `make lint`
6. Run tests: `make test`
7. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

- [ ] WebSocket support for real-time chat
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Model fine-tuning interface
- [ ] Kubernetes deployment
- [ ] Mobile app
- [ ] Voice input/output
- [ ] Custom model deployment

## 📞 Support

For issues and questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review API logs: `make logs`
3. Check Docker status: `make ps`
4. Consult API documentation: http://localhost:8000/docs

## 🙏 Acknowledgments

Built with:

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [LangChain](https://langchain.com/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Maintained by**: LMA Team
