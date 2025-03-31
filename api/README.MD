
## Getting Started

These instructions will help you set up and run the project on your local machine for development and testing purposes.

### Prerequisites

- Python 3.13 or higher
- Docker

### Project setup

Reference - https://medium.com/@amirm.lavasani/how-to-structure-your-fastapi-projects-0219a6600a8f

### Installation

1. Clone the repository:

```
git clone https://[repo].git
cd [repo]
```

2. Create a virtual environment and install the required packages:

```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Run the application using Uvicorn:

```
python3 main.py
```

## Project Structure

The project follows a modular structure to keep the code clean and maintainable.

### Routes

* Defines API endpoints and handles request validation.
* It should only contain route definitions and not business logic.

**Example:**

```python
@router.get("/items")
def get_items():
    items = app.services.get_items()
    return {"data": items}
```

### Services

Contains business logic, separate from route definitions. It processes data and interacts with DB handlers when necessary.

**Example:**

```python
class ItemService:
    def get_items(self, data):
        item1 = data["item1"]
        item2 = data["item2"]
        response = app.handlers.fetch_items(item1, item2) #query
        data = clean_response(response)
        return data
```

### DB Handlers

Handles direct database queries and interactions. It abstracts database logic from services.

**Example:**

```python
class ItemHandler:
    def fetch_items(self):
        return db.query("SELECT * FROM items")
```

### Custom FastAPI

A wrapper around FastAPI to allow easy attachment of services and handlers for cleaner initialization.

```python
class CustmFastAPI(FastAPI):
    #Service
    rag_pipeline_service = RagPipelineService
    store_admin_service = StoreAdminService
    
    #DbHandlers
    store_admin_handler = StoreAdminHandler
```
This ensures proper modularization and separation of concerns in the application.

## Docker

### Run docker

```
docker build -t fastapi-app .
docker run -p 8000:8000 fastapi-app
```