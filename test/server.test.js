const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('book lookup and authenticated review lifecycle', async (t) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(`${baseURL}${path}`, options);
  process.env.BOOK_REVIEW_API_URL = baseURL;
  const {
    getAllBooks,
    getBookByISBN,
    getBooksByAuthor,
    getBooksByTitle
  } = require('../general');

  assert.equal(Object.keys(await getAllBooks()).length, 10);
  assert.equal((await getBookByISBN('8'))['8'].title, 'Pride and Prejudice');
  assert.ok((await getBooksByAuthor('Jane Austen'))['8']);
  assert.ok((await getBooksByTitle('Pride and Prejudice'))['8']);

  const booksResponse = await request('/books');
  assert.equal(booksResponse.status, 200);
  assert.equal(Object.keys(await booksResponse.json()).length, 10);

  const authorResponse = await request('/author/Jane%20Austen');
  assert.equal(authorResponse.status, 200);
  assert.ok((await authorResponse.json())['8']);

  const isbnResponse = await request('/isbn/8');
  assert.equal((await isbnResponse.json())['8'].title, 'Pride and Prejudice');

  const reviewPath = '/customer/auth/review/8';
  assert.equal((await request(reviewPath, { method: 'PUT' })).status, 401);

  const username = `test-user-${Date.now()}`;
  const registerResponse = await request('/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'test-password' })
  });
  assert.equal(registerResponse.status, 201);

  const loginResponse = await request('/customer/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'test-password' })
  });
  assert.equal(loginResponse.status, 200);
  const { token } = await loginResponse.json();
  assert.ok(token);

  const reviewResponse = await request(reviewPath, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ review: 'A thoughtful classic.' })
  });
  assert.equal(reviewResponse.status, 200);
  assert.equal((await reviewResponse.json()).reviews[username], 'A thoughtful classic.');

  const deleteResponse = await request(reviewPath, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal((await request('/review/8')).status, 200);
});
