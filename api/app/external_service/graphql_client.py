import httpx
from typing import Dict, Any

from app.utils.logger import logger

async def execute_graphql_query(
    url: str,
    query: str,
    variables: Dict[str, Any],
    access_token: str,
) -> Dict[str, Any]:
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": access_token,
    }

    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                url,
                headers=headers,
                json={"query": query, "variables": variables},
            )
            response.raise_for_status()
            return response.json()
    except Exception as error:
        logger.error(f"GraphQL query execution failed: {error}")
        raise