export type Quantizations =
    | 'int4'
    | 'int8'
    | 'fp6'
    | 'fp8'
    | 'fp16'
    | 'bf16'
    | 'unknown';

export type ResponseFormatTypes = "string" | "number" | "boolean";
export type ResponseFormatObject = {
    type: "object";
    properties: Record<string, {
        type: ResponseFormatTypes | ResponseFormatTypes[];
        description?: string;
        enum?: any[];
    }>;
    required?: string[];
    additionalProperties?: boolean;
};

export type ResponseFormatArray = {
    type: "array";
    items: ResponseFormatObject | ResponseFormatArray;
};

export type Config = {
    //Headers
    httpReferer?: string;
    xTitle?: string;

    //Actual config
    // Docs for reasoning: https://openrouter.ai/docs/use-cases/reasoning-tokens
    reasoning?: {
        exclude?: boolean,
        enabled?: boolean
    } & ({
        effort?: "high" | "medium" | "low"
    } | {
        max_tokens?: number
    })

    response_format?: { type: 'json_object' } | {
        type: 'json_schema';
        json_schema: {
            name: string;
            strict: boolean;
            schema: ResponseFormatObject;
        };
    };

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

    min_p?: number // Range: (0, 1]

    // See LLM Parameters (openrouter.ai/docs/parameters)
    max_tokens?: number; // Range: [1, context_length)
    temperature?: number; // Range: [0, 2]
    top_a?: number; // Range: [0, 1]
    top_p?: number; // Range: (0, 1]
    top_k?: number; // Range: [1, Infinity) Not available for OpenAI models
    frequency_penalty?: number; // Range: [-2, 2]
    presence_penalty?: number; // Range: [-2, 2]
    repetition_penalty?: number; // Range: (0, 2]
    seed?: number; // OpenAI only

    logit_bias?: { [key: number]: number };

    tools?: Tool[];
    tool_choice?: ToolChoice;

    //OpenRouter only. Will not be passed to providers
    //openrouter.ai/docs/transforms
    transforms?: ['middle-out'] | [];

    // Reduce latency by providing the model with a predicted output
    // https://platform.openai.com/docs/guides/latency-optimization#use-predicted-outputs
    prediction?: { type: 'content'; content: string };
} & ({
    // Docs: openrouter.ai/docs/model-routing
    models: string[];
    route: 'fallback';
} | {
    model?: string;
    route?: undefined;
})

export type FunctionDescription = {
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
    content: string | VerboseContent[];
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
        reasoning: string | null;
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