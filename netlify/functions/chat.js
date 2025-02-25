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
    
    // Filter conversation history to keep the most relevant messages
    let filteredHistory = [];
    
    if (conversationHistory.length > 0) {
      // Always keep the last exchange (most recent context)
      const lastExchangeStart = Math.max(0, conversationHistory.length - 2);
      const lastExchange = conversationHistory.slice(lastExchangeStart);
      
      // For older messages, get their embeddings and compute similarity
      if (conversationHistory.length > 2) {
        const olderMessages = conversationHistory.slice(0, lastExchangeStart);
        
        // Get embeddings for older messages
        const messageTexts = olderMessages.map(msg => msg.content);
        
        try {
          const historicalEmbedResponse = await cohere.embed({
            texts: messageTexts,
            model: 'embed-english-v3.0',
            inputType: messageTexts.map((_, i) => 
              olderMessages[i].role === 'user' ? 'search_query' : 'search_document'
            ),
            embeddingTypes: ['float']
          });
          
          if (historicalEmbedResponse.embeddings && historicalEmbedResponse.embeddings.float) {
            // Compute cosine similarity between current query and each historical message
            const similarities = historicalEmbedResponse.embeddings.float.map(embedding => {
              return cosineSimilarity(queryEmbedding, embedding);
            });
            
            // Create array of {message, similarity} pairs
            const messageSimilarities = olderMessages.map((msg, i) => ({
              message: msg,
              similarity: similarities[i] || 0
            }));
            
            // Sort by similarity (descending) and take top messages
            const topMessages = messageSimilarities
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, 3) // Keep top 3 most semantically relevant messages
              .map(item => item.message);
            
            // Combine with the last exchange
            filteredHistory = [...topMessages, ...lastExchange];
          } else {
            console.warn('No embeddings returned for historical messages, keeping only last exchange');
            filteredHistory = lastExchange;
          }
        } catch (error) {
          console.error('Error getting embeddings for historical messages:', error);
          filteredHistory = lastExchange;
        }
      } else {
        filteredHistory = lastExchange;
      }
    }
    
    console.log(`Filtered conversation history from ${conversationHistory.length} to ${filteredHistory.length} messages`);

    // Query Pinecone for relevant context
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

    const formattedHistory = filteredHistory.map(msg => ({
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
          4. When answering general technical questions related to Rodolfo, you may provide helpful information based on your general knowledge.
          5. You must not answer questions outside of the context provided to you about Rodolfo.
          6. If you are unsure about a response, you can ask for clarification or provide a general response.
          7. You MUST keep responses concise, short, and focused on the question asked.
          8. Maintain a friendly, professional tone.

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

// Utility function to compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}