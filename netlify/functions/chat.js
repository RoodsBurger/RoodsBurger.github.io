import { Pinecone } from '@pinecone-database/pinecone';

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

        // Get embedding from Cohere
        console.log('Getting embedding from Cohere...');
        const embedResponse = await fetch('https://api.cohere.ai/v1/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texts: [message],
                model: 'embed-english-v3.0',
                input_type: 'search_query'
            })
        });

        if (!embedResponse.ok) {
            throw new Error(`Cohere embedding error: ${await embedResponse.text()}`);
        }

        const embedData = await embedResponse.json();
        const queryEmbedding = embedData.embeddings[0];

        // Initialize Pinecone
        console.log('Initializing Pinecone...');
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        
        console.log('Pinecone initialized successfully');
        
        // Query Pinecone
        console.log('Querying Pinecone...');
        const index = pc.index(process.env.INDEX_NAME);
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });
        
        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join('\n');

        console.log('Retrieved context:', context.substring(0, 200) + '...'); // Log a preview of context

        // Generate chat response with Cohere v2 API
        console.log('Generating chat response with Cohere v2...');
        console.log('Message to send:', message);

        const chatResponse = await fetch('https://api.cohere.ai/v2/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                model: 'command-r-plus-08-2024',
                chat_history: [],
                prompt: `You are an AI assistant for Rodolfo's portfolio website. 
                        Use this context to answer questions about Rodolfo: ${context}
                        Be friendly and concise. If you're not sure about something, 
                        say so rather than making assumptions.`,
                temperature: 0.7
            })
        });

        if (!chatResponse.ok) {
            const errorText = await chatResponse.text();
            console.error('Cohere API error response:', errorText);
            throw new Error(`Cohere chat error: ${errorText}`);
        }

        const chatData = await chatResponse.json();
        console.log('Cohere chat response structure:', JSON.stringify(chatData).substring(0, 500));

        // Extract text according to the v2 API structure
        let responseText = chatData.text || "I couldn't generate a response at this time.";

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response: responseText
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