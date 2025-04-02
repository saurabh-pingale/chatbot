from fastapi import FastAPI

#Services
from app.services.rag_pipeline_service import RagPipelineService
from app.services.store_admin_service import StoreAdminService

#Handlers
from app.dbhandlers.store_admin_handler import StoreAdminHandler
from app.dbhandlers.rag_pipeline_handler import RagPipelineHandler

class CustmFastAPI(FastAPI):
    #Service
    rag_pipeline_service = RagPipelineService
    store_admin_service = StoreAdminService
    
    #DbHandlers
    store_admin_handler = StoreAdminHandler
    rag_pipeline_handler = RagPipelineHandler
