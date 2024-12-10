# Flask Library API Service with MariaDB

This project is a Flask-based library management API service that interacts with a MariaDB database. The service provides CRUD functionality for managing books, including operations like adding, updating, deleting, and searching for books, as well as checking their availability. The application is containerized using Docker and Docker Compose for easy deployment and scalability.

## Features

- **CRUD Operations** for books:
  - Add a new book
  - Update an existing book
  - Delete a book
  - Search for books by title or author
  - Check the availability of books

## Requirements

To run this service, you need the following:

- Docker
- Docker Compose

## Project Structure

    ├── app.py # Flask application code (API service) 
    ├── docker-compose.yaml # Docker Compose configuration to define services 
    ├── Dockerfile # Dockerfile to build the Flask application image 
    ├── docker-images: # final image of my service
    ├── requirements.txt # Python dependencies for Flask app 
    ├── wait-for-it.sh # Script to ensure MariaDB service is ready before starting Flask app 
    └── README.md # Project documentation


## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/bibliotheque-microservice/livres.git
cd livres
```

### 2. Build and Start Containers with Docker Compose

To start the application, run the following command to build and start both the Flask application and MariaDB services:

```bash
docker-compose up --build
```
This will:

Build the Flask app container.

Start the MariaDB container.

Wait for the MariaDB service to be fully ready before starting the Flask app (via wait-for-it.sh).

Run the Flask application accessible at http://localhost:5000.

### 3. Environment Variables

The Flask application uses the following environment variables:

DATABASE_URI: The database connection string for SQLAlchemy to connect to the MariaDB service.

```bash
DATABASE_URI=mysql+pymysql://username:password@mariadb_db:3306/library_db
```

These values are specified in the docker-compose.yaml for the flask_app service.

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```
The dependencies are defined in the requirements.txt file.

### 5. wait-for-it.sh Script

The wait-for-it.sh script ensures that the Flask application does not start before the MariaDB service is up and running. This is crucial to avoid any database connection errors.

Make sure that wait-for-it.sh is executable:

```bash
chmod +x wait-for-it.sh
```
### 6\. Access the API Service

Once the service is running, you can use the following API endpoints to interact with the library:

#### **GET /v1/books**

Fetches a list of books. You can filter the books by title and/or author.

Example:

```bash
    curl http://localhost:5000/books?title=Python  
```
#### **POST /v1/books**

Adds a new book to the database. Example request body:

```bash
{    "title": "The Pragmatic Programmer",    "author": "David Thomas",    "published_year": 1999,    "isbn": "978-0201616224",    "availability": true  }   
```

Example:
```bash
curl -X POST http://localhost:5000/books -H "Content-Type: application/json" -d '{"title": "The Pragmatic Programmer", "author": "David Thomas", "published_year": 1999, "isbn": "978-0201616224", "availability": true}'   
```

#### **PUT /v1/books/{book\_id}**

Updates an existing book by book\_id.

Example request body:

```bash
{    "title": "The Pragmatic Programmer (Updated)",    "author": "David Thomas",    "published_year": 2000,    "isbn": "978-0201616224",    "availability": true  }
```
Example:

```bash
curl -X PUT http://localhost:3000/v1/books/1 -H "Content-Type: application/json" -d '{"title": "The Pragmatic Programmer (Updated)", "author": "David Thomas", "published_year": 2000, "isbn": "978-0201616224", "availability": true}'
```

#### **DELETE /v1/books/{book\_id}**

Deletes a book by its book\_id.

Example:

```bash
curl -X DELETE http://localhost:3000/v1/books/1
```
#### **GET /v1/books/{book\_id}/availability**

Checks the availability of a book by book\_id.

Example:

```bash
curl http://localhost:3000/v1/books/1/availability
```

Troubleshooting
---------------

*   **Database connection errors**: Make sure the MariaDB container is running before the Flask app. Docker Compose ensures that the app waits until the database is ready (via wait-for-it.sh).

* **Permission issues with** wait-for-it.sh: Ensure that the script has executable permissions by running:

```bash
chmod +x wait-for-it.sh
```

*   **Service not starting**: If Docker Compose reports errors or the Flask app does not start, check the logs to ensure that MariaDB is up and that the wait-for-it.sh script successfully connected to the database before Flask starts.
    

Note: attach a shell with vscode to see the logs look the folder logs

