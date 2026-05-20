import logging
import os
import json
import re
import unicodedata
from pathlib import Path
from typing import List, Optional, Tuple

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from .state import MyAgentState
from ..llm.config import get_gemini_llm, get_llm
from ..llm.model_manager import model_manager, ModelType
from ..rag import create_rag_tool
from ..score import get_student_scores, get_student_info, calculate_average_scores
from ..score.models import ScoreFilter
from ..score.student_tool import global_db

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define tools
score_tool = get_student_scores
student_info_tool = get_student_info
rag_tool = create_rag_tool()
calculator_tool = calculate_average_scores

# Get all tools
tools = [score_tool, student_info_tool, calculator_tool, rag_tool]

# Load prompts
prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
with open(os.path.join(prompts_dir, "system_prompt.txt"), "r", encoding="utf-8") as f:
    react_prompt = f.read().strip()


STUDENT_CODE_RE = re.compile(r"\b[ACDMT]T\d{6}\b", re.IGNORECASE)
SEMESTER_RE = re.compile(r"\b(?:ki|k|ky|hk|hoc ky)\s*([1-4])\s*[-_/ ]\s*(\d{4})\s*[-_/ ]\s*(\d{4})\b", re.IGNORECASE)


def _strip_accents(text: str) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFD", text or "")
        if unicodedata.category(char) != "Mn"
    ).lower()


def _extract_authenticated_student_code(query: str) -> Optional[str]:
    auth_match = re.search(
        r"My authenticated student code is\s+([A-Z]{2}\d{6})",
        query or "",
        re.IGNORECASE,
    )
    if auth_match:
        return auth_match.group(1).upper()

    codes = STUDENT_CODE_RE.findall(query or "")
    return codes[0].upper() if codes else None


def _looks_like_score_query(query: str) -> bool:
    normalized = _strip_accents(query)
    score_keywords = [
        "diem", "gpa", "diem trung binh", "diem tich luy",
        "ket qua hoc tap", "mon hoc", "hoc ky", "tin chi",
    ]
    return any(keyword in normalized for keyword in score_keywords)


def _looks_like_student_info_query(query: str) -> bool:
    normalized = _strip_accents(query)
    info_keywords = [
        "thong tin cua toi", "thong tin cua minh", "thong tin sinh vien",
        "lop cua toi", "ho ten cua toi", "ma sinh vien cua toi",
    ]
    return any(keyword in normalized for keyword in info_keywords)


def _extract_semester(query: str) -> Optional[str]:
    normalized = _strip_accents(query).replace("_", "-")
    match = SEMESTER_RE.search(normalized)
    if match:
        return f"ki{match.group(1)}-{match.group(2)}-{match.group(3)}"

    year_match = re.search(r"(?:hoc ky|ky|ki|hk)\s*([1-4]).*?(\d{4})\s*[-/]\s*(\d{4})", normalized)
    if year_match:
        return f"ki{year_match.group(1)}-{year_match.group(2)}-{year_match.group(3)}"

    return None


