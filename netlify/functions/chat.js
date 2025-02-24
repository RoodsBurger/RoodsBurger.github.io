import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClientV2 } from 'cohere-ai';

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
        const cohere = new CohereClientV2({
            token: process.env.COHERE_API_KEY
        });

        // Get embedding from Cohere
        console.log('Getting embedding from Cohere...');
        const embedResponse = await cohere.embed({
            texts: [message],
            model: 'embed-english-v3.0',
            inputType: 'search_query',
            embeddingTypes: ['float']
        });

        // Check if embeddings exist before accessing
        if (!embedResponse.embeddings || !embedResponse.embeddings.float || !embedResponse.embeddings.float[0]) {
            console.error('No embeddings returned from Cohere');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to generate embeddings' })
            };
        }

        const queryEmbedding = embedResponse.embeddings.float[0];

        // Initialize Pinecone
        console.log('Initializing Pinecone...');
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        
        // Query Pinecone
        console.log('Querying Pinecone...');
        console.log('Vector type:', typeof queryEmbedding);
        console.log('Is array:', Array.isArray(queryEmbedding));
        
        if (Array.isArray(queryEmbedding)) {
            console.log('Vector length:', queryEmbedding.length);
            console.log('First few values:', queryEmbedding.slice(0, 5));
        }

        const index = pc.index(process.env.INDEX_NAME);
        const queryResponse = await index.query({
            vector: queryEmbedding,
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

        // Generate chat response with Cohere API
        console.log('Generating chat response with Cohere...');
        
        try {
            const chatResponse = await cohere.chat({
                model: "command-r-plus-08-2024",
                preamble: "You are an AI assistant for Rodolfo's portfolio website. Provide helpful information about Rodolfo's projects, background, and interests based on the context provided.",
                messages: [
                    {
                        role: "user",
                        content: message
                    },
                    {
                        role: "system",
                        content: `Use this context to answer the question: ${context}`
                    }
                ]
            });
            
            console.log('Full chat response:', JSON.stringify(chatResponse, null, 2).substring(0, 500));
            
            // Handle the new response structure
            if (chatResponse && chatResponse.message && chatResponse.message.content) {
                // The content might be an array of text objects
                if (Array.isArray(chatResponse.message.content)) {
                    const responseText = chatResponse.message.content
                        .filter(item => item.type === 'text')
                        .map(item => item.text)
                        .join('\n');
                        
                    console.log('Extracted response text:', responseText.substring(0, 200) + '...');
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            response: responseText
                        })
                    };
                } 
                // Or it might be a string directly
                else if (typeof chatResponse.message.content === 'string') {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            response: chatResponse.message.content
                        })
                    };
                }
            }
            
            // Fallback options for backward compatibility
            else if (chatResponse && chatResponse.text) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        response: chatResponse.text
                    })
                };
            } else if (chatResponse && chatResponse.response && chatResponse.response.text) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        response: chatResponse.response.text
                    })
                };
            } else {
                console.log('Unexpected response structure:', JSON.stringify(chatResponse, null, 2));
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        response: "I'm sorry, I couldn't generate a response at the moment."
                    })
                };
            }
        } catch (error) {
            console.error('Cohere API error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Error generating response',
                    details: error.message
                })
            };
        }
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