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
        const { message } = JSON.parse(event.body);

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

        // Initialize Pinecone with more flexibility
        console.log('Initializing Pinecone...');
        try {
        // First try with environment (for backward compatibility)
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        
        console.log('Pinecone initialized with environment parameter');
        
        // Query Pinecone
        console.log('Querying Pinecone...');
        const index = pc.index(process.env.INDEX_NAME);
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });
                
        } catch (error) {
        console.error('Error with Pinecone initialization:', error.message);
        throw error;
        }

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join('\n');

        // Generate chat response with Cohere
        console.log('Generating chat response...');
        const chatResponse = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                preamble: `You are an AI assistant for Rodolfo's portfolio website. 
                          Use this context to answer questions about Rodolfo: ${context}
                          Be friendly and concise. If you're not sure about something, 
                          say so rather than making assumptions.`,
                temperature: 0.7
            })
        });

        if (!chatResponse.ok) {
            throw new Error(`Cohere chat error: ${await chatResponse.text()}`);
        }

        const chatData = await chatResponse.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response: chatData.response.text
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