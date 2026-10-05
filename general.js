const axios = require('axios');

const baseURL = process.env.BOOK_REVIEW_API_URL || 'http://localhost:5000';
const client = axios.create({ baseURL });

async function getAllBooks() {
  const response = await client.get('/books');
  return response.data;
}

async function getBookByISBN(isbn) {
  const response = await client.get(`/isbn/${encodeURIComponent(isbn)}`);
  return response.data;
}

async function getBooksByAuthor(author) {
  const response = await client.get(`/author/${encodeURIComponent(author)}`);
  return response.data;
}

async function getBooksByTitle(title) {
  const response = await client.get(`/title/${encodeURIComponent(title)}`);
  return response.data;
}

module.exports = {
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle
};
