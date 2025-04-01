import os
from dotenv import load_dotenv

load_dotenv()

PINECONE_API_KEY = os.environ["PINECONE_API_KEY"]
HUGGING_FACE_API_KEY = os.getenv("HUGGING_FACE_API_KEY")

#Langfuse
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")

#Shopify
SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET")
SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY")

#Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

#Database
DATABASE_URL = os.getenv("DATABASE_URL")

#Deepseek
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")