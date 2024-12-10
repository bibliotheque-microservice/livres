const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const amqp = require("amqplib");
const app = express();

app.use(bodyParser.json());

// Configuration de la base de données
const sequelize = new Sequelize("library_db", "username", "password", {
  host: "mariadb_db",
  dialect: "mysql",
  logging: false,
});

// Modèle Book
const Book = sequelize.define(
  "Book",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    author: { type: DataTypes.STRING, allowNull: false },
    published_year: { type: DataTypes.INTEGER },
    isbn: { type: DataTypes.STRING, unique: true },
    availability: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  },
  {
    timestamps: false,
  }
);

// Initialisation de la base de données
(async () => {
  await sequelize.sync();
  console.log("Base de données synchronisée");
})();

// RabbitMQ
let rabbitChannel;
const rabbitConnection = async () => {
  try {
    const connection = await amqp.connect("amqp://admin:admin@rabbitmq");
    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertQueue("availability_queue", { durable: true });
    console.log("Connecté à RabbitMQ");
  } catch (error) {
    console.error("Erreur de connexion à RabbitMQ:", error);
  }
};

// Routes
app.get("/books", async (req, res) => {
  try {
    const { title, author } = req.query;
    const where = {};
    if (title) where.title = { [Sequelize.Op.like]: `%${title}%` };
    if (author) where.author = { [Sequelize.Op.like]: `%${author}%` };

    const books = await Book.findAll({ where });
    if (books.length === 0)
      return res.status(404).json({ message: "No books found" });

    res.json(books);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch books", message: error.message });
  }
});

app.post("/books", async (req, res) => {
  try {
    const { title, author, published_year, isbn, availability } = req.body;
    if (!title || !author)
      return res.status(400).json({ error: "Title and author are required" });

    const existingBook = await Book.findOne({ where: { isbn } });
    if (existingBook)
      return res
        .status(400)
        .json({ error: "Book with this ISBN already exists" });

    const newBook = await Book.create({
      title,
      author,
      published_year,
      isbn,
      availability,
    });
    res
      .status(201)
      .json({ message: "Book added successfully", book_id: newBook.id });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to add book", message: error.message });
  }
});

app.put("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, published_year, isbn, availability } = req.body;

    const book = await Book.findByPk(id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    await book.update({ title, author, published_year, isbn, availability });
    res.json({ message: "Book updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update book", message: error.message });
  }
});

app.delete("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findByPk(id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    await book.destroy();
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete book", message: error.message });
  }
});

app.get("/books/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findByPk(id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json({ availability: book.availability });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to check availability", message: error.message });
  }
});

// Consommateur RabbitMQ
const processMessage = async (msg) => {
  try {
    const { LivreID,livreId } = JSON.parse(msg.content.toString());
    const book_id = LivreID ? LivreID : livreId;
    const book = await Book.findByPk(book_id);
    if (!book) return console.error(`Book ID ${bookId} not found`);
    if (livreId) {
      if (book.availability)
        return console.error(`Book ID ${book_id} not available`);
      const newAvailability = !book.availability;
      await book.update({ availability: newAvailability });
    console.log(
      `Book ID ${book_id} availability updated to ${newAvailability}`
      );
    } else if(LivreID) {
      if (!book.availability)
        return console.error(`Book ID ${book_id} is available`);
      const newAvailability = !book.availability;
      await book.update({ availability: newAvailability });
      console.log(
        `Book ID ${book_id} availability updated to ${newAvailability}`
      );
    }

    rabbitChannel.ack(msg);
  } catch (error) {
    console.error("Erreur dans le traitement du message:", error.message);
    rabbitChannel.nack(msg);
  }
};

const startConsumer = async () => {
  await rabbitConnection();
  rabbitChannel.consume("emprunts_finished_queue", processMessage);

  console.log("En attente des messages dans la file 'availability_queue'...");
};

const startConsumer2 = async () => {
    await rabbitConnection();
    rabbitChannel.consume("emprunts_created_queue", processMessage);
  
    console.log("En attente des messages dans la file 'availability_queue'...");
  };
  

// Démarrer l'application
app.listen(3000, async () => {
  console.log("Serveur démarré sur le port 3000");
  await rabbitConnection();
  startConsumer();
  startConsumer2();
});
