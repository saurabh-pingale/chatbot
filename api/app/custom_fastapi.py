from fastapi import FastAPI

class CustmFastAPI(FastAPI):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        from app.services.rag_pipeline_service import RagPipelineService
        from app.services.store_admin_service import StoreAdminService
        from app.dbhandlers.store_admin_handler import StoreAdminHandler
        from app.dbhandlers.rag_pipeline_handler import RagPipelineHandler
        
        self.rag_pipeline_service = RagPipelineService()
        self.store_admin_service = StoreAdminService()
        self.store_admin_handler = StoreAdminHandler()
        self.rag_pipeline_handler = RagPipelineHandler()