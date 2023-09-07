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
    this.useRoute();
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
  useRoute() {
    this.app.post('/signup', async (req, res, next) => {
      try {
        const { email, name, password } = req.body;
        const emailRegExp = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        const passwordRegExp = /[ !@#$%^&*(),.?":{}|<>]/g;
        const [existUser] = await this.dataSource.query(
          `SELECT email FROM users WHERE email = ?`,
          [email],
        );
        if (existUser) this.throwError(400, 'user already exist');
        if (!email || !name || !password) this.throwError(400, 'key error');
        const hash = await bcrypt.hash(password, 12);
        if (
          this.isValidData(emailRegExp, email) &&
          this.isValidData(passwordRegExp, password)
        ) {
          await this.dataSource.query(
            `INSERT INTO users (email, name, password) VALUES (?, ?, ?)`,
            [email, name, hash],
          );
          return res.status(201).json({ message: 'user created' });
        } else {
          this.throwError(400);
        }
      } catch (err) {
        console.error(err);
        next(err);
      }
    });
    this.app.post('/signin', async (req, res, next) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) this.throwError(400, 'key error');
        const [existUser] = await this.dataSource.query(
          `SELECT id, email, password FROM users WHERE email = ?`,
          [email],
        );
        if (existUser && existUser.email) {
          const result = await bcrypt.compare(password, existUser.password);
          if (!result) this.throwError(401);
          res.header(
            'access_token',
            jwt.sign({ id: existUser.id }, process.env.JWT_SECRET, {
              expiresIn: '30d',
            }),
          );
          return res.status(200).json({ message: 'token created' });
        }
        this.throwError(400, "user doesn't exist");
      } catch (err) {
        console.error(err);
        next(err);
      }
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
  isValidData(reg, validationTarget) {
    return reg.test(validationTarget);
  }
  throwError(code, message) {
    if (!code) return;
    const error = new Error();
    const errorMessage = new Map([
      [400, 'bad request'],
      [401, 'unAuthorized'],
      [500, 'internal server error'],
    ]);
    if (!errorMessage.get(code) || message) {
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
