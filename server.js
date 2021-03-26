const express = require('express');
const app = express();
const db = require('./database/index.js');
const PORT = 3002;

const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const ObjectID = mongo.ObjectID;

const url = 'mongodb://localhost:27017';
let dbo, questions, answers, answers_photos;

app.use(express.json({extended: true}));
app.use(express.urlencoded( {extended: true}));


app.get('/', (req, res) => {
  res.send('hello!');
});

//get questions
app.get('/qa/:product_id', (req, res) => {
	var product_id = parseInt(req.params.product_id);
	const dbo = req.app.locals.db;
	dbo.collection('questions')
		.find({ product_id: product_id, reported : 0})
		//.sort( {product_id: -1})
		.toArray((err, results) => {
			if (err) {
				throw err;
			}
			var responseObj = {product_id, results};
			console.log('Questions are found!!!');
			res.header("Access-Control-Allow-Origin", "*");
			res.send(responseObj);
		})
})


//get answers
app.get('/qa/:question_id/answers', (req, res) => {

	var question_id = parseInt(req.params.question_id);
	const dbo = req.app.locals.db;

	dbo.collection('answers')
		.aggregate(
			[ { $match : { question_id : question_id } },
				{ $lookup:
					{
						from: 'answers_photos',
						localField: 'id',
						foreignField: 'answer_id',
						as: 'photos'
					}
				}
			 ]
		)
		.toArray((err, results) => {
			if (err) {
				throw err;
			}
			console.log('Answers are found!');
			var responseObj = {question_id, results};
			res.header("Access-Control-Allow-Origin", "*");
			res.send(responseObj);
		})
})

//add a question
app.post('/qa/questions', (req, res) => {
		const dbo = req.app.locals.db;

		let body = req.query.body;
		let name = req.query.name;
		let email = req.query.email;
		let product_id = req.query.product_id;

		let newQuestion = {
			id: new ObjectID(),
			product_id: parseInt(product_id),
			asker_name: name,
			asker_email: email,
			reported: 0,
			question_body: body,
			question_date: new Date(),
			question_helpfulness: 0
		}

		dbo.collection('questions').insertOne(newQuestion)
		.then((newQuestion) => {
			res.send('Question added!');
		})
		.catch((err) => {
			throw err;
		})
})

//add answer
app.post('/qa/:questionId/answers', (req, res) => {
	const dbo = req.app.locals.db;

	let body = req.params.body;
	let name = req.params.name;
	let email = req.params.email;
	let question_id = req.params.questionId;
	let photos = JSON.parse(req.params.photos) || [];

	let newAnswer = {
		id: new ObjectID(),
		question_id: parseInt(question_id),
		answerer_name: name,
		answerer_email: email,
		reported: 0,
		body: body,
		date: new Date(),
		helpfulness: 0
	}

	//inserting answer
	dbo.collection('answers').insertOne(newAnswer)
	.then((newAnswer) => {
	//create another insertOne to the photos collection
		if (photos.length > 0) {
			photos.forEach(photo => {
				photo.answer_id = newAnswer.ops[0].id
			})

			dbo.collection('answers_photos').insertMany(photos)
			.then((insertedPhotos) => {
				res.status(200).send('done!')
			})
			.catch((err) => {
				throw err;
			})
		} else {
			res.header("Access-Control-Allow-Origin", "*");
			res.send('Answer added')
		}
	})
	.catch((err) => {
		throw err;
	})
})


MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
	if (err) {
		throw err;
	}
	app.locals.db = db.db('qa');

	app.listen(PORT, (err) => {
		if (err) {
			throw err;
		}
		console.log(`listening on ${PORT}`);
	})
})



