const express = require('express');
const router = express.Router();
const ExpressError = require('../expressError');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { SECRET_KEY } = require('../config');

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (await User.authenticate(username, password)) {
      const token = jwt.sign({ username }, SECRET_KEY);
      User.updateLoginTimestamp(username);
      return res.json({ token });
    } else {
      throw new ExpressError('Invalid Username/Password', 400);
    }
  } catch (e) {
    return next(e);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post('/register', async (req, res, next) => {
  try {
    const { username } = await User.register(req.body);
    const token = jwt.sign({ username }, SECRET_KEY);
    User.updateLoginTimestamp(username);
    return res.json({ token });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
