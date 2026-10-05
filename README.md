# Express Book Review API

## Run locally

```sh
npm install
npm start
```

The API listens on port `5000` by default. Set `PORT` to change the port and
set `JWT_SECRET` to a private value outside local development.

## Endpoints

- `GET /` or `GET /books` — list all books
- `GET /isbn/:isbn` — retrieve one book by ISBN
- `GET /author/:author` — search by author
- `GET /title/:title` — search by title
- `GET /review/:isbn` — list reviews for a book
- `POST /register` — register `{ "username": "...", "password": "..." }`
- `POST /customer/login` — log in and receive a bearer token
- `PUT /customer/auth/review/:isbn` — add/update `{ "review": "..." }`
- `DELETE /customer/auth/review/:isbn` — delete the authenticated user's review

Review changes and accounts are held in memory and reset when the server
restarts. Send the login token in `Authorization: Bearer <token>` for review
mutations.

`general.js` exports Axios-based async functions for retrieving all books and
searching by ISBN, author, or title.
