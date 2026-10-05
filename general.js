const axios = require('axios');

const baseURL = process.env.BOOK_REVIEW_API_URL || 'http://localhost:5000';
const client = axios.create({ baseURL });

async function get(path) {
  try {
    const response = await client.get(path);
    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const status = error.response ? `HTTP ${error.response.status}` : 'network error';
    const detail = error.response?.data?.error || error.message;
    throw new Error(`Book API request failed (${status}): ${detail}`, { cause: error });
  }
}

async function getAllBooks() {
  return get('/books');
}

async function getBookByISBN(isbn) {
  return get(`/isbn/${encodeURIComponent(isbn)}`);
}

async function getBooksByAuthor(author) {
  return get(`/author/${encodeURIComponent(author)}`);
}

async function getBooksByTitle(title) {
  return get(`/title/${encodeURIComponent(title)}`);
}

module.exports = {
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle
};
