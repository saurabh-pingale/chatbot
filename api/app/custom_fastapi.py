from fastapi import FastAPI
from app.services.rag_pipeline_service import RagPipelineService
from app.services.store_admin_service import StoreAdminService
from app.dbhandlers.store_admin_handler import StoreAdminHandler

class CustmFastAPI(FastAPI):
    #Service
    rag_pipeline_service = RagPipelineService
    store_admin_service = StoreAdminService
    
    #DbHandlers
    store_admin_handler = StoreAdminHandler
