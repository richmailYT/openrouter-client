export type Quantizations =
  | 'int4'
  | 'int8'
  | 'fp6'
  | 'fp8'
  | 'fp16'
  | 'bf16'
  | 'unknown';

export type Config = {
  //Headers
  httpReferer?: string;
  xTitle?: string;
  //Actual config
  response_format?: { type: 'json_object' };

  // https://openrouter.ai/docs/provider-routing
  provider?: {
    order?: string[];
    ignore?: string[];
    quantizations?: Quantizations[];
    data_collection?: 'allow' | 'deny';
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };

  stop?: string | string[];

  //For some reason, OpenRouter docs on https://openrouter.ai/docs/requests don't say they support this but https://openrouter.ai/docs/parameters  say they do
  min_p?: number // Range: (0, 1]

  // See LLM Parameters (openrouter.ai/docs/parameters)
  max_tokens?: number; // Range: [1, context_length)
  temperature?: number; // Range: [0, 2]
  top_p?: number; // Range: (0, 1]
  top_k?: number; // Range: [1, Infinity) Not available for OpenAI models
  frequency_penalty?: number; // Range: [-2, 2]
  presence_penalty?: number; // Range: [-2, 2]
  repetition_penalty?: number; // Range: (0, 2]
  seed?: number; // OpenAI only

  tools?: Tool[];
  tool_choice?: ToolChoice;

  //OpenRouter only. Will not be passed to providers
  //openrouter.ai/docs/transforms
  transforms?: ['middle-out'] | [];
} & ({
  model: string[];
  route: 'fallback';
} | {
  model?: string;
  route?: undefined;
})

type FunctionDescription = {
  description?: string;
  name: string;
  parameters: object; // JSON Schema object
};

export type Tool = {
  type: 'function';
  function: FunctionDescription;
};

export type ToolChoice =
  | 'none'
  | 'auto'
  | {
    type: 'function';
    function: {
      name: string;
    };
  };

export type VerboseContent = {}
  | { type: 'text'; content: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | VerboseContent;
}

export type Error = {
  code: number; // See "Error Handling" section
  message: string;
};

export type FunctionCall = {
  name: string;
  arguments: string; // JSON format arguments
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: FunctionCall;
};

export interface ResponseChoiceNonStreaming {
  finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
  message: {
    content: string | null;
    role: string;
    tool_calls?: ToolCall[];
  };
  error?: Error;
}

export interface ResponseUsage {
  /** Including images and tools if any */
  prompt_tokens: number;
  /** The tokens generated */
  completion_tokens: number;
  /** Sum of the above two fields */
  total_tokens: number;
}

export interface ResponseSuccess {
  id: string;

  choices: ResponseChoiceNonStreaming[];
  created: number; // Unix timestamp
  model: string;

  system_fingerprint?: string; // Only present if the provider supports it
  usage?: ResponseUsage;
}

export interface ResponseError {
  error: {
    status: number;
    message: string;
    metadata?: unknown;
  };
}

export interface GenerationStats {
  data: {
    id: string;
    model: string;
    streamed: false;
    generation_time: number;
    created_at: Date;
    tokens_prompt: number;
    tokens_completion: number;
    native_tokens_prompt: number;
    native_tokens_completion: number;
    num_media_prompt: null;
    num_media_completion: null;
    origin: string;
    total_cost: number;
    cache_discount: null;
  };
}

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
  globalConfig: Config;

  constructor(apiKey: string, globalConfig?: Config) {
    this.apiKey = apiKey;
    this.globalConfig = globalConfig || {};
  }

  async chat(
    messages: Message[],
    config?: Config
  ): Promise<
    | { success: true; data: ResponseSuccess }
    | {
      success: false;
      errorCode: number;
      errorMessage: string;
      metadata?: unknown;
    }
  > {
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
        body: JSON.stringify({ messages: messages, ...config }),
      }
    );
    const response: ResponseSuccess | ResponseError = await request.json();
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

  async getGenerationStats(id: string): Promise<GenerationStats> {
    const request = await fetch(
      `https://openrouter.ai/api/v1/generation?id=${id}`
    );
    return await request.json();
  }
}
