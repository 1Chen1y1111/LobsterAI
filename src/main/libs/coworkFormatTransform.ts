/**
 * 这个文件负责在 Anthropic 风格协议与 OpenAI 风格协议之间做格式转换。
 *
 * 主要职责：
 * 1. 统一定义兼容层里会复用的协议类型和流式 chunk 结构。
 * 2. 把 Anthropic `messages` 请求转换成 OpenAI `chat/completions` 请求。
 * 3. 把 OpenAI 风格响应再转回 Anthropic 风格，供上层逻辑复用。
 * 4. 提供停止原因映射、SSE 事件格式化和 OpenAI 端点 URL 规范化能力。
 */

// Cowork 兼容层内部使用的 provider API 格式类型。
export type AnthropicApiFormat = 'anthropic' | 'openai';

// OpenAI 风格流式返回中会关心的最小 chunk 结构。
export type OpenAIStreamChunk = {
  id?: string;
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        extra_content?: unknown;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

// 把 unknown 安全收敛成普通对象；失败时返回空对象。
function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// 把 unknown 安全收敛成数组；失败时返回空数组。
function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// 把 unknown 安全收敛成字符串；失败时返回空串。
function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// 把 unknown 安全收敛成对象或 null。
function toOptionalObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

// 把任意值尽量序列化成字符串，用于 tool 参数和结果透传。
function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value ?? '');
  } catch {
    return '';
  }
}

// 规范化 provider 的 API 格式字段；当前只区分 anthropic 和 openai。
export function normalizeProviderApiFormat(format: unknown): AnthropicApiFormat {
  if (format === 'openai') {
    return 'openai';
  }
  return 'anthropic';
}

// 把 OpenAI 的 finish_reason 映射成 Anthropic 风格的 stop_reason。
export function mapStopReason(finishReason?: string | null): string | null {
  if (!finishReason) {
    return null;
  }
  if (finishReason === 'tool_calls') {
    return 'tool_use';
  }
  if (finishReason === 'stop') {
    return 'end_turn';
  }
  if (finishReason === 'length') {
    return 'max_tokens';
  }
  return finishReason;
}

// 按 SSE 协议格式拼接一条事件消息。
export function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// 递归清洗工具 schema，移除部分 OpenAI 兼容端不接受的字段。
function cleanSchema(schema: unknown): unknown {
  const obj = toObject(schema);
  const output: Record<string, unknown> = { ...obj };

  if (output.format === 'uri') {
    delete output.format;
  }

  const properties = toObject(output.properties);
  if (Object.keys(properties).length > 0) {
    const nextProperties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      nextProperties[key] = cleanSchema(value);
    }
    output.properties = nextProperties;
  }

  if (output.items !== undefined) {
    output.items = cleanSchema(output.items);
  }

  return output;
}

