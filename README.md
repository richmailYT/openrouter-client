# OpenRouter-client

# Info

This is a simple API wrapper for OpenRouter.

# Documentation

Example use case

```js
import { OpenRouter } from "openrouter-client";
const OpenRouterClient = new OpenRouter("API KEY HERE");

let nl = await OpenRouterClient.chat([{
    role: "system",
    content:
        "ONLY reply with 'minecraft'. Do not reply with anything else under any circumstances",
}, {
    role: "user",
    content: [
        { type: "text", text: "Hello World" },
        // Images can also be added
        // {
        //     type: "image_url",
        //     image_url: {
        //         url: `data:image/png;base64,${base64Image}`
        //     }
        // }
    ],
}], {
    // General configuration goes here

    model: "meta-llama/llama3.2-3b-instruct", // Required. This is the name of the model on OpenRouter
    temperature: 0.7, // Optional
    min_p: 0.05, // Optional

    // OpenRouter only configuration option. Read OpenRouter documentation for more information
    provider: {
        order: [
            "DeepInfra",
            "Hyperbolic",
        ],
    },
});
```

A global configuration can also be set. Any options set here will be applied to
**EVERY** chat.

```js
import { OpenRouter } from "openrouter-client";
const OpenRouterClient = new OpenRouter("API KEY HERE", {
    //global configuration can be set here

    model: "meta-llama/llama3.2-3b-instruct",
    min_p: 0.05, // Optional

    // OpenRouter only configuration option. Read OpenRouter documentation for more information
    provider: {
        order: [
            "DeepInfra",
            "Hyperbolic",
        ],
    },
});
```

Retrive information of a chat with `getGenerationStats()`

```js
import { OpenRouter } from "openrouter-client";
const OpenRouterClient = new OpenRouter("API KEY HERE");
// You get the ID from what `OpenRouterClient.chat()` returns
let nl = await OpenRouterClient.chat([{
    role: "user",
    content: [
        { type: "text", text: "Hello World" },
    ],
}], {
    model: "meta-llama/llama3.2-3b-instruct",
});

if (nl.success == false) {
    console.log(nl.error);
    process.exit(0);
}

const gen = OpenRouterClient.getGenerationStats(nl.data.id);
console.log(gen);
```

# Streaming

The streaming version also supports a global configuration.

```js
import { OpenRouterStream } from "openrouter-client";
const OpenRouterClient = new OpenRouterStream("API KEY HERE", {
    model: "meta-llama/llama3.2-3b-instruct",
    min_p: 0.05,
});
```

There are 2 ways you can stream. The first way is by chunks. Every new "data"
message will only contain the token that was generated.

```js
import { OpenRouterStream } from "openrouter-client";
const OpenRouterClient = new OpenRouterStream("API KEY HERE");

OpenRouterClient.on("error", (e) => {
    console.log(`Error: ${e}`);
});

OpenRouterClient.on("end", (data) => {
    console.log("Stream end");
});

OpenRouterClient.on("data", (data) => {
    // Type of the `data` variable

    // {
    //   id: string
    //   provider: string,
    //   model: string,
    //   object: 'chat.completion.chunk',
    //   created: number,
    //   choices: [
    //     { index: 0, delta: { role: "assistant", content: string }, finish_reason: null | string, logprobs: null | number[] }
    //   ],
    //   usage?: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
    // }
    console.log(data);
});

let nl = await OpenRouterClient.chatStreamChunk([{
    role: "user",
    content: [
        { type: "text", text: "Hello World" },
    ],
}], {
    model: "meta-llama/llama3.2-3b-instruct",
});
```

The second way is the "whole" way. This function passes back the entire object.
So the first message might be { content: "hello" } and the second message might
be { content: "hello world" }. This differs from `chatStreamChunk`, which only
sends the new token that was generated instead of the whole object.

```js
import { OpenRouterStream } from "openrouter-client";
const OpenRouterClient = new OpenRouterStream("API KEY HERE");

OpenRouterClient.on("error", (e) => {
    console.log(`Error: ${e}`);
});

OpenRouterClient.on("end", (data) => {
    console.log("Stream end");
});

OpenRouterClient.on("data", (data) => {
    // Type of the `data` variable

    // {
    //   id: string
    //   provider: string,
    //   model: string,
    //   object: 'chat.completion.chunk',
    //   created: number,
    //   finish_reason: string,
    //   choices: { role: "system" | "assistant" | "user", content: string, reasoning: string | null }[],
    //   usage?: { prompt_tokens: number, completion_tokens: number, total_tokens: number }
    // }
    console.log(data);
});

let nl = await OpenRouterClient.chatStreamWhole([{
    role: "user",
    content: [
        { type: "text", text: "Hello World" },
    ],
}], {
    model: "meta-llama/llama3.2-3b-instruct",
});
```

# How to use reasoning

Non-streaming example

```js
import { OpenRouter } from "openrouter-client";
const OpenRouterClient = new OpenRouter("API key here");

let nl = await OpenRouterClient.chat([{
    role: "user",
    content: [
        { type: "text", text: "Hello World" },
    ],
}], {
    model: "deepseek/deepseek-r1-0528-qwen3-8b",

    // Reasoning options can be added here
    reasoning: {
        enabled: true,
        // exclude?: boolean,
        // effort?: "high" | "medium" | "low"
        // max_tokens?: number
    },
});

console.dir(nl);
```

For streaming, just import and use `OpenRouterStream` instead of `OpenRouter`.
All the other code stays the same
