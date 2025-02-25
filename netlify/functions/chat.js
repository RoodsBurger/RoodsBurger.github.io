import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClientV2 } from 'cohere-ai';

const headers = {
  'Access-Control-Allow-Origin': 'https://rraimundo.me',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
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

    if (!message || typeof message !== 'string' || !message.trim()) {
      console.warn('Warning: Empty or invalid message received');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required and must be non-empty' })
      };
    }

    console.log('Initializing Cohere client...');
    const cohere = new CohereClientV2({
      token: process.env.COHERE_API_KEY
    });

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
    console.log('Initializing Pinecone...');
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    console.log('Querying Pinecone...');
    let vectorToQuery = queryEmbedding;
    if (typeof queryEmbedding === 'object' && !Array.isArray(queryEmbedding)) {
      vectorToQuery = queryEmbedding.values || Object.values(queryEmbedding);
    }

    const index = pc.index(process.env.INDEX_NAME);
    const queryResponse = await index.query({
      vector: vectorToQuery,
      topK: 5, // Increased from 3 to 5 for more context
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

    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('Generating chat response with Cohere...');
    const messages = [
      {
        role: "system",
        content: `You are Rodolfo's AI assistant that provides information about Rodolfo Raimundo's work, projects, education, experiences, and interests.

          IMPORTANT RULES TO FOLLOW:
          1. ONLY share factual information about Rodolfo that is explicitly mentioned in the context provided to you.
          2. If asked about Rodolfo and you don't have specific information in the context, respond with "I don't have specific information about that aspect of Rodolfo's background" rather than making assumptions.
          3. NEVER invent or assume details about Rodolfo's biography, skills, projects, or interests that aren't explicitly stated in the context.
          4. When answering general technical questions unrelated to Rodolfo, you may provide helpful information based on your general knowledge.
          5. Keep responses concise, short, and focused on the question asked.
          6. Maintain a friendly, professional tone.

          The information about Rodolfo comes from multiple sources including his portfolio website, resume, CV, academic coursework, and other documents. These sources contain details about his projects, work experiences, academic background, skills, and personal interests.`
      },
      ...formattedHistory
    ];
    
    messages.push({
      role: "user",
      content: message
    });
    
    if (context && context !== "No specific information available about this topic.") {
      messages.push({
        role: "system",
        content: `Here is the ONLY verified information about Rodolfo from his portfolio, resume, CV, coursework, and other documents that you should use in your response. Do not make claims about Rodolfo beyond what is explicitly stated here: ${context}`
      });
    } else {
      messages.push({
        role: "system",
        content: `You do not have specific information about Rodolfo related to this query. If the question is about Rodolfo, acknowledge that you don't have that specific information. If it's a general technical question, you can answer based on your general knowledge.`
      });
    }
    
    const chatParams = {
      model: "command-r",
      messages: messages,
      temperature: 0.3, // Reduced temperature for more factual responses
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