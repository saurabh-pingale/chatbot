# FastAPI Project Template

This project provides a structured template for building FastAPI applications, emphasizing modularity, clean code, and maintainability. It's designed to help you quickly set up a scalable and organized API.

---

## Getting Started

These instructions will guide you through setting up and running the project on your local machine for development and testing.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Python:** Version 3.11.3
* **Docker:** For containerization

---

## Project Setup

This project follows a modular structure inspired by the guide: [How to Structure Your FastAPI Projects](https://medium.com/@amirm.lavasani/how-to-structure-your-fastapi-projects-0219a6600a8f).

### Manual Alembic Table Creation

If you're using Alembic for database migrations, ensure you manually create the `alembic_version` table with a `version_num` column of type `NUMBER`.

---

## Installation

Follow these steps to get the project running locally:

1.  **Clone the repository:**

    ```bash
    git clone https://[repo].git
    cd [repo]
    ```

    (Replace `[repo]` with your actual repository URL and `[repo]` with your actual repository directory name.)

2.  **Create a virtual environment and install dependencies:**

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

---

## Running the Application

To run the FastAPI application:

1.  **Navigate to the `api` directory:**

    ```bash
    cd api
    ```

2.  **Run the application using Uvicorn:**

    ```bash
    python main.py
    ```

    The application will typically be accessible at `http://localhost:8000`.

---

## Project Structure

The project is designed with a clear, modular structure to promote clean code and easy maintenance, adhering to the principle of separation of concerns.

### 1. Routes (`/routes`)

* **Purpose:** Defines API endpoints and handles request validation.
* **Rule:** Should *only* contain route definitions and *not* business logic.

**Example:**

```python
@router.get("/items")
def get_items():
    items = app.services.get_items()
    return {"data": items}
````

### 2\. Services (`/services`)

  * **Purpose:** Contains the core business logic, distinct from route definitions. It processes data and interacts with DB handlers as needed.
  * **Role:** Acts as an intermediary between routes and database handlers.

**Example:**

```python
class ItemService:
    def get_items(self, data):
        item1 = data["item1"]
        item2 = data["item2"]
        response = app.handlers.fetch_items(item1, item2) # Query database via handler
        cleaned_data = self.clean_response(response) # Assuming clean_response is a method within the service or a utility
        return cleaned_data
```

### 3\. DB Handlers (`/db_handlers`)

  * **Purpose:** Manages direct database queries and interactions.
  * **Role:** Abstracts database-specific logic from the services layer.

**Example:**

```python
class ItemHandler:
    def fetch_items(self):
        return db.query("SELECT * FROM items")
```

### 4\. Custom FastAPI (`/main.py` or `custom_fastapi.py`)

  * **Purpose:** A wrapper around the standard `FastAPI` application to allow for easy attachment and access to services and handlers, ensuring cleaner initialization and dependency injection.

**Example:**

```python
from fastapi import FastAPI

class CustomFastAPI(FastAPI):
    # Services attached directly to the app instance
    rag_pipeline_service: Any # Type hint for clarity
    store_admin_service: Any # Type hint for clarity

    # DB Handlers attached directly to the app instance
    store_admin_handler: Any # Type hint for clarity

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize services and handlers (example, actual initialization might vary)
        self.rag_pipeline_service = RagPipelineService()
        self.store_admin_service = StoreAdminService()
        self.store_admin_handler = StoreAdminHandler()

# In your main application file (e.g., main.py):
# app = CustomFastAPI()
# app.include_router(...)
```

This structured approach ensures proper modularization and clear separation of concerns throughout the application.

-----

## Docker

### Run with Docker

To build a Docker image and run the application in a container:

```bash
docker build -t fastapi-app .
docker run -p 8000:8000 fastapi-app
```

This will build a Docker image named `fastapi-app` and run it, mapping port `8000` from the container to port `8000` on your host machine.

```
