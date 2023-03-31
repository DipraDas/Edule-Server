require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.slxro.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(403).send({ message: 'Forbidden Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {

        const allUsers = client.db('edule').collection('users');
        const allTuitions = client.db('edule').collection('tuitions');
        const allApplicants = client.db('edule').collection('applicants');
        const allconnects = client.db('edule').collection('connects');


        const verifyStudent = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await allUsers.findOne(query);
            if (user?.role !== 'student') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }

        const verifyTutor = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await allUsers.findOne(query);
            if (user?.role !== 'tutor') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }

        // POST OPERATION
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await allUsers.insertOne(user);
            res.send(result);
        })

        app.post('/tuitions', verifyJWT, verifyStudent, async (req, res) => {
            const tuition = req.body;
            const result = await allTuitions.insertOne(tuition);
            res.send(result);
        });

        // app.post('/applicants', verifyJWT, verifyTutor, async (req, res) => {
        //     const applicants = req.body;
        //     const result = await allApplicants.insertOne(applicants);
        //     res.send(result);
        // });

        app.post("/applicants", verifyJWT, verifyTutor, async (req, res) => {
            const application = req.body;
            const query = {
                email: application.email,
                subjectId: application.subjectId
            }

            const alreadyApplied = await allApplicants.find(query).toArray();
            if (alreadyApplied.length) {
                const message = `You have already applied`
                return res.send({ acknowledged: false, message })
            }
            const result = await allApplicants.insertOne(application);
            res.send(result);
        });

        app.post('/connects', async (req, res) => {
            const connects = req.body;
            const result = await allconnects.insertOne(connects);
            res.send(result);
        });


        // GET OPERATION
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await allUsers.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })

        app.get('/users/student/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await allUsers.findOne(query);
            res.send({ isStudent: user?.role === 'student' });
        })

        app.get('/users/tutor/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await allUsers.findOne(query);
            res.send({ isTutor: user?.role === 'tutor' });
        })

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await allUsers.find(query).toArray();
            res.send(users);
        });

        app.get('/tuitions', verifyJWT, async (req, res) => {
            const query = {};
            const users = await allTuitions.find(query).toArray();
            res.send(users);
        });

        app.get('/allApplications', verifyJWT, async (req, res) => {
            const query = {};
            const users = await allApplicants.find(query).toArray();
            res.send(users);
        });

        app.get('/specificTuition/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const specificTuition = await allTuitions.find(query).toArray();
            res.send(specificTuition);
        });

        app.get('/myProfile', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const profileInformation = await allUsers.find(query).toArray();
            res.send(profileInformation);
        });

        app.get('/profileUpdate/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: ObjectId(id) };
            const review = await allUsers.findOne(query);
            res.send(review);
        });

        app.post('/myProfileUpdate/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            }
            const profile = req.body;
            const updatedDoc = {
                $set: {
                    name: profile.name,
                    location: profile.location,
                    phone: profile.phone,
                    city: profile.city,
                    study: profile.study
                }
            }
            const result = await allUsers.updateOne(query, updatedDoc);
            res.send(result);
        })
    }
    finally { }
}

run().catch(console.log())

app.get('/', (req, res) => {
    res.send('Edule Server is running')
})

app.listen(port, () => {
    console.log({ port })
})