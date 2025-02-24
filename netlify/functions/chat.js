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
    const history = requestBody.history || [];
    console.log('Received message:', message);
    console.log('Conversation history length:', history.length);

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
    console.log('Query embedding type:', typeof queryEmbedding);
    
    if (queryEmbedding) {
      console.log('Query embedding preview:', JSON.stringify(queryEmbedding).substring(0, 100) + '...');
    } else {
      console.log('Query embedding is undefined or null');
    }

    // Ensure queryEmbedding is an array of numbers
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
    
    // Format conversation history for Cohere
    const formattedHistory = history.slice(0, -1).map(item => ({
      role: item.role === 'user' ? 'USER' : 'CHATBOT',
      message: item.message
    }));
    
    console.log('Formatted history:', JSON.stringify(formattedHistory).substring(0, 200));

    // Generate chat response with Cohere API
    console.log('Generating chat response with Cohere...');
    
    // More specific preamble to control verbosity
    const preamble = `You are an AI assistant for Rodolfo Raimundo's portfolio website. Your responses should be:
    1. Brief and to the point (2-4 sentences maximum unless asked for more detail)
    2. ONLY mention projects or background DIRECTLY relevant to the question
    3. Avoid filler phrases like "As mentioned in Rodolfo's portfolio"
    4. Format your answers with proper paragraphs
    5. Be accurate and specific based on the context provided
    6. NEVER make up information not present in the context`;
    
    // Log the parameters for debugging
    const chatParams = {
      model: "command-r",
      messages: [
        {
          role: "USER",
          message: `${message}\n\nUse this context to answer concisely:\n${context}\n\nRemember to be brief and only discuss directly relevant information.`
        }
      ]
    };
    
    // Add previous conversation messages if available
    if (formattedHistory.length > 0) {
      chatParams.chatHistory = formattedHistory;
    }
    
    // Add preamble
    chatParams.preamble = preamble;
    
    console.log('Chat params:', JSON.stringify(chatParams, null, 2));
    
    let chatResponse;
    try {
      chatResponse = await cohere.chat(chatParams);
    } catch (error) {
      console.error('Cohere API error:', error);
      throw error; // Rethrow to be caught by the outer try/catch
    }
    
    // Ensure the chatResponse is in the expected format.
    if (chatResponse && chatResponse.message && Array.isArray(chatResponse.message.content)) {
      // Log a preview of the response
      console.log('Cohere chat response preview:', chatResponse.message.content[0].text.substring(0, 200) + '...');
      
      // Return the full chat response under "message"
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: chatResponse.message
        })
      };
    } else {
      console.log('Full response from Cohere:', JSON.stringify(chatResponse, null, 2).substring(0, 500));
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