const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/google', 
    passport.authenticate("google", {
         scope: ["profile", "email", "https://www.googleapis.com/auth/gmail.readonly"] 
        }
    )
);

router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/');
    }
);

  // Logout route
router.get("/logout", (req, res) => {
    req.logout(() => {
        req.session = null;
        res.redirect("/");
    });
});

module.exports = router;