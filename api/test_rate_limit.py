import httpx
import asyncio

async def test_rate_limit():
    url = "http://localhost:8000/agent_conversation_router/agent_conversation?shopId=test-store-chatbot-main.myshopify.com"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJzaG9wX2lkIjoxLCJleHAiOjE3NTEzNzY3MTN9.6Y4JrpCozxmJWhjraGlyYeKA0fO6mQk6SEG1NsswV-o",
        "Content-Type": "application/json"
    }
    data = {
        "messages": [{"role": "user", "content": "Hello"}]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(4):
            res = await client.post(url, headers=headers, json=data)
            print(f"Response {i+1}: {res.status_code}, {res.json()}")
            await asyncio.sleep(1) 

asyncio.run(test_rate_limit())