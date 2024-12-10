const express = require("express");
const bodyParser = require("body-parser");
const { Sequelize, DataTypes } = require("sequelize");
const amqp = require("amqplib");
const app = express();
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const logger = require("./logger");

// Configuration Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Library API",
      version: "1.0.0",
      description: "API pour gérer les livres d'une bibliothèque",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["app.js"], // Chemin vers ce fichier ou les fichiers contenant les commentaires Swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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
  logger.info("Base de données synchronisée");
})();

// RabbitMQ
let rabbitChannel;
const rabbitConnection = async () => {
  try {
    const connection = await amqp.connect("amqp://admin:admin@rabbitmq");
    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertQueue("availability_queue", { durable: true });
    logger.info("Connecté à RabbitMQ");
  } catch (error) {
    logger.error("Erreur de connexion à RabbitMQ:", error);
  }
};

// Routes

/**
 * @swagger
 * /v1/books:
 *   get:
 *     summary: Récupérer les livres
 *     parameters:
 *       - in: query
 *         name: title
 *         required: false
 *         schema:
 *           type: string
 *         description: Titre du livre
 *       - in: query
 *         name: author
 *         required: false
 *         schema:
 *           type: string
 *         description: Auteur du livre
 *     responses:
 *       200:
 *         description: Liste des livres récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   author:
 *                     type: string
 *                   published_year:
 *                     type: integer
 *                   isbn:
 *                     type: string
 *                   availability:
 *                     type: boolean
 *       404:
 *         description: Aucun livre trouvé avec les critères donnés
 *       500:
 *         description: Erreur interne du serveur
 */

app.get("/v1/books", async (req, res) => {
  try {
    const { title, author } = req.query;
    const where = {};
    if (title) where.title = { [Sequelize.Op.like]: `%${title}%` };
    if (author) where.author = { [Sequelize.Op.like]: `%${author}%` };

    const books = await Book.findAll({ where });
    if (books.length === 0) {
      logger.warn("No books found with the given criteria");
      return res.status(404).json({ message: "No books found" });
    }
    logger.info("Books fetched successfully");
    res.json(books);
  } catch (error) {
    logger.error(`Failed to fetch books: ${error.message}`);
    res
      .status(500)
      .json({ error: "Failed to fetch books", message: error.message });
  }
});

/**
 * @swagger
 * /v1/books:
 *   post:
 *     summary: Ajouter un nouveau livre
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               published_year:
 *                 type: integer
 *               isbn:
 *                 type: string
 *               availability:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Livre ajouté avec succès
 *       400:
 *         description: Erreur de validation
 */

app.post("/v1/books", async (req, res) => {
  try {
    const { title, author, published_year, isbn, availability } = req.body;
    if (!title || !author) {
      logger.warn("Title and author are required");
      return res.status(400).json({ error: "Title and author are required" });
    }
    const existingBook = await Book.findOne({ where: { isbn } });
    if (existingBook) {
      logger.warn("Book with this ISBN already exists");
      return res
        .status(400)
        .json({ error: "Book with this ISBN already exists" });
    }
    const newBook = await Book.create({
      title,
      author,
      published_year,
      isbn,
      availability,
    });

    logger.info("Book added successfully");
    res
      .status(201)
      .json({ message: "Book added successfully", book_id: newBook.id });
  } catch (error) {
    logger.error("Failed to add book");
    res
      .status(500)
      .json({ error: "Failed to add book", message: error.message });
  }
});

/**
 * @swagger
 * /v1/books/{id}:
 *   put:
 *     summary: Met à jour les informations d'un livre
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du livre à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               published_year:
 *                 type: integer
 *               isbn:
 *                 type: string
 *               availability:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Livre mis à jour avec succès
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */

app.put("/v1/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, published_year, isbn, availability } = req.body;

    const book = await Book.findByPk(id);
    if (!book){ 
      logger.warn("Book not found")
      return res.status(404).json({ error: "Book not found" });
  }
    await book.update({ title, author, published_year, isbn, availability });
    logger.info(`Book ${id} updated successfully`);
    res.json({ message: "Book updated successfully" });
  } catch (error) {
    logger.warn("Failed to update book");
    res
      .status(500)
      .json({ error: "Failed to update book", message: error.message });
  }
});

/**
 * @swagger
 * /v1/books/{id}:
 *   delete:
 *     summary: Supprime un livre
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du livre à supprimer
 *     responses:
 *       200:
 *         description: Livre supprimé avec succès
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */

app.delete("/v1/books/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findByPk(id);
    if (!book){
      logger.warn(`Book ${id} not found`);
      return res.status(404).json({ error: "Book not found" });
    } 

    await book.destroy();
    logger.info(`Book ${id} deleted successfully`);
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    logger.error("Failed to delete book");
    res
      .status(500)
      .json({ error: "Failed to delete book", message: error.message });
  }
});

/**
 * @swagger
 * /v1/books/{id}/availability:
 *   get:
 *     summary: Vérifie la disponibilité d'un livre
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du livre
 *     responses:
 *       200:
 *         description: Disponibilité du livre
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availability:
 *                   type: boolean
 *       404:
 *         description: Livre non trouvé
 *       500:
 *         description: Erreur serveur
 */

app.get("/v1/books/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;

    const book = await Book.findByPk(id);
    if (!book){
      logger.warn("Book not found");
      return res.status(404).json({ error: "Book not found" });
    }
    logger.info(`the book is ${id} available`);     
    res.json({ availability: book.availability });
  } catch (error) {
    logger.error(`Failed to check availability of the book ${id}`);
    res
      .status(500)
      .json({ error: "Failed to check availability", message: error.message });
  }
});

// Consommateur RabbitMQ
const processMessage = async (msg) => {
  try {
    const { LivreID, livreId } = JSON.parse(msg.content.toString());
    const book_id = LivreID ? LivreID : livreId;
    const book = await Book.findByPk(book_id);
    if (!book) return console.error(`Book ID ${bookId} not found`);
    if (livreId) {
      if (book.availability)
        return console.error(`Book ID ${book_id} not available`);
      const newAvailability = !book.availability;
      await book.update({ availability: newAvailability });
      logger.info(
        `Book ID ${book_id} availability updated to ${newAvailability}`
      );
    } else if (LivreID) {
      if (!book.availability)
        return console.error(`Book ID ${book_id} is available`);
      const newAvailability = !book.availability;
      await book.update({ availability: newAvailability });
      logger.info(
        `Book ID ${book_id} availability updated to ${newAvailability}`
      );
    }

    rabbitChannel.ack(msg);
  } catch (error) {
    logger.error("Erreur dans le traitement du message:", error.message);
    rabbitChannel.nack(msg);
  }
};

const startConsumer = async () => {
  await rabbitConnection();
  rabbitChannel.consume("emprunts_finished_queue", processMessage);

  console.log("En attente des messages dans la file 'emprunts_finished_queue'...");
};

const startConsumer2 = async () => {
  await rabbitConnection();
  rabbitChannel.consume("emprunts_created_queue", processMessage);

  console.log("En attente des messages dans la file 'emprunts_created_queue'...");
};

// Démarrer l'application
app.listen(3000, async () => {
  logger.info("Serveur démarré sur le port 3000");
  console.log("Serveur démarré sur le port 3000");
  await rabbitConnection();
  startConsumer();
  startConsumer2();
});
