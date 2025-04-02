from pinecone import Pinecone
from app.config import PINECONE_API_KEY

PC = Pinecone(api_key=PINECONE_API_KEY)
PC_INDEX_NAME = 'chatbot'

LANGFUSE_HOST  = "https://cloud.langfuse.com"