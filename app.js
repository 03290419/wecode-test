const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { DataSource } = require('typeorm');

class App {
  constructor() {
    this.app = express();
    this.dataSource;
    this.setPort();
    this.setMiddleware();
    this.setTypeORM();
    this.throwError();
    this.status404();
    this.errorHandler();
  }
  setPort() {
    this.app.set('port', process.env.PORT || 8000);
  }
  setMiddleware() {
    this.app.use(cors());
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  setTypeORM() {
    this.dataSource = new DataSource({
      type: process.env.TYPEORM_CONNECTION,
      host: process.env.TYPEORM_HOST,
      port: process.env.TYPEORM_PORT,
      username: process.env.TYPEORM_USERNAME,
      password: process.env.TYPEORM_PASSWORD,
      database: process.env.TYPEORM_DATABASE,
    });
    this.dataSource
      .initialize()
      .then(() => {
        console.log('Data Source has been initialized!');
      })
      .catch((err) => {
        console.error(err);
      });
  }
  status404() {
    this.app.use((req, _, next) => {
      const error = new Error(`${req.method} ${req.url} router is not exist`);
      error.status = 404;
      next(error);
    });
  }
  errorHandler() {
    this.app.use((err, _, res, next) => {
      res.status(err.status || 500);
      return res.json({
        error: `${err.status} ${err.message}`,
      });
    });
  }
  throwError(code, message) {
    if (!code) return;
    const error = new Error();
    const errorMessage = new Map([
      [400, 'bad request'],
      [401, 'unAuthorized'],
      [500, 'internal server error'],
    ]);
    if (!errorMessage.get(code)) {
      errorMessage.set(code, message);
    }
    error.message = errorMessage.get(code);
    error.status = code;
    throw error;
  }
}

const app = new App().app;
app.listen(app.get('port'), () => {
  console.log(`Server is listening 8000 http://localhost:${app.get('port')}`);
});
