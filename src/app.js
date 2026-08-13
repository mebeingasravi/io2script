import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorConverter, errorHandler } from './middlewares/error.js';
import ApiError from './helper/ApiError.js';

/**
 * Express application for the Script Management API. Kept separate from
 * `src/index.js` (the process entrypoint) so it can be imported directly by
 * tests (e.g. via supertest) without starting the HTTP listener.
 */
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use(routes);

app.use((req, res, next) => {
  next(new ApiError(404, 'API not found'));
});

app.use(errorConverter);
app.use(errorHandler);

export default app;
