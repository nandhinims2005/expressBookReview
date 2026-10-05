const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const books = require('./booksdb.json');

const scrypt = promisify(scryptCallback);
const app = express();
const port = Number(process.env.PORT) || 5000;
const jwtSecret = process.env.JWT_SECRET || 'express-book-review-development-secret';
const users = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
};

const verifyPassword = async (password, storedHash) => {
  const [salt, expectedHex] = storedHash.split(':');
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length > 0 && timingSafeEqual(expected, actual);
};

const findBooks = (field, value) => {
  const query = String(value).trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books).filter(([, book]) =>
      String(book[field]).toLocaleLowerCase().includes(query)
    )
  );
};

const authenticate = (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!users.has(payload.username)) {
      return res.status(401).json({ error: 'User is no longer registered' });
    }
    req.username = payload.username;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
};

app.get('/', (req, res) => res.json(books));
app.get('/books', (req, res) => res.json(books));

app.get('/isbn/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.json(book)
    : res.status(404).json({ error: 'Book not found' });
});

app.get('/author/:author', (req, res) => {
  const matches = findBooks('author', req.params.author);
  return Object.keys(matches).length
    ? res.json(Object.values(matches))
    : res.status(404).json({ error: 'No books found for this author' });
});

app.get('/title/:title', (req, res) => {
  const matches = findBooks('title', req.params.title);
  return Object.keys(matches).length
    ? res.json(matches)
    : res.status(404).json({ error: 'No books found with this title' });
});

app.get('/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.json(book.reviews)
    : res.status(404).json({ error: 'Book not found' });
});

app.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || password.length < 1) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (users.has(username.trim())) {
    return res.status(409).json({ error: 'Username already registered' });
  }

  const normalizedUsername = username.trim();
  const passwordHash = await hashPassword(password);
  users.set(normalizedUsername, { passwordHash });
  return res.status(201).json({ message: 'User successfully registered. Now you can login' });
}));

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const normalizedUsername = username.trim();
  const user = users.get(normalizedUsername);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ username: normalizedUsername }, jwtSecret, { expiresIn: '1h' });
  return res.json({ message: 'Login successful', username: normalizedUsername, token });
});

app.post('/login', login);
app.post('/customer/login', login);

const saveReview = (req, res) => {
  const book = books[req.params.isbn];
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  const { review } = req.body;
  if (typeof review !== 'string' || !review.trim()) {
    return res.status(400).json({ error: 'A non-empty review is required' });
  }

  book.reviews[req.username] = review.trim();
  return res.json({ message: 'Review added or updated successfully', reviews: book.reviews });
};

app.put('/customer/auth/review/:isbn', authenticate, saveReview);
app.put('/review/:isbn', authenticate, saveReview);

const deleteReview = (req, res) => {
  const book = books[req.params.isbn];
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  if (!Object.prototype.hasOwnProperty.call(book.reviews, req.username)) {
    return res.status(404).json({ error: 'Review not found' });
  }

  delete book.reviews[req.username];
  return res.json({ message: `Review for ISBN ${req.params.isbn} deleted` });
};

app.delete('/customer/auth/review/:isbn', authenticate, deleteReview);
app.delete('/review/:isbn', authenticate, deleteReview);

app.use((error, req, res, next) => {
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Book review API listening on port ${port}`);
  });
}

module.exports = app;
