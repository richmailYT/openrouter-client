This is an API wrapper for OpenRouter.

# Examples

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
