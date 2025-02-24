import cohere
from pinecone import Pinecone, ServerlessSpec
import os
import html2text
from bs4 import BeautifulSoup
import re

def clean_text(text):
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove script and style content
    text = re.sub(r'<script.*?</script>', '', text, flags=re.DOTALL)
    text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL)
    return text.strip()

def chunk_text(text, chunk_size=500, overlap=50):
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        
        # Adjust chunk end to not split words
        if end < text_length:
            # Find the last space before the chunk_size
            while end > start and text[end] != ' ':
                end -= 1
        
        # Add the chunk
        chunks.append(text[start:end].strip())
        
        # Move start position, accounting for overlap
        start = end - overlap
    
    return chunks

def process_html_file(file_path, co, index):
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse HTML
    soup = BeautifulSoup(content, 'html.parser')
    
    # Extract main content sections
    main_content = []
    
    # Get title
    title = soup.title.string if soup.title else ''
    main_content.append(f"Title: {title}")
    
    # Get headings and their content
    for heading in soup.find_all(['h1', 'h2', 'h3', 'h4']):
        section_text = heading.get_text()
        next_sibling = heading.find_next_sibling()
        while next_sibling and next_sibling.name not in ['h1', 'h2', 'h3', 'h4']:
            if next_sibling.name in ['p', 'ul', 'ol']:
                section_text += "\n" + next_sibling.get_text()
            next_sibling = next_sibling.find_next_sibling()
        main_content.append(section_text)
    
    # Clean and combine content
    text = "\n\n".join(main_content)
    text = clean_text(text)
    
    # Create chunks
    chunks = chunk_text(text)
    
    # Get embeddings for chunks
    embeddings = co.embed(
        texts=chunks,
        model='embed-english-v3.0',
        input_type='search_query'
    ).embeddings
    
    # Prepare vectors for Pinecone
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        vectors.append({
            "id": f"{os.path.basename(file_path)}-{i}",
            "values": embedding,
            "metadata": {
                "text": chunk,
                "source": file_path,
                "chunk_index": i
            }
        })
    
    # Upload to Pinecone in batches
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i + batch_size]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i//batch_size + 1}/{(len(vectors)-1)//batch_size + 1}")

def main():
    # Initialize clients
    co = cohere.Client('rqSc1qIkHG1TiMUGD2Eml0D4Lw6Rf2XpRsUgfSqr')
    pc = Pinecone(api_key='pcsk_3Vgh69_Rk26rABeZR6wZaPzDfUi8K7mGVX1jG2ADR2XsmgCpbJNtivid8hB73pHcZdPqRe')
    
    index_name = "rodolfo-portfolio"
    
    # List existing indexes
    existing_indexes = pc.list_indexes()
    
    # Create index if it doesn't exist
    if not any(index.name == index_name for index in existing_indexes):
        pc.create_index(
            name=index_name,
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            ),
            dimension=1024,  # Cohere's embedding dimension
            metric="cosine"
        )
        print(f"Created new index: {index_name}")
    
    # Get the index
    index = pc.Index(index_name)
    
    # Process all HTML files
    files = ['../index.html', '../hobbies.html', '../projects/knolling.html', '../projects/pruning.html', '../projects/tobias.html']
    for file in files:
        process_html_file(file, co, index)
    
    print("Knowledge base setup complete!")

if __name__ == "__main__":
    main()