// 把一条 Anthropic message 转换成一条或多条 OpenAI message。
function convertMessageToOpenAI(role: string, content: unknown): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];

  if (typeof content === 'string') {
    result.push({ role, content });
    return result;
  }

  const blocks = toArray(content);
  if (blocks.length === 0) {
    result.push({ role, content: null });
    return result;
  }

  const contentParts: Array<Record<string, unknown>> = [];
  const toolCalls: Array<Record<string, unknown>> = [];
  const thinkingParts: string[] = [];

  for (const block of blocks) {
    const blockObj = toObject(block);
    const blockType = toString(blockObj.type);

    // 文本块转成 OpenAI 的 text content part。
    if (blockType === 'text') {
      const text = toString(blockObj.text);
      if (text) {
        contentParts.push({ type: 'text', text });
      }
      continue;
    }

    // 图片块转成 data URL 形式的 image_url part。
    if (blockType === 'image') {
      const source = toObject(blockObj.source);
      const mediaType = toString(source.media_type) || 'image/png';
      const data = toString(source.data);
      if (data) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${mediaType};base64,${data}`,
          },
        });
      }
      continue;
    }

    // tool_use 转成 OpenAI 的 function tool call，并尽量保留额外签名信息。
    if (blockType === 'tool_use') {
      const id = toString(blockObj.id);
      const name = toString(blockObj.name);
      const input = blockObj.input ?? {};
      const toolCall: Record<string, unknown> = {
        id,
        type: 'function',
        function: {
          name,
          arguments: stringifyUnknown(input),
        },
      };

      let extraContent: unknown = blockObj.extra_content;
      if (extraContent === undefined) {
        const thoughtSignature = toString(blockObj.thought_signature);
        if (thoughtSignature) {
          extraContent = {
            google: {
              thought_signature: thoughtSignature,
            },
          };
        }
      }

      if (extraContent !== undefined) {
        toolCall.extra_content = extraContent;
      }

      toolCalls.push(toolCall);
      continue;
    }

    // tool_result 会拆成独立的 tool role message。
    if (blockType === 'tool_result') {
      const toolCallId = toString(blockObj.tool_use_id);
      const toolContent = stringifyUnknown(blockObj.content);
      result.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: toolContent,
      });
      continue;
    }

    // thinking 内容在 OpenAI 侧挂到 reasoning_content。
    if (blockType === 'thinking') {
      const thinking = toString(blockObj.thinking) || toString(blockObj.text);
      if (thinking) {
        thinkingParts.push(thinking);
      }
      continue;
    }
  }

  const mergedThinking = thinkingParts.join('');
  if (contentParts.length > 0 || toolCalls.length > 0 || (role === 'assistant' && mergedThinking)) {
    const nextMessage: Record<string, unknown> = { role };

    if (contentParts.length === 1 && contentParts[0].type === 'text') {
      nextMessage.content = contentParts[0].text;
    } else if (contentParts.length > 0) {
      nextMessage.content = contentParts;
    } else {
      nextMessage.content = null;
    }

    if (toolCalls.length > 0) {
      nextMessage.tool_calls = toolCalls;
    }

    if (role === 'assistant' && mergedThinking) {
      nextMessage.reasoning_content = mergedThinking;
    }

    result.push(nextMessage);
  }

  return result;
}

// 把 Anthropic 风格请求体转换成 OpenAI chat/completions 风格请求体。
export function anthropicToOpenAI(body: unknown): Record<string, unknown> {
  const source = toObject(body);
  const output: Record<string, unknown> = {};

  if (source.model !== undefined) {
    output.model = source.model;
  }

  const messages: Array<Record<string, unknown>> = [];

  // 先处理 system prompt，它在 OpenAI 侧表现为 system role messages。
  const system = source.system;
  if (typeof system === 'string' && system) {
    messages.push({ role: 'system', content: system });
  } else if (Array.isArray(system)) {
    for (const item of system) {
      const itemObj = toObject(item);
      const text = toString(itemObj.text);
      if (text) {
        messages.push({ role: 'system', content: text });
      }
    }
  }

  const sourceMessages = toArray(source.messages);
  for (const item of sourceMessages) {
    const itemObj = toObject(item);
    const role = toString(itemObj.role) || 'user';
    const converted = convertMessageToOpenAI(role, itemObj.content);
    messages.push(...converted);
  }

  output.messages = messages;

  if (source.max_tokens !== undefined) {
    output.max_tokens = source.max_tokens;
  }
  if (source.temperature !== undefined) {
    output.temperature = source.temperature;
  }
  if (source.top_p !== undefined) {
    output.top_p = source.top_p;
  }
  if (source.stop_sequences !== undefined) {
    output.stop = source.stop_sequences;
  }
  if (source.stream !== undefined) {
    output.stream = source.stream;
  }

  // BatchTool 不走 OpenAI 兼容层，其他工具统一转成 function tool schema。
  const tools = toArray(source.tools)
    .filter((tool) => toString(toObject(tool).type) !== 'BatchTool')
    .map((tool) => {
      const toolObj = toObject(tool);
      return {
        type: 'function',
        function: {
          name: toString(toolObj.name),
          description: toolObj.description,
          parameters: cleanSchema(toolObj.input_schema ?? {}),
        },
      };
    });

  if (tools.length > 0) {
    output.tools = tools;
  }

  if (source.tool_choice !== undefined) {
    output.tool_choice = source.tool_choice;
  }

  return output;
}

// 把 OpenAI 风格响应转换回 Anthropic message 结构。
export function openAIToAnthropic(body: unknown): Record<string, unknown> {
  const source = toObject(body);
  const choices = toArray(source.choices);
  const firstChoice = toObject(choices[0]);
  const message = toObject(firstChoice.message);

  const content: Array<Record<string, unknown>> = [];

  // reasoning/reasoning_content 在 Anthropic 侧还原成 thinking block。
  const reasoningContent = toString(message.reasoning_content) || toString(message.reasoning);
  if (reasoningContent) {
    content.push({ type: 'thinking', thinking: reasoningContent });
  }

  const textContent = message.content;
  if (typeof textContent === 'string' && textContent) {
    content.push({ type: 'text', text: textContent });
  } else if (Array.isArray(textContent)) {
    for (const part of textContent) {
      const partObj = toObject(part);
      if (partObj.type === 'text' && typeof partObj.text === 'string' && partObj.text) {
        content.push({ type: 'text', text: partObj.text });
      }
    }
  }

  const toolCalls = toArray(message.tool_calls);
  for (const toolCall of toolCalls) {
    const toolCallObj = toObject(toolCall);
    const functionObj = toObject(toolCallObj.function);
    const argsString = toString(functionObj.arguments) || '{}';
    // function.arguments 是 JSON 字符串，尽量解析回对象给 tool_use.input。
    let parsedArgs: unknown = {};
    try {
      parsedArgs = JSON.parse(argsString);
    } catch {
      parsedArgs = {};
    }

    const toolUseBlock: Record<string, unknown> = {
      type: 'tool_use',
      id: toString(toolCallObj.id),
      name: toString(functionObj.name),
      input: parsedArgs,
    };

    // 尽量保留 extra_content 或 thought_signature 之类的额外元信息。
    let extraContent: unknown = toolCallObj.extra_content;
    if (extraContent === undefined) {
      const functionObject = toOptionalObject(toolCallObj.function);
      if (functionObject?.extra_content !== undefined) {
        extraContent = functionObject.extra_content;
      } else {
        const thoughtSignature = toString(functionObject?.thought_signature);
        if (thoughtSignature) {
          extraContent = {
            google: {
              thought_signature: thoughtSignature,
            },
          };
        }
      }
    }

    if (extraContent !== undefined) {
      toolUseBlock.extra_content = extraContent;
    }

    content.push(toolUseBlock);
  }

  const usage = toObject(source.usage);

  return {
    id: toString(source.id),
    type: 'message',
    role: 'assistant',
    content,
    model: toString(source.model),
    stop_reason: mapStopReason(
      typeof firstChoice.finish_reason === 'string' ? firstChoice.finish_reason : null
    ),
    stop_sequence: null,
    usage: {
      input_tokens: Number(usage.prompt_tokens) || 0,
      output_tokens: Number(usage.completion_tokens) || 0,
    },
  };
}

// 规范化 OpenAI chat/completions 端点地址，兼容标准 OpenAI 与 Gemini OpenAI 兼容网关。
export function buildOpenAIChatCompletionsURL(baseURL: string): string {
  const normalized = baseURL.trim().replace(/\/+$/, '');
  if (!normalized) {
    return '/v1/chat/completions';
  }
  if (normalized.endsWith('/chat/completions')) {
    return normalized;
  }

  if (normalized.includes('generativelanguage.googleapis.com')) {
    if (normalized.endsWith('/v1beta/openai') || normalized.endsWith('/v1/openai')) {
      return `${normalized}/chat/completions`;
    }
    if (normalized.endsWith('/v1beta') || normalized.endsWith('/v1')) {
      const betaBase = normalized.endsWith('/v1')
        ? `${normalized.slice(0, -3)}v1beta`
        : normalized;
      return `${betaBase}/openai/chat/completions`;
    }
    return `${normalized}/v1beta/openai/chat/completions`;
  }

  // 处理 `/v1`、`/v4` 这类已经带版本号的路径。
  if (/\/v\d+$/.test(normalized)) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
}
