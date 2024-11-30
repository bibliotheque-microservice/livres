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

# API routes
@app.route('/books', methods=['GET'])
def get_books():
    """Search for books by title or author."""
    title = request.args.get('title')
    author = request.args.get('author')
    
    query = Book.query
    if title:
        query = query.filter(Book.title.ilike(f'%{title}%'))
    if author:
        query = query.filter(Book.author.ilike(f'%{author}%'))
    
    books = query.all()
    return jsonify([{
        'id': book.id,
        'title': book.title,
        'author': book.author,
        'published_year': book.published_year,
        'isbn': book.isbn,
        'availability': book.availability
    } for book in books])

@app.route('/books', methods=['POST'])
def add_book():
    """Add a new book."""
    data = request.json
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

@app.route('/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update an existing book."""
    data = request.json
    book = Book.query.get_or_404(book_id)
    
    book.title = data.get('title', book.title)
    book.author = data.get('author', book.author)
    book.published_year = data.get('published_year', book.published_year)
    book.isbn = data.get('isbn', book.isbn)
    book.availability = data.get('availability', book.availability)
    
    db.session.commit()
    return jsonify({'message': 'Book updated successfully'})

@app.route('/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Delete a book."""
    book = Book.query.get_or_404(book_id)
    db.session.delete(book)
    db.session.commit()
    return jsonify({'message': 'Book deleted successfully'})

@app.route('/books/<int:book_id>/availability', methods=['GET'])
def check_availability(book_id):
    """Check if a book is available."""
    book = Book.query.get_or_404(book_id)
    return jsonify({'availability': book.availability})

if __name__ == '__main__':
    app.run(debug=True)
