import { Pinecone } from '@pinecone-database/pinecone';
import cohere from 'cohere-ai';

// Initialize Cohere client
cohere.init(process.env.COHERE_API_KEY);

// Initialize Pinecone client
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT
});

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { message } = JSON.parse(event.body);

        // Get embedding for the query
        const embeddingResponse = await cohere.embed({
            texts: [message],
            model: 'embed-english-v3.0',
            input_type: 'search_query'
        });

        const queryEmbedding = embeddingResponse.embeddings[0];

        // Query Pinecone
        const index = pc.Index(process.env.INDEX_NAME);
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });

        // Extract relevant context
        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join('\n');

        // Generate response with Cohere
        const chatResponse = await cohere.chat({
            message: message,
            preamble: `You are an AI assistant for Rodolfo's portfolio website. 
                      Use this context to answer questions about Rodolfo: ${context}
                      Be friendly and concise. If you're not sure about something, 
                      say so rather than making assumptions.`,
            temperature: 0.7
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                response: chatResponse.text
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};