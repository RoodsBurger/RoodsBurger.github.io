import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClient } from 'cohere-ai';

const headers = {
    'Access-Control-Allow-Origin': 'https://rraimundo.me',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        console.log('Starting chat function...');
        const requestBody = JSON.parse(event.body);
        const message = requestBody.message;
        console.log('Received message:', message);

        // Validate message
        if (!message || typeof message !== 'string' || !message.trim()) {
            console.warn('Warning: Empty or invalid message received');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message is required and must be non-empty' })
            };
        }

        // Initialize Cohere client
        console.log('Initializing Cohere client...');
        const cohere = new CohereClient({
            token: process.env.COHERE_API_KEY
        });

        // Get embedding from Cohere v2
        console.log('Getting embedding from Cohere v2...');
        const embedResponse = await cohere.v2.embed({
            texts: [message],
            model: 'embed-english-v3.0',
            inputType: 'search_query',
            embeddingTypes: ['float']
        });

        // Log the full response structure for debugging
        console.log('Full embed response structure:', JSON.stringify(embedResponse, null, 2).substring(0, 500));

        // Check if embeddings exist before accessing
        if (!embedResponse.embeddings || !embedResponse.embeddings[0]) {
            console.error('No embeddings returned from Cohere');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to generate embeddings' })
            };
        }

        const queryEmbedding = embedResponse.embeddings[0];

        // Initialize Pinecone
        console.log('Initializing Pinecone...');
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        
        // Query Pinecone
        console.log('Querying Pinecone...');
        console.log('Query embedding type:', typeof queryEmbedding);
        
        if (queryEmbedding) {
            console.log('Query embedding preview:', JSON.stringify(queryEmbedding).substring(0, 100) + '...');
        } else {
            console.log('Query embedding is undefined or null');
        }

        // Make sure queryEmbedding is an array of numbers
        let vectorToQuery = queryEmbedding;
        if (typeof queryEmbedding === 'object' && !Array.isArray(queryEmbedding)) {
            // If it's an object, try to extract the values
            vectorToQuery = queryEmbedding.values || Object.values(queryEmbedding);
            console.log('Extracted vector values');
        }

        // Debug logging for vector
        console.log('Vector type:', typeof vectorToQuery);
        console.log('Is array:', Array.isArray(vectorToQuery));
        if (Array.isArray(vectorToQuery)) {
            console.log('Vector length:', vectorToQuery.length);
            console.log('First few values:', vectorToQuery.slice(0, 5));
        }

        const index = pc.index(process.env.INDEX_NAME);
        const queryResponse = await index.query({
            vector: vectorToQuery,
            topK: 3,
            includeMetadata: true
        });
        
        let context = "";
        if (queryResponse.matches && queryResponse.matches.length > 0) {
            context = queryResponse.matches
                .filter(match => match.metadata && match.metadata.text)
                .map(match => match.metadata.text)
                .join('\n');
            console.log('Retrieved context:', context.substring(0, 200) + '...');
        } else {
            console.log('No relevant context found in Pinecone');
            context = "No specific information available.";
        }

        // Generate chat response with Cohere v2 API
        console.log('Generating chat response with Cohere v2...');
        
        const chatResponse = await cohere.chat({
            model: "command",
            messages: [
                {
                    role: "user",
                    content: message
                }
            ],
            preamble: `You are an AI assistant for Rodolfo's portfolio website. 
                      Use this context to answer questions about Rodolfo: ${context}
                      Be friendly and concise. If you're not sure about something, 
                      say so rather than making assumptions.`
        });
        
        if (chatResponse && chatResponse.text) {
            console.log('Cohere chat response preview:', chatResponse.text.substring(0, 200) + '...');
        } else {
            console.log('No valid response from Cohere chat');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response: chatResponse.text || "I'm sorry, I couldn't generate a response at the moment."
            })
        };
    } catch (error) {
        console.error('Error in chat function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};