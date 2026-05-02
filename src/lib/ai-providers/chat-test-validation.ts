import { AiProviderError } from "./types";

export type ChatCompletionTestRole = "system" | "user" | "assistant";

export type ChatCompletionTestMessage = {
  role: ChatCompletionTestRole;
  content: string;
};

export type ChatCompletionTestPayload = {
  model: string;
  messages: ChatCompletionTestMessage[];
  temperature: number;
};

function isChatRole(role: string): role is ChatCompletionTestRole {
  return (
    role === "system" || role === "user" || role === "assistant"
  );
}

/** Chuẩn hoá payload POST chat test giống OpenAI `/v1/chat/completions`. */
export function parseChatCompletionTestBody(
  raw: unknown,
): ChatCompletionTestPayload {
  if (!raw || typeof raw !== "object") {
    throw new AiProviderError({
      errorCode: "VAL_AI_CHAT_BODY_INVALID",
      message: "Body JSON không hợp lệ.",
      statusCode: 422,
    });
  }

  const body = raw as Record<string, unknown>;

  const model =
    typeof body.model === "string" ? body.model.trim() : "";
  if (model === "") {
    throw new AiProviderError({
      errorCode: "VAL_AI_CHAT_MODEL_REQUIRED",
      message: 'Thiếu hoặc rỗng trường "model".',
      statusCode: 422,
    });
  }

  const inputMessages = body.messages;
  if (!Array.isArray(inputMessages) || inputMessages.length === 0) {
    throw new AiProviderError({
      errorCode: "VAL_AI_CHAT_MESSAGES_INVALID",
      message: 'Body "messages" phải là mảng không rỗng.',
      statusCode: 422,
    });
  }

  const messages: ChatCompletionTestMessage[] = [];

  for (const item of inputMessages) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const role = entry.role;

    if (typeof role !== "string" || !isChatRole(role)) {
      throw new AiProviderError({
        errorCode: "VAL_AI_CHAT_MESSAGE_ROLE_INVALID",
        message: "Mỗi message cần role là system | user | assistant.",
        statusCode: 422,
      });
    }

    const contentRaw = entry.content;
    if (typeof contentRaw !== "string") {
      throw new AiProviderError({
        errorCode: "VAL_AI_CHAT_MESSAGE_CONTENT_INVALID",
        message: "Mỗi message phải có content là chuỗi.",
        statusCode: 422,
      });
    }

    const content = contentRaw.trim();
    if (content === "") {
      throw new AiProviderError({
        errorCode: "VAL_AI_CHAT_MESSAGE_CONTENT_EMPTY",
        message: "Nội dung message không được để trống.",
        statusCode: 422,
      });
    }

    messages.push({ role, content });
  }

  if (messages.length === 0) {
    throw new AiProviderError({
      errorCode: "VAL_AI_CHAT_MESSAGES_INVALID",
      message: 'Body "messages" phải là mảng không rỗng.',
      statusCode: 422,
    });
  }

  let temperature = 0.7;
  if (body.temperature !== undefined && body.temperature !== null) {
    if (
      typeof body.temperature !== "number" ||
      !Number.isFinite(body.temperature)
    ) {
      throw new AiProviderError({
        errorCode: "VAL_AI_CHAT_TEMPERATURE_INVALID",
        message: '"temperature" phải là số hữu hạn.',
        statusCode: 422,
      });
    }
    temperature = body.temperature;
  }

  return { model, messages, temperature };
}

export function extractAssistantCompletionText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const root = response as Record<string, unknown>;
  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== "object") return "";

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string") return content;
  if (content === null || content === undefined) return "";
  try {
    return JSON.stringify(content);
  } catch {
    return "";
  }
}
