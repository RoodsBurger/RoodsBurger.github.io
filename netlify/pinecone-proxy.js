// netlify/functions/pinecone-proxy.js

exports.handler = async function(event, context) {
    // Parse the JSON body sent by the client
    const data = JSON.parse(event.body);
    
    try {
      // Make the API call to Pinecone
      const response = await fetch('https://rodolfo-portfolio.us-east-1.pinecone.io/query', {
        method: 'POST',
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY, // set in Netlify environment
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
      
    } catch (error) {
      console.error('Pinecone Proxy Error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error connecting to Pinecone' })
      };
    }
  };
  