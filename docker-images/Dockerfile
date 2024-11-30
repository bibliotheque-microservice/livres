# Use a Python base image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP=app.py

# Set working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone the project repository
RUN git clone https://github.com/bibliotheque-microservice/livres.git .

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port the app will run on
EXPOSE 5000

# Run the Flask application
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
