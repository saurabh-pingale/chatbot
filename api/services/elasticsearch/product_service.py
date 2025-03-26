from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os

load_dotenv()

class ElasticSearchService:
    def __init__(self):
        cloud_id =os.getenv("ELASTICSEARCH_CLOUD_ID")
        api_key =os.getenv("ELASTICSEARCH_API_KEY")

        if not cloud_id or not api_key:
            raise ValueError("Missing Elasticsearch configuration in environment variables")
        
        self.es = Elasticsearch(
            cloud_id=cloud_id,
            api_key=api_key,
            request_timeout=30
        )

        if not self.es.ping():
            raise ConnectionError("Failed to connect to Elasticsearch cluster")
        
        self.index_name = "products"

    async def create_index(self):
        if not self.es.indices.exists(index=self.index_name):
            self.es.indices.create(
                index=self.index_name,
                body={
                    "settings": {
                        "analysis": {
                            "analyzer": {
                                "ecommerce_analyzer": {
                                    "type": "custom",
                                    "tokenizer": "standard",
                                    "filter": ["lowercase", "english_stop"]
                                }
                            },
                            "filter": {
                                "english_stop": {
                                    "type": "stop",
                                    "stopwords": "_english_"
                                }
                            }
                        }
                    },
                    "mappings": {
                        "properties": {
                            "title": {
                                "type": "text",
                                "analyzer": "ecommerce_analyzer",
                                "fields": {
                                    "keyword": {"type": "keyword"}
                                }
                            },
                            "description": {"type": "text", "analyzer": "ecommerce_analyzer"},
                            "product_id": {"type": "keyword"},
                            "shop_id": {"type": "keyword"},
                            "url": {"type": "keyword"},
                            "image_url": {"type": "keyword"}
                        }
                    }
                }
            )

    async def index_products(self, products: list):
        await self.create_index()
        
        actions = []
        for product in products:
            actions.append({
                "index": {
                    "_index": self.index_name,
                    "_id": str(product["id"]),  
                }
            })

            actions.append({
                "title": product["title"],
                "description": product.get("body_html", ""),
                "product_id": str(product["id"]),
                "shop_id": product.get("shop_id", ""),
                "handle": product.get("handle", ""),
                "url": f"/products/{product.get('handle', '')}",
                "image_url": product.get("image", {}).get("src", "")
            })
        
        response = self.es.bulk(operations=actions, refresh=True)

        if response["errors"]:
            errors = [item["index"]["error"] for item in response["items"] if "error" in item["index"]]
            print(f"Indexing errors: {errors}")
            raise ValueError(f"Failed to index {len(errors)} products")
    
        print(f"Successfully indexed {len(products)} products")
        return response

    async def search_products(self, query: str, size: int = 5):
        try: 
            if not self.es.indices.exists(index=self.index_name):
                await self.create_index()
                return {"hits": {"hits": []}}
            
            response = self.es.search(
                index=self.index_name,
                body={
                    "query": {   
                        "multi_match": {
                            "query": query,
                            "fields": ["title^3", "description"],
                            "fuzziness": "AUTO"
                        }
                    },
                    "size": size
                }
            )

            return {
                "hits": {
                    "hits": [
                        {
                            "_id": hit["_id"],
                            "_source": {
                            "title": hit["_source"]["title"],
                            "description": hit["_source"].get("description", ""),
                            "url": hit["_source"]["url"],
                            "image_url": hit["_source"]["image_url"]
                            }
                        }
                        for hit in response["hits"]["hits"]
                    ]
                }
            }
        except Exception as e:
            print(f"Elasticsearch error: {str(e)}")
            return {"hits": {"hits": []}} 
    