var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var User = require("./models/user");

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/github/return'
}, function(accessToken, refreshToken, profile, done){
  if (profile.emails[0]) {
    User.findOneAndUpdate({
      email: profile.emails[0].value
    }, {
      name: profile.displayName || profile.username,
      email: profile.emails[0].value,
      photo: profile.photos[0].value
    }, {
      upsert: true
    }, done);
  } else {
    var noEmailError = ("Your email privacy settings prevent you from loggin in.");
    done(noEmailError, null);
  }
}))

passport.serializeUser(function(user, done){
  done(null, user._id);
});

passport.deserializeUser(function(userId, done){
  User.findById(userId, done);
});

var routes = require('./routes/index');
var auth = require('./routes/auth');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// mongodb connection
mongoose.connect("mongodb://localhost:27017/bookworm-oauth");
var db = mongoose.connection;

//Session config for Passport and mongodb
var sessionOptions = {
  secret: "Bob's super secret!",
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({
    mongooseConnection: db
  })
}

app.use(session(sessionOptions))

//Initialize passport
app.use(passport.initialize());

//Restore session
app.use(passport.session());

// mongo error
db.on('error', console.error.bind(console, 'connection error:'));

app.use('/', routes);
app.use('/auth', auth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
