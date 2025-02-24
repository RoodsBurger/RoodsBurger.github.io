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
    const { message, conversationHistory = [] } = requestBody;
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
    
    // Ensure queryEmbedding is an array of numbers
    let vectorToQuery = queryEmbedding;
    if (typeof queryEmbedding === 'object' && !Array.isArray(queryEmbedding)) {
      vectorToQuery = queryEmbedding.values || Object.values(queryEmbedding);
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
      context = "No specific information available about this topic.";
    }

    // Format conversation history for Cohere
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Generate chat response with Cohere API
    console.log('Generating chat response with Cohere...');
    
    // Prepare messages array with system prompt, history, and current message
    const messages = [
      {
        role: "system",
        content: `You are a helpful, concise assistant for Rodolfo's portfolio website. 
        Follow these guidelines:
        1. Keep responses brief and to the point
        2. Only mention Rodolfo's projects when directly relevant to the question
        3. Answer general questions normally without forcing references to the portfolio
        4. Maintain a friendly, professional tone`
      },
      ...formattedHistory
    ];
    
    // Add the current user message with context
    messages.push({
      role: "user",
      content: message
    });
    
    // Add context as a separate system message if relevant
    if (context && context !== "No specific information available about this topic.") {
      messages.push({
        role: "system",
        content: `Here is some relevant information about Rodolfo that might help with your response: ${context}`
      });
    }
    
    const chatParams = {
      model: "command-r",
      messages: messages,
      temperature: 0.7
    };
    
    console.log('Chat params structure:', JSON.stringify({
      messageCount: chatParams.messages.length,
      modelName: chatParams.model
    }, null, 2));
    
    let chatResponse;
    try {
      chatResponse = await cohere.chat(chatParams);
    } catch (error) {
      console.error('Cohere API error:', error);
      throw error;
    }
    
    // Ensure the chatResponse is in the expected format
    if (chatResponse && chatResponse.message && Array.isArray(chatResponse.message.content)) {
      console.log('Cohere chat response preview:', chatResponse.message.content[0].text.substring(0, 200) + '...');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: chatResponse.message
        })
      };
    } else {
      console.log('Unexpected response format from Cohere:', JSON.stringify(chatResponse, null, 2).substring(0, 500));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: {
            content: [
              { type: "text", text: "I'm sorry, I couldn't generate a response at the moment." }
            ]
          }
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