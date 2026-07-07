import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models

# In a real app we would use an embedding model like sentence-transformers or OpenAI embeddings
# For this MVP without external dependency on OpenAI, we'll stub the embedding generator
# or use a fast local one if required. For now, we mock the embedding dimension.

COLLECTION_NAME = "knowledge_base"
EMBEDDING_DIM = 384 # Example size for all-MiniLM-L6-v2

# For local development without docker, we might use memory or local disk. 
# But assuming Qdrant is on localhost:6333 or memory fallback.
import os

# Configure client based on environment
qdrant_host = os.getenv("QDRANT_HOST", "localhost")
client = QdrantClient(host=qdrant_host, port=6333)

def init_qdrant():
    collections = client.get_collections().collections
    if not any(c.name == COLLECTION_NAME for c in collections):
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=EMBEDDING_DIM, distance=models.Distance.COSINE),
        )

def get_embedding(text: str) -> list[float]:
    # TODO: Replace with actual local embedding model like FastEmbed or HuggingFace
    # For Phase 1 skeleton, returning dummy embeddings
    return [0.1] * EMBEDDING_DIM

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    # Very basic chunking
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunks.append(" ".join(words[i:i+chunk_size]))
    return chunks

def ingest_document(user_id: int, text: str, source: str, document_id: int = None, session_id: int = None):
    chunks = chunk_text(text)
    points = []
    for chunk in chunks:
        vector = get_embedding(chunk)
        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "user_id": user_id, 
                    "document_id": document_id, 
                    "session_id": session_id, 
                    "text": chunk, 
                    "source": source
                }
            )
        )
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )

def search_knowledge_base(user_id: int, query: str, session_id: int = None, attached_doc_ids: list[int] = None, limit: int = 5) -> list[dict]:
    query_vector = get_embedding(query)
    
    filter_conditions = [models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id))]
    
    session_or_docs = []
    if session_id is not None:
        session_or_docs.append(models.FieldCondition(key="session_id", match=models.MatchValue(value=session_id)))
    if attached_doc_ids:
        session_or_docs.append(
            models.FieldCondition(
                key="document_id",
                match=models.MatchAny(any=attached_doc_ids)
            )
        )
        
    if session_or_docs:
        filter_conditions.append(models.Filter(should=session_or_docs))
        
    query_filter = models.Filter(must=filter_conditions)

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=query_filter,
        limit=limit
    )
    return [{"text": hit.payload["text"], "source": hit.payload["source"], "score": hit.score} for hit in results.points]

# Initialize at startup
init_qdrant()