def _extract_subject_name(query: str) -> Optional[str]:
    normalized = _strip_accents(query)
    if "mon" not in normalized and "mon hoc" not in normalized:
        return None

    cleaned = re.sub(r"My authenticated student code is.*?\n\n", "", query or "", flags=re.IGNORECASE | re.DOTALL)
    patterns = [
        r"(?:môn học|môn)\s+(.+?)(?:\s+(?:trong|ở|hoc ky|học kỳ|kỳ|ki|hk)\b|[?.!,]|$)",
        r"(?:điểm|diem)\s+(?:môn học|môn)\s+(.+?)(?:\s+(?:trong|ở|hoc ky|học kỳ|kỳ|ki|hk)\b|[?.!,]|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, cleaned, flags=re.IGNORECASE)
        if match:
            subject = match.group(1).strip(" :;-")
            subject_norm = _strip_accents(subject)
            if subject and subject_norm not in {"cua toi", "toi", "tu dau toi gio", "hoc ky nay"}:
                return subject
    return None


def _score_value(score) -> Optional[float]:
    value = getattr(score, "score_over_rall", None)
    return float(value) if value is not None else None


def _credit_value(score) -> int:
    subject = getattr(score, "subject", None)
    credits = getattr(subject, "subject_credits", None) if subject else None
    return int(credits or 0)


def _calculate_gpa(scores) -> Tuple[Optional[float], int]:
    total_credits = 0
    total_weighted = 0.0
    for score in scores:
        score_value = _score_value(score)
        credits = _credit_value(score)
        if score_value is None or credits <= 0:
            continue
        total_credits += credits
        total_weighted += score_value * credits
    if total_credits <= 0:
        return None, 0
    return round(total_weighted / total_credits, 2), total_credits


def _latest_semester(scores) -> Optional[str]:
    semesters = [score.semester for score in scores if getattr(score, "semester", None)]
    return semesters[0] if semesters else None


def _format_scores_answer(scores, student_code: str, query: str, semester_filter: Optional[str], subject_name: Optional[str]) -> str:
    if not scores:
        parts = [f"Không tìm thấy điểm của tài khoản `{student_code}`"]
        if semester_filter:
            parts.append(f"trong học kỳ `{semester_filter}`")
        if subject_name:
            parts.append(f"cho môn `{subject_name}`")
        return " ".join(parts) + "."

    normalized = _strip_accents(query)
    wants_latest = any(kw in normalized for kw in ["hoc ky nay", "ky nay", "ki nay", "gan nhat", "moi nhat"])
    if wants_latest and not semester_filter:
        latest = _latest_semester(scores)
        if latest:
            scores = [score for score in scores if score.semester == latest]
            semester_filter = latest

    overall_gpa, overall_credits = _calculate_gpa(scores)
    title = "Điểm của bạn"
    if semester_filter:
        title += f" trong học kỳ `{semester_filter}`"
    elif any(kw in normalized for kw in ["tu dau", "tich luy", "gpa tong", "tong", "den gio"]):
        title += " từ đầu đến giờ"
    if subject_name:
        title += f" - môn `{subject_name}`"

    lines = [f"**{title}**", ""]
    lines.append("| Học kỳ | Môn học | Số tín chỉ | Điểm |")
    lines.append("|---|---|---:|---:|")
    for score in scores:
        subject = getattr(score, "subject", None)
        subject_label = getattr(subject, "subject_name", "-") if subject else "-"
        credits = _credit_value(score)
        score_value = _score_value(score)
        score_text = "-" if score_value is None else f"{score_value:.2f}".rstrip("0").rstrip(".")
        lines.append(f"| {score.semester or '-'} | {subject_label} | {credits} | {score_text} |")

    lines.append("")
    if overall_gpa is None:
        lines.append("**GPA:** Chưa đủ dữ liệu tín chỉ/điểm để tính.")
    else:
        gpa_label = "GPA học kỳ" if semester_filter else "GPA tổng"
        lines.append(f"**{gpa_label}: {overall_gpa}** trên {overall_credits} tín chỉ.")

    if not semester_filter and not subject_name:
        by_semester = {}
        for score in scores:
            by_semester.setdefault(score.semester or "Không rõ học kỳ", []).append(score)
        lines.append("")
        lines.append("**GPA theo từng học kỳ:**")
        for semester, semester_scores in by_semester.items():
            semester_gpa, semester_credits = _calculate_gpa(semester_scores)
            if semester_gpa is not None:
                lines.append(f"- `{semester}`: {semester_gpa} ({semester_credits} tín chỉ)")

    return "\n".join(lines)


async def _handle_student_query_directly(query: str) -> Optional[AIMessage]:
    student_code = _extract_authenticated_student_code(query)
    if not student_code:
        return None

    if _looks_like_student_info_query(query) and not _looks_like_score_query(query):
        result = await get_student_info.ainvoke({"student_code": student_code})
        try:
            data = json.loads(result)
            student = data.get("student")
        except Exception:
            student = None
        if not student:
            return AIMessage(content=f"Không tìm thấy thông tin sinh viên của tài khoản `{student_code}`.")
        return AIMessage(content=(
            "**Thông tin của bạn**\n\n"
            f"- Mã sinh viên: `{student.get('student_code', student_code)}`\n"
            f"- Họ tên: {student.get('student_name') or '-'}\n"
            f"- Lớp: {student.get('student_class') or '-'}"
        ))

    if not _looks_like_score_query(query):
        return None

    semester = _extract_semester(query)
    subject_name = _extract_subject_name(query)
    score_filter = ScoreFilter(
        student_code=student_code,
        semester=semester,
    )

    try:
        scores = await global_db.db.get_scores(score_filter)
    finally:
        await global_db.close()

    if subject_name:
        subject_query = _strip_accents(subject_name)
        scores = [
            score for score in scores
            if subject_query in _strip_accents(getattr(score.subject, "subject_name", ""))
        ]

    answer = _format_scores_answer(scores, student_code, query, semester, subject_name)
    return AIMessage(content=answer)


def get_tool_descriptions(tools_list: list) -> str:
    descriptions = "\n".join([
        f"- {tool.name}: {tool.description} (args: {tool.args_schema.schema()['properties'].keys() if tool.args_schema else 'None'})"
        for tool in tools_list])
    logger.info(f"--- AGENT: Available tools: {[tool.name for tool in tools_list]} ---")
    return descriptions

# Query reformulation prompt
conversational_prompt = """
    Given a chat history between an AI chatbot and user
    that chatbot's message marked with [bot] prefix and user's message marked with [user] prefix,
    and given the latest user question which might reference context in the chat history,
    formulate a standalone question which can be understood without the chat history.
    Do NOT answer the question, just reformulate it if needed and otherwise return it as is.
    
    CRITICAL: Keep the original language of the user's input (do NOT translate).
    - If user asks in Vietnamese, respond in Vietnamese
    - If user asks in English, respond in English
    - NEVER change the language of the original question
    
    ** History **
    This is chat history:
    {chat_history}
    
    ** Latest user question **
    This is latest user question:
    {question}
    """


async def summarize_conversation(state: MyAgentState) -> MyAgentState:
    """
    Summarize conversation history to provide context for the next query.
    This helps the model understand the conversation flow.
    """
    logger.info("--- AGENT: Summarizing conversation history ---")
    
    messages = state["messages"]
    
    # If there are fewer than 3 messages, no need to summarize
    if len(messages) < 1:
        return state
    
    # Get the latest user query
    latest_query = messages[-1].content
    
    # CRITICAL: Check if message has file attachment context
    # If it does, SKIP reformulation to preserve the [DOCUMENT CONTEXT] marker
    has_file_context = "[DOCUMENT CONTEXT]" in latest_query
    if has_file_context:
        logger.info("📎 File context detected in query - SKIPPING reformulation to preserve [DOCUMENT CONTEXT] marker")
        return state

    has_auth_context = "My authenticated student code is" in latest_query
    if has_auth_context:
        logger.info("Student auth context detected in query - SKIPPING reformulation to preserve access control context")
        return state
    
    # The conversational context prompt helps rewrite the latest query with context
    llm = get_llm()  # Use factory method to support runtime model switching
    
    # Format the chat history for the summarization prompt
    chat_history = []
    for i, msg in enumerate(messages[:-1]):  # Exclude the most recent message
        prefix = "[bot]" if isinstance(msg, AIMessage) else "[user]"
        chat_history.append(f"{prefix} {msg.content}")

    logger.info("--- AGENT: Summarizing conversation history ---")
    logger.info(f"Latest query: {latest_query}")
    logger.info(f"Chat history: {chat_history}")

    chat_history_str = "" + "\n".join(chat_history)

    if len(chat_history_str) == 0:
        return state

    # Check if query is already standalone and in Vietnamese
    # Skip summarization to avoid language conversion
    def is_vietnamese_and_standalone(query):
        vietnamese_chars = any(ord(c) > 127 for c in query)  # Contains non-ASCII
        reference_words = ['này', 'kia', 'đó', 'đây', 'trước', 'sau', 'ở trên', 'vừa nói']
        has_references = any(word in query.lower() for word in reference_words)
        return vietnamese_chars and not has_references
    
    if is_vietnamese_and_standalone(latest_query):
        logger.info(f"🇻🇳 Skipping summarization for Vietnamese standalone query: {latest_query}")
        return state

    logger.info(f"Chat history str: {chat_history_str}")
    
    # Invoke the rewriting prompt with the formatted chat history
    try:
        standalone_query = llm.invoke(
            conversational_prompt.format(
                chat_history=chat_history_str,
                question=latest_query
            )
        )
        
        # Replace the latest message with the reformulated query
        contextual_message = HumanMessage(content=standalone_query.content)

        logger.info("--- AGENT: Contextual message ---")
        logger.info(f"Contextual message: {contextual_message}")
        
        # Return new state with all previous messages and the reformulated query
        return {"messages": messages[:-1] + [contextual_message]}
    except Exception as e:
        logger.error(f"Error summarizing conversation: {e}")
        # If summarization fails, continue with original messages
        return state


async def call_model_no_human_loop(state: MyAgentState) -> MyAgentState:
    logger.info("--- AGENT (No Human Loop): Calling LLM ---")
    
    # Log active model at the start for debugging
    try:
        active_model_type = model_manager.get_model_type()
        logger.info(f"🤖 [AGENT START] Active model type: {active_model_type}")
        logger.info(f"🤖 [AGENT START] Model type name: {active_model_type.name}")
        
        # Also log which specific model name will be used
        if active_model_type == ModelType.OLLAMA:
            ollama_info = model_manager.get_ollama_info()
            logger.info(f"🤖 [AGENT START] Using Ollama model: {ollama_info.get('model')}")
        elif active_model_type == ModelType.GEMINI:
            gemini_info = model_manager.get_gemini_info()
            logger.info(f"🤖 [AGENT START] Using Gemini model: {gemini_info.get('model')}")
    except Exception as e:
        logger.warning(f"⚠️ Could not log model info: {e}")

    # Prepare the prompts
    tool_descriptions = get_tool_descriptions(tools)
    logger.info(f"Available tools: {[tool.name for tool in tools]}")
    logger.info(f"Tool descriptions length: {len(tool_descriptions)}")
    
    # FORCE tool call for ALL queries EXCEPT:
    # 1. Personal student score queries
    # 2. Queries with file attachments (already augmented with context)
    last_message = state["messages"][-1] if state["messages"] else None
    force_rag_tool = False
    
    if last_message and isinstance(last_message, HumanMessage):
        direct_student_response = await _handle_student_query_directly(last_message.content)
        if direct_student_response:
            logger.info("✅ Direct student score/info handler returned response; skipping Gemini tool calling")
            return {"messages": state["messages"] + [direct_student_response]}

        query_lower = last_message.content.lower()
        query = last_message.content
        
        # Check if message already has file attachment context
        has_file_context = "[DOCUMENT CONTEXT]" in query
        logger.info(f"📎 File context in message: {has_file_context}")
        
        if has_file_context:
            logger.info("✅ Message has file attachment context, skipping force RAG tool")
            force_rag_tool = False
        else:
            # Detect student code patterns (AT170139, CT180456, DT190789, etc.)
            import re
            student_code_pattern = re.compile(r'\b[ACDMT]T\d{6}\b', re.IGNORECASE)
            has_student_code = bool(student_code_pattern.search(query))
            
            # Check if this is a PERSONAL query (score OR info - needs student_code)
            personal_score_keywords = ['điểm của', 'điểm em', 'điểm tôi', 'điểm mình', 'điểm sinh viên', 
                                       'gpa của', 'gpa em', 'gpa tôi', 'gpa mình',
                                       'xem điểm', 'tra điểm', 'kiểm tra điểm']
            personal_info_keywords = ['thông tin của', 'thông tin em', 'thông tin tôi', 'thông tin sinh viên',
                                      'lớp của', 'lớp em', 'lớp tôi',
                                      'họ tên của', 'họ tên em', 'tên của', 'tên em']
            
            personal_score_keywords += [
                'điểm của', 'điểm em', 'điểm tôi', 'điểm mình', 'điểm sinh viên',
                'gpa của', 'gpa em', 'gpa tôi', 'gpa mình',
                'xem điểm', 'tra điểm', 'kiểm tra điểm',
                'điểm học kỳ', 'điểm trung bình', 'điểm tích lũy', 'kết quả học tập',
            ]
            personal_info_keywords += [
                'thông tin của', 'thông tin em', 'thông tin tôi', 'thông tin mình',
                'thông tin sinh viên', 'lớp của', 'lớp em', 'lớp tôi', 'lớp mình',
                'họ tên của', 'họ tên em', 'tên của', 'tên em',
            ]

            is_personal_score = any(kw in query_lower for kw in personal_score_keywords) and has_student_code
            is_personal_info = any(kw in query_lower for kw in personal_info_keywords) and has_student_code
            
            # FORCE search_kma_regulations for EVERYTHING EXCEPT personal queries
            if not (is_personal_score or is_personal_info):
                force_rag_tool = True
                logger.info(f"🔴 FORCING search_kma_regulations for: {query[:100]}...")
    
    # If forcing tool call, inject it directly
    if force_rag_tool:
        from langchain_core.messages import ToolMessage
        
        # Extract query (remove document context if present)
        query = last_message.content
        if "[DOCUMENT CONTEXT]" in query:
            # This shouldn't happen since we check earlier, but just in case
            query = query.split("[DOCUMENT CONTEXT]")[0].strip()
        
        # Use department from state if provided, otherwise detect from keywords
        department = state.get('department')
        if not department:
            # Fallback to keyword detection
            if any(kw in query_lower for kw in ['thi', 'kiểm tra', 'đình chỉ', 'phúc khảo', 'khảo thí']):
                department = 'phongkhaothi'
            elif any(kw in query_lower for kw in ['đào tạo', 'tốt nghiệp', 'học tập', 'tín chỉ']):
                department = 'phongdaotao'
        
        # Call RAG tool directly
        logger.info(f"⚡ FORCING search_kma_regulations: query='{query}', department='{department}'")
        
        try:
            # Import and call tool directly
            from ..rag import search_kma_regulations
            logger.info(f"🔧 Calling search_kma_regulations with query: {query[:100]}...")
            logger.info(f"🔧 Department: {department}")
            
            result = search_kma_regulations.invoke({
                "query": query, 
                "department": department  # None is now valid
            })
            
            logger.info(f"📊 Tool result length: {len(result)}")
            logger.info(f"📝 Tool result preview: {result[:200]}...")
            
            if not result or len(result.strip()) == 0:
                logger.error("❌ Empty result from forced tool call!")
                result = "Xin lỗi, tôi không tìm thấy thông tin phù hợp với câu hỏi của bạn."
            
            # Create response message with result
            response_message = AIMessage(content=result)
            logger.info(f"✅ Forced tool call successful, returning response")
            
            return {"messages": state['messages'] + [response_message]}
            
        except Exception as e:
            import traceback
            logger.error(f"❌ Forced tool call failed: {e}")
            logger.error(traceback.format_exc())
            # Fall through to normal LLM call
    
    # Normal LLM call with few-shot examples
    few_shot_examples = """

### VÍ DỤ MINH HỌA (BẮT BUỘC HỌC THEO)

**Ví dụ 1: Câu hỏi về quy định (NO FILE CONTEXT)**
User: "Những hành vi nào bị đình chỉ thi?"
Assistant: [Phải gọi search_kma_regulations]
Action: search_kma_regulations
Action Input: query="hành vi bị đình chỉ thi", department="phongkhaothi"

**Ví dụ 2: Câu hỏi về điều kiện (NO FILE CONTEXT)**
User: "Điều kiện tốt nghiệp là gì?"
Assistant: [Phải gọi search_kma_regulations]
Action: search_kma_regulations
Action Input: query="điều kiện tốt nghiệp", department="phongdaotao"

**Ví dụ 3: Câu hỏi về tài liệu được upload (HAS FILE CONTEXT)**
User: "Giải thích chi tiết hơn về điều này"
[User has uploaded a document with context, message contains [DOCUMENT CONTEXT] section]
Assistant: [Không cần gọi tool, đã có document context, trả lời trực tiếp dựa trên tài liệu]
Trả lời: "Dựa trên tài liệu bạn đã upload, điểm chính là..."

**Ví dụ 4: Câu hỏi cụ thể về tài liệu (HAS FILE CONTEXT)**
User: "Điểm nào quan trọng nhất trong tài liệu này?"
[User has uploaded a document]
Assistant: [Sử dụng thông tin từ [DOCUMENT CONTEXT], không gọi search_kma_regulations]
Trả lời: "Theo tài liệu bạn vừa chia sẻ, điểm quan trọng nhất là..."

📋 QUY TẮC QUAN TRỌNG:
1. ✅ Nếu message chứa [DOCUMENT CONTEXT]: Trả lời trực tiếp dựa trên tài liệu, KHÔNG gọi search_kma_regulations
2. ✅ Nếu không có [DOCUMENT CONTEXT] và là câu hỏi về quy định: Gọi search_kma_regulations
3. ✅ Nếu là câu hỏi về điểm cá nhân + có student code: Gọi score tool
4. ⚠️ KHÔNG bao giờ bỏ qua tài liệu được upload - đó là ưu tiên hàng đầu"""
    
    permission_rules = """

### STUDENT DATA PERMISSION RULES
- For score or student information questions, only use the authenticated student code injected by the backend: "My authenticated student code is ...".
- Do not ask the user to type a student code for personal queries like "điểm của tôi", "thông tin của tôi", "GPA của tôi", or "điểm học kỳ này của tôi".
- Never use a different student code from the user's message or chat history.
- If the user tries to view another student's scores or personal information, answer exactly: "Bạn chỉ được xem điểm và thông tin của mình."
"""

    citation_rules = """

### DOCUMENT CITATION RULES
- When answering from KMA regulations, uploaded documents, or any [DOCUMENT CONTEXT], the final answer MUST include a **Nguồn:** section.
- In **Nguồn:**, cite the exact file name, the relevant ban/phòng/department if available, and the Điều/Khoản/Điểm/Phụ lục if present in the provided context.
- If the context has source markers such as [Source 1], "File:", "Chunk:", or department metadata, use them instead of saying a vague phrase like "the uploaded document".
- If a cited document does not expose Điều/Khoản/Điểm, still cite the file name and available source marker/chunk.
- Do not invent sources, file names, or article numbers. If source metadata is missing, write "Không rõ nguồn cụ thể trong context".
- Never show internal reasoning, checklists, drafts, "User Question", "Constraints", "Draft", or answer-quality notes. Return only the final user-facing answer.
"""

    enhanced_prompt = react_prompt.format(tool_descriptions=tool_descriptions) + few_shot_examples + permission_rules + citation_rules
    
    prompt = ChatPromptTemplate.from_messages(
        [("system", enhanced_prompt),
         MessagesPlaceholder(variable_name="messages"), ])

    # Bind tools and structured output - use factory method for runtime model switching
    # Check if message has file context - if so, don't bind tools
    has_file_context = False
    last_msg = state["messages"][-1] if state["messages"] else None
    if last_msg and isinstance(last_msg, HumanMessage):
        has_file_context = "[DOCUMENT CONTEXT]" in last_msg.content
    
    logger.info(f"📎 Has file context in LLM call: {has_file_context}")
    
    # Log active model information for debugging
    try:
        active_model_type = model_manager.get_model_type()
        logger.info(f"🤖 Active model type: {active_model_type}")
        logger.info(f"🤖 Model type name: {active_model_type.name}")
        if active_model_type == ModelType.OLLAMA:
            ollama_info = model_manager.get_ollama_info()
            logger.info(f"🤖 Using Ollama: {ollama_info.get('model')}")
        elif active_model_type == ModelType.GEMINI:
            gemini_info = model_manager.get_gemini_info()
            logger.info(f"🤖 Using Gemini: {gemini_info.get('model')}")
    except Exception as e:
        logger.warning(f"⚠️ Could not get model info: {e}")
    
    # Bind tools only if no file context
    if has_file_context:
        logger.info("⏭️  Skipping tool binding - file context present, direct LLM response")
        model_with_tools = get_llm()  # No tools
    else:
        model_with_tools = get_llm().bind_tools(tools)
    
    chains = prompt | model_with_tools

    try:
        response = chains.invoke({"messages": state["messages"]})
        
        # Log tool calls for debugging
        if hasattr(response, 'tool_calls') and response.tool_calls:
            logger.info(f"--- AGENT: Tool calls detected: {[tool_call.get('name', 'unknown') for tool_call in response.tool_calls]} ---")
            logger.info(f"Response from tool calls: {response.content[:200] if hasattr(response, 'content') else 'N/A'}...")
        else:
            logger.info("--- AGENT: No tool calls detected ---")
            logger.info(f"Response content preview: {response.content[:200]}...")
            logger.info(f"Response model used: {response.__class__.__name__}")
            
        return {"messages": state['messages'] + [response]}

    except Exception as e:
        logger.error(f"Error invoking LLM: {e}")
        error_message = AIMessage(content=f"An error occurred with the LLM: {e}")
        return {"messages": state['messages'] + [error_message]}


def should_continue_no_human_loop(state: MyAgentState):
    print("--- AGENT (No Human Loop): Deciding next step ---")
    last_message = state['messages'][-1] if state['messages'] else None
    if not last_message:  # Trường hợp state messages rỗng
        return END

    if isinstance(last_message, AIMessage) and hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "action"
    print("--- AGENT (No Human Loop): No tool call, ending. ---")
    return END


tool_node = ToolNode(tools)


class ReActGraph:
    def __init__(self):
        self.workflow = None
        self.state = MyAgentState
        self.tools = tools
        self.call_model_no_human_loop = call_model_no_human_loop
        self.tool_node = tool_node
        self.should_continue_no_human_loop = should_continue_no_human_loop
        self.conversation_memory = []

    def create_graph(self):
        # Create the state graph
        logger.info("___Creating workflow graph___")

        workflow = StateGraph(self.state)
        workflow.add_node("summarize", summarize_conversation)
        workflow.add_node("agent", self.call_model_no_human_loop)
        workflow.add_node("action", self.tool_node)
        
        # Set entry point to the summarization node
        workflow.set_entry_point("summarize")
        
        # After summarization, always go to agent
        workflow.add_edge("summarize", "agent")
        
        # From agent, conditionally go to action or end
        workflow.add_conditional_edges("agent", self.should_continue_no_human_loop, {"action": "action", END: END})
        
        # From action, always go back to agent
        workflow.add_edge("action", "agent")
        
        self.workflow = workflow.compile()

        logger.info("___Finished creating workflow graph___")
        return self.workflow

    def print_mermaid(self):
        # Generate and log the Mermaid diagram
        try:
            logger.info("___Printing mermaid graph___")
            mermaid_diagram = self.workflow.get_graph().draw_mermaid()
            logger.info("Mermaid diagram:")
            logger.info(mermaid_diagram)


            logger.info("___Saving mermaid graph to file___")
            current_dir = Path(__file__).parent.absolute()
            project_root = current_dir.parent.parent
            mermaid_dir_path = os.path.join(project_root, "mermaid")
            mermaid_path = os.path.join(mermaid_dir_path, "react_mermaid.mmd")

            ## Save the diagram to a file
            with open(mermaid_path, "w") as f:
                f.write(mermaid_diagram)
                f.close()

            logger.info("___Finished printing mermaid graph___")

        except Exception as e:
            print(f"Error generating Mermaid diagram: {str(e)}")

    async def chat(self, init: str):
        """Legacy method for single message processing, maintained for backward compatibility"""
        initial_state = {"messages": [HumanMessage(content=init)]}

        if self.workflow is None:
            self.create_graph()
            self.print_mermaid()

        result = await self.workflow.ainvoke(initial_state)
        current_messages = result['messages']

        return current_messages
        
    async def chat_with_memory(self, conversation_history: List[BaseMessage], query: str, department: str = None) -> List[BaseMessage]:
        """
        Process a query while maintaining conversation history.
        
        Args:
            conversation_history: Previous messages in the conversation
            query: The new user query to process
            department: Optional department to route the query to
            
        Returns:
            Updated conversation history with the agent's response
        """
        # Add the new query to the conversation history
        updated_history = conversation_history.copy() + [HumanMessage(content=query)]
        
        # Prepare the initial state with the full conversation history
        initial_state = {"messages": updated_history, "department": department}
        
        # Create the workflow if it doesn't exist
        if self.workflow is None:
            self.create_graph()
            self.print_mermaid()
            
        # Execute the workflow
        result = await self.workflow.ainvoke(initial_state)
        
        # Return the updated conversation history
        return result['messages']
