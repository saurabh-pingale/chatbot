import asyncio
from dotenv import load_dotenv
from deepseek_service import generate_llm_response, create_deepseek_prompt
from services.llm.langfuse_observation_module import langfuse_tracker

load_dotenv()

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
        
        prompt = create_deepseek_prompt(query, context_texts)
        
        try:
            response = await generate_llm_response(prompt, products)
            
            print("Generated Response:", response.response)

            token_efficiency = langfuse_tracker.calculate_token_efficiency(response.response)
            print("Efficiency Metrics:", token_efficiency)
        
        except Exception as e:
            print(f"Error processing query '{query}': {e}")

if __name__ == "__main__":
    asyncio.run(run_langfuse_tracking())