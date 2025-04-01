import asyncio
from dotenv import load_dotenv
import sys
from pathlib import Path
from app.services.rag_pipeline_service import RagPipelineService
from app.utils.prompt import create_prompt
from app.external_service.langfuse_observations import langfuse_tracker
from app.utils.logger import logger

project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

load_dotenv()

rag_service = RagPipelineService()
async def run_langfuse_tracking():
    products = [
        {
            "id": "1",
            "title": "Snowboard Pro X",
            "price": 299.99,
            "url": "https://example.com/snowboard",
            "image": "snowboard.jpg",
            "product": "Snowboard"
        },
        {
            "id": "2", 
            "title": "Winter Jacket Extreme",
            "price": 199.99,
            "url": "https://example.com/jacket", 
            "image": "jacket.jpg",
            "product": "Jacket"
        },
        {
            "id": "3",
            "title": "Ski Goggles Pro",
            "price": 89.99,
            "url": "https://example.com/goggles",
            "image": "goggles.jpg",
            "product": "Ski Goggles"
        }
    ]

    context_texts = "\n".join([
        f"Product {p['id']}: {p['title']} - Price: ${p['price']} - Available at: {p['url']}"
        for p in products
    ])

    test_queries = [
        "Show me snowboards",
        "List winter sports equipment",
        "What products do you have?",

        "Tell me about the Snowboard Pro X",
        "Details of Winter Jacket Extreme",
        "Information about Ski Goggles Pro",
        
        "I need winter gear",
        "Recommend a snowboard",
        "Best winter sports equipment",
        
        "Hi there",
        "Hello"
    ]

    for query in test_queries:
        print(f"\n--- Running Query: {query} ---")
        
        prompt = create_prompt(query, context_texts)
        
        try:
            response = await rag_service.generate_llm_response(prompt, products)
            
            print("Generated Response:", response.response)

            token_efficiency = langfuse_tracker.calculate_token_efficiency(response.response)
            print("Efficiency Metrics:", token_efficiency)
        
        except Exception as e:
            logger.error("Error processing query %s", str(e), exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_langfuse_tracking())