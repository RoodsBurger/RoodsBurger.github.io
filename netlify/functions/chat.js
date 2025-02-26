import { Pinecone } from '@pinecone-database/pinecone';
import { CohereClientV2 } from 'cohere-ai';

const headers = {
  'Access-Control-Allow-Origin': 'https://rraimundo.me',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// List of keywords that might appear in academic papers but are likely not relevant to Rodolfo's bio
const ACADEMIC_KEYWORDS = [
  'coefficient', 'triangles', 'null model', 'assortativity', 
  'topological', 'phenomenon', 'covariance', 'algorithm', 'theorem',
  'approximation', 'logarithmic', 'distribution', 'lemma', 'proof',
  'wherein', 'citation', 'referenced', 'methodology', 'furthermore'
];

// Categorize sources as either profile-related or academic
const isProfileSource = (source) => {
  const profileSources = ['index.html', 'hobbies.html', 'rodolfo_resume.pdf', 'rraimundo_cv.pdf', 'tobias.html', 'knolling.html', 'pruning.html'];
  return profileSources.some(s => source.includes(s));
};

// Function to detect if a chunk is likely from an academic paper and not relevant to a bio question
const isLikelyAcademicContent = (text) => {
  // Count how many academic keywords appear in the text
  const keywordCount = ACADEMIC_KEYWORDS.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  ).length;
  
  // If text contains multiple academic keywords, it's likely an academic paper content
  return keywordCount >= 3;
};

// Filter context to remove likely irrelevant academic content for bio questions
const filterContext = (chunks, query) => {
  const queryLower = query.toLowerCase();
  const isPersonalQuestion = ['you', 'your', 'hobby', 'hobbies', 'interest', 'climb', 'climbing', 'ceramic', 'teaching'].some(term => 
    queryLower.includes(term)
  );
  
  if (isPersonalQuestion) {
    // For personal questions, prioritize profile sources and filter out academic content
    const filteredChunks = chunks.filter(chunk => {
      const source = chunk.metadata?.source || '';
      const text = chunk.metadata?.text || '';
      
      // Keep if it's from a profile source
      if (isProfileSource(source)) return true;
      
      // Filter out academic-looking content if it's not a profile source
      return !isLikelyAcademicContent(text);
    });
    
    // If we have at least some relevant chunks, return those
    return filteredChunks.length > 0 ? filteredChunks : chunks;
  }
  
  // For technical questions, keep everything
  return chunks;
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
    
    // Query more results than we need so we can filter afterwards
    const queryResponse = await index.query({
      vector: vectorToQuery,
      topK: 10, // Increased from 5 to 10 to allow for filtering
      includeMetadata: true
    });
    
    let context = "";
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      // Filter the matches based on relevance to the query
      const filteredMatches = filterContext(queryResponse.matches, message);
      
      // Use only the top 5 after filtering
      const topMatches = filteredMatches.slice(0, 5);
      
      console.log('Source files for context:');
      topMatches.forEach((match, idx) => {
        if (match.metadata && match.metadata.source) {
          console.log(`${idx + 1}. ${match.metadata.source} (score: ${match.score.toFixed(4)})`);
        }
      });
      
      context = topMatches
        .filter(match => match.metadata && match.metadata.text)
        .map(match => {
          // Add source information to the context for better debugging
          return `[From: ${match.metadata.source || 'unknown'}]\n${match.metadata.text}`;
        })
        .join('\n\n');
        
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
          8. You MUST never copy and paste from context, instead paraphrase in a natural, well-formatted, and readable fashion.
          9. When writting lists, use bullet points or numbered lists for clarity with proper spacing and line breaks.
          10. Maintain a friendly, professional tone.
          11. If the context seems completely unrelated to the question, you should say "I don't have specific information about that" rather than trying to force an answer based on irrelevant content.

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
      temperature: 0.3, 
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