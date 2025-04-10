# Portfolio Website

A modern, responsive personal portfolio website showcasing my work in robotics, machine learning, and industrial design.

## Overview

This portfolio website serves as a showcase for my professional work, projects, and skills. Built with modern web technologies and a focus on user experience, it features detailed project descriptions, interactive components, and an AI-powered chatbot assistant that can answer questions about my background and experience.

## Features

- **Responsive Design**: Seamlessly adapts to all device sizes from mobile to desktop
- **Project Showcase**: Detailed pages for each major project with images, videos, and technical details
- **Interactive Carousel**: Dynamic project carousel for easy navigation through featured work
- **AI Assistant**: Integrated chatbot powered by Cohere's LLM API and Pinecone vector database
- **Floating Chat Widget**: Accessible AI assistant from any page
- **Dark/Light Mode Navigation**: Context-aware navigation that changes based on scroll position
- **Custom CSS Animations**: Smooth transitions and loading effects
- **Mobile-Optimized Video Players**: Custom video handling for mobile experiences

## Technology Stack

- **Frontend**:
  - HTML5, CSS3 (with custom utility classes)
  - Tailwind CSS for styling
  - JavaScript (vanilla) for interactivity
  - Web Components for reusable UI elements

- **Backend**:
  - Netlify Functions (serverless)
  - Cohere API for language model capabilities
  - Pinecone for vector database and semantic search

- **Tools & Libraries**:
  - React for the Project Carousel component
  - PyBullet for physics simulations (projects)
  - Fusion 360 for 3D design (projects)

## Project Structure

```
/
├── index.html                # Homepage
├── chat.html                 # Dedicated chat page
├── hobbies.html              # Personal interests page
├── floating-chat.html        # Chat widget component
├── styles.css                # Global styles
├── scripts.js                # Main JavaScript
├── navbar.js                 # Navigation functionality
├── navbar-component.js       # Web component for navigation
├── floating-chat.js          # Chat widget functionality
├── chat_style.js             # Chat styling and animations
├── ProjectCarousel.js        # React carousel component
├── projects/                 # Project pages
│   ├── chat-project.html     # LLM Assistant project
│   ├── knolling.html         # Knolling Bot project
│   ├── pruning.html          # Neural Network Pruning project
│   ├── tobias.html           # Tobias Robot project
│   └── wallet.html           # Magnetic Wallet project
├── artifacts/                # Images and media files
│   └── ...
├── knowledge_base_setup.py   # Script for AI knowledge base setup
└── chat.js                   # Serverless function for AI chat
```

## AI Assistant Implementation

The portfolio includes a custom AI assistant that can answer questions about my background, skills, and projects:

1. **Knowledge Base**: The assistant uses a vector database (Pinecone) populated with embeddings from portfolio content
2. **Query Processing**:
   - User queries are embedded using Cohere's embedding API
   - Similarity search finds the most relevant content chunks
   - Relevant context is sent to the LLM along with the query
3. **Response Generation**:
   - Cohere's Command-R model generates responses based on the provided context
   - The assistant is instructed to only use verified information from the context

## Setup and Deployment

### Prerequisites
- Node.js and npm
- Cohere API key
- Pinecone API key

### Local Development
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   ```
   COHERE_API_KEY=your_cohere_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   INDEX_NAME=your_pinecone_index_name
   ```
4. Run the knowledge base setup script:
   ```
   python knowledge_base_setup.py
   ```
5. Start the local development server:
   ```
   netlify dev
   ```

### Deployment
The site is configured for deployment on Netlify:

1. Connect your GitHub repository to Netlify
2. Configure environment variables in Netlify settings
3. Deploy with the following build settings:
   - Build command: `npm run build`
   - Publish directory: `/`
   - Functions directory: `/netlify/functions`

## Future Improvements

- Add blog/writing section
- Implement dark/light theme toggle
- Expand project documentation
- Enhance the AI assistant with more capabilities
- Add internationalization support

## Contact

For questions or feedback, please reach out via:
- Email: r.raimundo@columbia.edu
- GitHub: [github.com/RoodsBurger](https://github.com/RoodsBurger)
- LinkedIn: [linkedin.com/in/rodolfo-raimundo](https://www.linkedin.com/in/rodolfo-raimundo)