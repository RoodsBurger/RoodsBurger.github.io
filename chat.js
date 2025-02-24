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
                
                // Call serverless function to handle the chat interaction
                const response = await this.generateResponse(message);
                
                // Remove loading message and add response
                this.removeLoadingMessage();
                this.addMessage(response);
            } catch (error) {
                console.error('Error:', error);
                this.removeLoadingMessage();
                this.addMessage('Sorry, I encountered an error. Please try again later.');
            }
        });

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

    async generateResponse(message) {
        try {
            console.log('Sending message to API:', message);
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            console.log('API response:', data); // Log the full response for debugging

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            return data.response || "I couldn't generate a response. Please try again.";
        } catch (error) {
            console.error('API Error:', error);
            throw new Error('Failed to get response from the chat service.');
        }
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
        const sanitizedContent = this.escapeHtml(content);
        textDiv.innerHTML = `<p class="text-gray-600 whitespace-pre-wrap">${sanitizedContent}</p>`;
        messageDiv.appendChild(textDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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