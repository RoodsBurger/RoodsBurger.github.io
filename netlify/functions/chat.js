const { CohereClient } = require('cohere-ai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize Cohere client
const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY
});

// Initialize Pinecone client
const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT
});

exports.handler = async (event, context) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': 'https://rraimundo.me',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

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
        console.log('Parsing request body...');
        const { message } = JSON.parse(event.body);

        console.log('Getting embedding...');
        const embeddingResponse = await cohere.embed({
            texts: [message],
            model: 'embed-english-v3.0',
            inputType: 'search_query'
        });

        const queryEmbedding = embeddingResponse.embeddings[0];

        console.log('Querying Pinecone...');
        const index = pc.Index(process.env.INDEX_NAME);
        const queryResponse = await index.query({
            vector: queryEmbedding,
            topK: 3,
            includeMetadata: true
        });

        const context = queryResponse.matches
            .map(match => match.metadata.text)
            .join('\n');

        console.log('Generating chat response...');
        const chatResponse = await cohere.chat({
            message,
            preamble: `You are an AI assistant for Rodolfo's portfolio website. 
                      Use this context to answer questions about Rodolfo: ${context}
                      Be friendly and concise. If you're not sure about something, 
                      say so rather than making assumptions.`,
            temperature: 0.7,
            connectorId: 'rodolfo-portfolio'
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response: chatResponse.text
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