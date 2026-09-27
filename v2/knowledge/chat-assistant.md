---
title: RAG Chat Assistant
url: /projects/chat-project
slug: chat-project
---

## What the RAG Chat Assistant is

The RAG Chat Assistant is the chat on Rodolfo Raimundo's site, rraimundo.me. Visitors ask it about Rodolfo's projects, work, education and interests, either on the chat page at /chat or through a floating widget on the other pages. A language model on its own will make things up about a person, so the assistant is a retrieval-augmented generation (RAG) system: it looks up passages from the site's own content first and answers only from those. Rodolfo built the first version in December 2024, alongside the first version of the site, using Cohere's Command R over the site's pages and documents. The 2026 rebuild added reranking, a curated knowledge base and Command A.

## How a question is answered

When a visitor asks something, the assistant embeds the question with Cohere's embed-v4.0 and matches it against a Pinecone index built from the site's content. Cohere's rerank-v4.0-fast reorders the candidates by relevance and keeps the strongest few, and those chunks go to Command A as documents. Command A is told to answer only from them, in the third person, leading with the answer and keeping it short. The reply streams back to the page as it's generated. Rodolfo picked Command A after benchmarking a few lighter models on speed, conciseness and resistance to prompt injection.

## The knowledge base

The Pinecone index behind the assistant is built from curated, third-person markdown files covering Rodolfo's background, experience, education, skills, hobbies and each project. An indexing script splits each file by heading into self-contained chunks, embeds them, and stores each one with its title, section and page URL, so an answer can point back to the page it came from. Rebuilding the index after a content change is one command, which keeps the assistant in step with the site.

## Stack and safety

The assistant's back end runs on Netlify Functions, and conversation history stays on the visitor's side instead of being stored on a server. Requests are checked against the site's origin and rate-limited before any model call, so the assistant can't be driven from another site or hammered by a script. The site itself is built with Astro, React and Tailwind and hosted on Netlify. The assistant's code, the indexing script and the knowledge files are in the same public repository, github.com/RoodsBurger/RoodsBurger.github.io.
