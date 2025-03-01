const express = require('express');
const PORT = process.env.PORT || 5000;
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const  AuthRoutes = require('./routes/auth.routes');
const EmailRoutes = require('./routes/email.routes');
require('./config/passportSetup');


dotenv.config();
const app = express();


app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        name: "session",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Home route
app.get("/", (req, res) => {
    res.send("Welcome to Gmail OAuth App!");
});

app.use('/auth', AuthRoutes);

app.use('/email', EmailRoutes);



// Dashboard route
app.get("/dashboard", (req, res) => {
    if (!req.user) return res.redirect("/");
    res.json({ message: "Authenticated", user: req.user });
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));