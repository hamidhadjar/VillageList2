# Using Groq for the Ask / chat

The **Ask** page (`/ask`) lets users ask questions about the village biographies. Every question is sent to **Groq** (Llama 3.1 8B), with a short context summary of the data (total count, example birth/death places).

## Setup

1. Get an API key at [Groq Console](https://console.groq.com) → API Keys.
2. In your project `.env`: `GROQ_API_KEY=gsk_...`
3. Restart the dev server.

Without `GROQ_API_KEY`, the chat will ask the user to configure it.
