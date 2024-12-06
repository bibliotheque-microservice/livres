from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)

# PostgreSQL database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://username:password@mariadb_db:3306/library_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database model
class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(255), nullable=False)
    published_year = db.Column(db.Integer)
    isbn = db.Column(db.String(20), unique=True)
    availability = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Initialize the database
with app.app_context():
    db.create_all()

# Custom error handlers
@app.errorhandler(404)
def resource_not_found(e):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request', 'message': str(e)}), 400

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500

# API routes
@app.route('/books', methods=['GET'])
def get_books():
    """Search for books by title or author."""
    try:
        title = request.args.get('title')
        author = request.args.get('author')
        
        query = Book.query
        if title:
            query = query.filter(Book.title.ilike(f'%{title}%'))
        if author:
            query = query.filter(Book.author.ilike(f'%{author}%'))
        
        books = query.all()
        if not books:
            return jsonify({'message': 'No books found'}), 404
        
        return jsonify([{
            'id': book.id,
            'title': book.title,
            'author': book.author,
            'published_year': book.published_year,
            'isbn': book.isbn,
            'availability': book.availability
        } for book in books]), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch books', 'message': str(e)}), 500

@app.route('/books', methods=['POST'])
def add_book():
    """Add a new book."""
    try:
        data = request.json
        if not data or 'title' not in data or 'author' not in data:
            return jsonify({'error': 'Invalid data', 'message': 'Title and author are required'}), 400
        
        if 'isbn' in data and Book.query.filter_by(isbn=data['isbn']).first():
            return jsonify({'error': 'Book with this ISBN already exists'}), 400
        
        new_book = Book(
            title=data['title'],
            author=data['author'],
            published_year=data.get('published_year'),
            isbn=data.get('isbn'),
            availability=data.get('availability', True)
        )
        db.session.add(new_book)
        db.session.commit()
        return jsonify({'message': 'Book added successfully', 'book_id': new_book.id}), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add book', 'message': str(e)}), 500

@app.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update an existing book."""
    try:
        data = request.json
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'error': 'Book not found'}), 404
        
        book.title = data.get('title', book.title)
        book.author = data.get('author', book.author)
        book.published_year = data.get('published_year', book.published_year)
        book.isbn = data.get('isbn', book.isbn)
        book.availability = data.get('availability', book.availability)
        
        db.session.commit()
        return jsonify({'message': 'Book updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to update book', 'message': str(e)}), 500

@app.route('/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Delete a book."""
    try:
        book = Book.query.get(book_id)
        if not book:
            return jsonify({'error': 'Book not found'}), 404
        
        db.session.delete(book)
        db.session.commit()
        return jsonify({'message': 'Book deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to delete book', 'message': str(e)}), 500

@app.route('/books/<int:book_id>/availability', methods=['GET'])
def check_availability(book_id):
    """Check if a book is available."""
    try:
        book = Book.query.get(book_id)
        print(book)
        if not book:
            return jsonify({'error': 'Book not found'}), 404
        return jsonify({'availability': book.availability}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to check availability', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
