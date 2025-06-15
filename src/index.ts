import { EventEmitter } from "events";
import * as Types from "./types"

//Unused for now
export const errorCodesAndMesssages = {
  400: 'Bad Request (invalid or missing params, CORS)',
  401: 'Invalid credentials (OAuth session expired, disabled/invalid API key)',
  402: 'Your account or API key has insufficient credits. Add more credits and retry the request.',
  408: 'Your request timed out',
  429: 'You are being rate limited',
  502: 'Your chosen model is down or we received an invalid response from it',
  503: 'There is no available model provider that meets your routing requirements',
};
export class OpenRouter {
  apiKey: string;
  globalConfig: Types.Config;

  constructor(apiKey: string, globalConfig?: Types.Config) {
    this.apiKey = apiKey;
    this.globalConfig = globalConfig || {};
  }

  async chat(
    messages: Types.Message[],
    config?: Types.Config,
    signal?: AbortSignal
  ): Promise<
    | { success: true; data: Types.ResponseSuccess }
    | {
      success: false;
      errorCode: number;
      errorMessage: string;
      metadata?: unknown;
    } | { success: false, error: "AbortSignal" | unknown }
  > {
    config = config || this.globalConfig;

    const extraHeaders: Record<string, any> = {};
    if (config.httpReferer) {
      extraHeaders['HTTP-Referer'] = config.httpReferer;
    }

    if (config.xTitle) {
      extraHeaders['X-Title'] = config.xTitle;
    }

    let request;
    try {
      request = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          signal: signal,
          headers: {
            ...extraHeaders,
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: messages, ...config }),
        }
      );
    } catch (e) {
      if (typeof e == "object" && e !== null) {
        if ("name" in e) {
          if (e.name == "AbortError") {
            return { success: false, error: "AbortError" }
          }
        }
      }
      return { success: false, error: e }
    }
    const response: Types.ResponseSuccess | Types.ResponseError = await request.json();
    if ('error' in response) {
      return {
        success: false,
        errorCode: response.error.status,
        errorMessage: response.error.message,
        metadata: response.error.metadata,
      };
    }

    return { success: true, data: response };
  }

  async getGenerationStats(id: string): Promise<Types.GenerationStats> {
    const request = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${id}`
    );
    return await request.json();
  }
}

export class OpenRouterStream extends EventEmitter {
  apiKey: string;
  globalConfig: Types.Config;

  constructor(apiKey: string, globalConfig?: Types.Config) {
    super()
    this.apiKey = apiKey;
    this.globalConfig = globalConfig || {};
  }

  /** Sends back chunks. First message sent back might be "hello" and the second chunk might be " world" */
  async chatStreamChunk(messages: Types.Message[], config?: Types.Config) {
    config = config || this.globalConfig;

    const extraHeaders: Record<string, any> = {};
    if (config.httpReferer) {
      extraHeaders['HTTP-Referer'] = config.httpReferer;
    }

    if (config.xTitle) {
      extraHeaders['X-Title'] = config.xTitle;
    }

    const request = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          ...extraHeaders,
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messages, ...config, stream: true }),
      }
    );

    if (!request.ok || request.body === null) {
      const errorText = await request.text(); // Get error message from response
      this.emit('error', new Error(`HTTP error ${request.status}: ${errorText}`));
      return; // Important: Stop execution on error
    }

    const reader = request.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: true });
      const splitData = (buffer.split("\n")).filter(item => item !== "");

      for (let i = 0; i < splitData.length; i++) {
        const data = splitData[i]

        if (data === ": OPENROUTER PROCESSING") {
          buffer = buffer.slice(data.length + 1)
          continue
        }

        if (data.includes("[DONE]")) {
          this.emit("end")
          return;
        }

        let parsedData;
        try {
          parsedData = JSON.parse(data.split("data: ")[1])
          buffer = buffer.slice(data.length + 1)
        } catch (e) {
          //ignore invalid json. It was probably cut in half
          continue;
        }

        this.emit("data", parsedData)
      }
    }
  }

  //** This function passes back the entire object. So the first message might be { content: "hello" } and the second message might be { content: "hello world" }. This differs from `chatStreamChunk`, which only sends the new token that was generated instead of the whole object. */
  async chatStreamWhole(messages: Types.Message[], config?: Types.Config) {
    config = config || this.globalConfig;

    const extraHeaders: Record<string, any> = {};
    if (config.httpReferer) {
      extraHeaders['HTTP-Referer'] = config.httpReferer;
    }

    if (config.xTitle) {
      extraHeaders['X-Title'] = config.xTitle;
    }

    const request = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          ...extraHeaders,
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messages, ...config, stream: true }),
      }
    );

    if (!request.ok || request.body === null) {
      const errorText = await request.text(); // Get error message from response
      this.emit('error', new Error(`HTTP error ${request.status}: ${errorText}`));
      return;
    }

    const reader = request.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let whole: {
      id: string, provider: string, model: string, object: string, created: number, finish_reason: string, choices: {
        role: 'system' | 'user' | 'assistant';
        content: string | Types.VerboseContent[];
        reasoning: string | null;
      }[], usage?: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
    } = {
      id: "",
      provider: "",
      model: "",
      object: "",
      created: 0,
      finish_reason: "",

      //@ts-ignore
      choices: messages
    }
    whole.choices.push({ role: "user", content: "", reasoning: null }) //placeholder values that will be overwritten

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: true });
      const splitData = (buffer.split("\n")).filter(item => item !== "");

      for (let i = 0; i < splitData.length; i++) {
        const data = splitData[i]

        if (data === ": OPENROUTER PROCESSING") {
          buffer = buffer.slice(data.length + 1)
          continue
        }

        if (data.includes("[DONE]")) {
          this.emit("end")
          return;
        }

        let parsedData;
        try {
          parsedData = JSON.parse(data.split("data: ")[1])
          buffer = buffer.slice(data.length + 1)
        } catch (e) {
          //ignore invalid json. It was probably cut in half
          continue;
        }
        if ('usage' in parsedData) {
          // The "finish_reason" that comes with the "usage" data is always null because it was set in the message that came just before the "usage" data. Avoid overwriting that
          whole.usage = parsedData.usage
        } else {
          whole.id = parsedData.id
          whole.provider = parsedData.provider
          whole.model = parsedData.model
          whole.object = parsedData.object
          whole.created = parsedData.created
          whole.finish_reason = parsedData.choices[0].finish_reason
        }

        //@ts-ignore
        // There's no way this will EVER be undefined so we can ignore that
        whole.choices.at(-1).role = parsedData.choices[0].delta.role
        //@ts-ignore
        whole.choices.at(-1).content += parsedData.choices[0].delta.content
        //@ts-ignore
        if ((whole.choices.at(-1).reasoning == null) && (parsedData.choices[0].delta.reasoning)) {
          //@ts-ignore
          whole.choices.at(-1).reasoning = ""
        }
        if (parsedData.choices[0].delta.reasoning) {
          //@ts-ignore
          whole.choices.at(-1).reasoning += parsedData.choices[0].delta.reasoning
        }

        this.emit("data", whole)
      }
    }
  }
}

export * as types from "./types"