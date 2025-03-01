
module.exports.checkAuth = (req, res, next) => {
    req.accessToken =
      req.user?.accessToken || req.headers.authorization?.split(" ")[1];
  
    if (!req.accessToken) {
      return res.status(401).send("Unauthorized: No Access Token");
    }
    next();
};