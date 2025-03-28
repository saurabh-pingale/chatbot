import os
import json
from fastapi import APIRouter, Request, HTTPException

from processors.json_processor import handle_product_embeddings_from_json
from processors.product_processor import fetch_generate_store_product_embeddings
from services.embedding.embedding_service import generate_embeddings
from services.pinecone.pinecone_service import query_embeddings
from services.llm.deepseek_service import create_deepseek_prompt, generate_llm_response
from utils.shopify_proxy_utils import verify_app_proxy_signature
from utils.shopify_header_utils import get_shopify_session_for_training, get_shop_namespace
from schemas.models import DeepseekRequestBody

router = APIRouter(prefix="/deepseek", tags=["deepseek"])

@router.post("")
async def deepseek_endpoint(
    request: Request, 
    body: DeepseekRequestBody
):
   
    query_params = dict(request.query_params)
    api_secret = os.getenv("SHOPIFY_API_SECRET", "")
    
    if "signature" in query_params:
        if not verify_app_proxy_signature(query_params, api_secret):
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        if body.isTrainingPage:
            session = await get_shopify_session_for_training(request, is_training_page=body.isTrainingPage)
            shopify_store = session["shop"]
            shopify_access_token = session["access_token"]

            if body.messages:
                custom_input = body.messages[-1].get("content")
                try: 
                    custom_input_to_json_data = json.loads(custom_input)
                    response = await handle_product_embeddings_from_json(custom_input_to_json_data, namespace=shopify_store)
                    return {"answer": response}
                except json.JSONDecodeError:
                    return {"answer": "Please provide a valid JSON input to train the LLM."}
            
            await fetch_generate_store_product_embeddings(shopify_store, shopify_access_token)
            return {"answer": "Products fetched and embeddings stored successfully!"} 

        if not body.messages:
            raise HTTPException(status_code=400, detail="Invalid or missing messages")

        user_message = body.messages[-1].get("content")
        if not user_message:
            raise HTTPException(status_code=400, detail="Messages are required for chat requests")

        namespace = get_shop_namespace(request)
        user_message_embeddings = await generate_embeddings(user_message)
        query_results = await query_embeddings(user_message_embeddings, namespace=namespace)

        products = [
            {
                "id": result.id,
                "title": result.metadata.title,
                "price": result.metadata.price,
                "url": result.metadata.url,
                "image": result.metadata.image,
                "category": getattr(result.metadata, 'category', 'None')
            }
            for result in query_results
            if result and result.metadata
        ]
        products = [product for product in products if product["title"] and product["url"]]

        context_texts = "\n".join(
            f"Product:  Title: {result.metadata.title}, Description: {result.metadata.description}, Category: {result.metadata.category}, Price: {result.metadata.price}." 
            for result in query_results 
            if result and result.metadata
        )

        full_prompt = create_deepseek_prompt(user_message, context_texts)
        llm_response = await generate_llm_response(full_prompt, products)
        print(f"LLM Response Categories: {llm_response.categories or []}")
        
        return {
            "answer": llm_response.response,
            "products": llm_response.products or [],
            "categories": llm_response.categories or []
        }
        
    except HTTPException:
        raise
    except Exception as error:
        print(f"Error processing request: {error}")
        raise HTTPException(status_code=500, detail="Failed to process your request")