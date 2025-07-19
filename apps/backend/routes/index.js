var express = require('express');
var router = express.Router();

/* GET health check. */
router.get('/health', function(req, res, next) {
  res.json({status: "ok"});
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
