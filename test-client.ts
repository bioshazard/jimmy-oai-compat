import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: "dummy",
});

const response = await client.chat.completions.create({
  model: "llama3.1-8B",
  messages: [
    { role: "user", content: "Say hello in 5 words" },
  ],
});

console.log(response.choices[0].message.content);
