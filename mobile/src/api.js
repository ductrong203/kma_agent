import { API_BASE_URL, ENDPOINTS } from "./config";
import { storage } from "./storage";

const parseError = async (response) => {
  try {
    const data = await response.json();
    return data.detail || data.message || `HTTP ${response.status}`;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
};

export const apiRequest = async (path, options = {}) => {
  const { accessToken } = await storage.getTokens();
  const headers = {
    Accept: "application/json",
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }

  return response.json();
};

export const authApi = {
  async login(username, password) {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.login}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const result = await response.json();
    const tokens = result.data;
    if (!tokens?.access_token) {
      throw new Error("Phản hồi đăng nhập không có access token");
    }

    await storage.setTokens(tokens.access_token, tokens.refresh_token);
    const me = await apiRequest(ENDPOINTS.me);
    const user = normalizeUser(me.data);

    if (user.role !== "user") {
      await storage.clearSession();
      throw new Error("Ứng dụng mobile chỉ dành cho tài khoản người dùng.");
    }

    await storage.setUser(user);
    return { success: true, user };
  },

  async register(payload) {
    try {
      const result = await apiRequest(ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({
          username: payload.username,
          password: payload.password,
          email: payload.email || null,
          student_code: payload.studentCode || null,
          student_name: payload.username,
          student_class: payload.studentClass || null,
          role: "user",
        }),
      });

      // Auto login after register so the mobile session has valid tokens.
      return this.login(payload.username, payload.password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateProfile(data) {
    try {
      const result = await apiRequest(ENDPOINTS.me, {
        method: "PUT",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          student_code: data.studentCode,
        }),
      });
      const user = normalizeUser(result.data);
      await storage.setUser(user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getCurrentUserInfo() {
    try {
      const result = await apiRequest(ENDPOINTS.me);
      const user = normalizeUser(result.data);
      await storage.setUser(user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export const chatApi = {
  async createConversation(userId) {
    const result = await apiRequest(ENDPOINTS.conversations, {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        title: `Cuộc trò chuyện ${new Date().toLocaleString("vi-VN")}`,
      }),
    });
    return {
      id: result.data._id,
      title: result.data.title,
      created_at: result.data.created_at,
      updated_at: result.data.updated_at,
    };
  },

  async getConversations() {
    try {
      const result = await apiRequest(
        `${ENDPOINTS.conversations}?skip=0&limit=50`,
      );
      return {
        success: true,
        data: (result.data || []).map((item) => ({
          id: item._id,
          title: item.title || "Trò chuyện mới",
          preview: item.preview || "",
          created_at: item.created_at,
          updated_at: item.updated_at,
        })),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getMessages(conversationId) {
    try {
      const result = await apiRequest(
        `${ENDPOINTS.messages}/${conversationId}?skip=0&limit=50`,
      );
      return {
        success: true,
        data: (result.data || []).map((item) => ({
          id: item._id,
          content: normalizeContent(item.content),
          role: item.is_user ? "user" : "assistant",
          timestamp: item.created_at,
        })),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async sendMessage(payload) {
    try {
      const { content, conversation_id, files } = payload;

      // Create form data for file upload
      const formData = new FormData();
      formData.append("content", content);

      if (files && files.length > 0) {
        files.forEach((file, index) => {
          formData.append(`files`, {
            uri: file.uri,
            type: file.type || "application/octet-stream",
            name: file.name,
          });
        });
      }

      const result = await apiRequest(ENDPOINTS.sendMessage(conversation_id), {
        method: "POST",
        body: formData,
      });

      return {
        success: true,
        conversation_id: result.data.conversation_id || conversation_id,
        data: {
          content: normalizeContent(result.data.content),
          role: "assistant",
          timestamp: result.data.created_at,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteConversation(conversationId) {
    try {
      await apiRequest(`${ENDPOINTS.conversations}/${conversationId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export const normalizeUser = (user) => ({
  id: user._id || user.user_id || user.id,
  username: user.username,
  name: user.student_name || user.username,
  email: user.email,
  role: user.role || "user",
  studentCode: user.student_code,
  studentClass: user.student_class,
});

export const normalizeContent = (content) => {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.text || item?.content || JSON.stringify(item);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof content === "object")
    return content.text || content.content || JSON.stringify(content);
  return String(content);
};
