class ChatInterface {
    constructor() {
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.userInput = document.getElementById('user-input');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = this.userInput.value.trim();
            if (!message) return;

            // Add user message to chat
            this.addMessage(message, true);
            this.userInput.value = '';
            
            try {
                // Show loading state
                this.addLoadingMessage();
                
                // Get relevant context from Pinecone
                const queryEmbedding = await this.getEmbedding(message);
                const context = await this.queryPinecone(queryEmbedding);
                
                // Generate response with Cohere
                const response = await this.generateResponse(message, context);
                
                // Remove loading message and add response
                this.removeLoadingMessage();
                this.addMessage(response);
            } catch (error) {
                console.error('Error:', error);
                this.removeLoadingMessage();
                this.addMessage('Sorry, I encountered an error. Please try again.');
            }
        });

        // Use requestSubmit to trigger a trusted submit event when Enter is pressed
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.chatForm.requestSubmit) {
                    this.chatForm.requestSubmit();
                } else {
                    this.chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }
        });
    }

    async getEmbedding(text) {
        // Use the correct endpoint for embeddings
        const response = await fetch('https://api.cohere.ai/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer rqSc1qIkHG1TiMUGD2Eml0D4Lw6Rf2XpRsUgfSqr`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                texts: [text],
                model: 'embed-english-v3.0',
                input_type: 'search_query'
            })
        });
        if (!response.ok) {
            throw new Error(`Cohere Embedding API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.embeddings[0];
    }

    async queryPinecone(embedding) {
        const response = await fetch(`/.netlify/functions/pinecone-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                vector: embedding,
                topK: 3,
                includeMetadata: true
            })
        });
        if (!response.ok) {
            throw new Error(`Pinecone API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.matches.map(match => match.metadata.text).join('\n');
    }

    async generateResponse(message, context) {
        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer rqSc1qIkHG1TiMUGD2Eml0D4Lw6Rf2XpRsUgfSqr`,
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
        if (!response.ok) {
            throw new Error(`Cohere Chat API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.response.text;
    }

    addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start gap-4 mb-4 animate-fade-in';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = `w-8 h-8 rounded-full ${isUser ? 'bg-gray-100' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0`;
        
        const icon = document.createElement('svg');
        icon.className = `w-4 h-4 ${isUser ? 'text-gray-600' : 'text-blue-600'}`;
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('viewBox', '0 0 24 24');
        
        icon.innerHTML = isUser 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
        
        iconDiv.appendChild(icon);
        messageDiv.appendChild(iconDiv);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'flex-1';
        textDiv.innerHTML = `<p class="text-gray-600 whitespace-pre-wrap">${content}</p>`;
        messageDiv.appendChild(textDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-message';
        loadingDiv.className = 'flex items-center gap-2 text-gray-500 mb-4';
        loadingDiv.innerHTML = `
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span>Thinking...</span>
        `;
        this.chatMessages.appendChild(loadingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    removeLoadingMessage() {
        const loadingDiv = document.getElementById('loading-message');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add fade-in animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-out forwards;
        }
    `;
    document.head.appendChild(style);

    new ChatInterface();
});
