const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongo = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/vmdb';
var mongoose = require('mongoose');
const PORT = 3000;

mongoose.connect(url, {useNewUrlParser: true}, err => {
    if (err) return console.log(err);
    console.log('mongoose connected');
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('../frontend'));

app.use('/api', require('./CloudUsageMonitor'));

app.listen(PORT, () => console.log(`app listening on port ${PORT}!`))