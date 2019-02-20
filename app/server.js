const express = require('express')
const next = require('next')
const bodyParser = require('body-parser')
const shortid = require('shortid');
const mongoClient = require("mongodb").MongoClient;

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const jsonParser = bodyParser.json()

const initDb = async () => {
  // TODO move this to an ENV variable
  try {
    const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_SERVER}/${process.env.MONGO_DB_NAME}/?ssl=true&retryWrites=true`

    const client = await mongoClient.connect(connectionString, { useNewUrlParser: true })
    const db = client.db(process.env.MONGO_DB_NAME);
    const collection = db.collection('bets');
    return { collection, client }
  } catch (e) {
    throw e
  }
}

app.prepare()
.then(() => {
  const server = express()

  server.post('/api/newbet', jsonParser, async (req, res, next) => {
    const {
      parent1,
      parent2,
      plannedBirthDate,
      betOptions,
      betAmount,
    } = req.body
    const { collection, client } = await initDb()

    const _id = shortid.generate()
    const adminId = shortid.generate()

    await collection.insertOne({
      _id,
      adminId,
      name: `Baby von ${parent1} & ${parent2}`,
      parent1,
      parent2,
      plannedBirthDate,
      betOptions,
      betAmount,
      bets: [],
    })
    client.close()

    res.send({
      id: _id,
      adminId,
    })
  })

  server.get('/api/betinfo/:id', async (req, res) => {
    const { id } = req.params

    const { collection, client } = await initDb()

    const [bet] = await collection.find({ _id: id }).limit(1).toArray()
    client.close()

    res.send({
      name: bet.name,
      plannedBirthDate: bet.plannedBirthDate,
      betAmount: bet.betAmount,
      numberOfBets: bet.bets.length,
    })
  })

  server.get('/b/:id', async (req, res) => {
    const { params: { id } } = req

    let queryParams = {
      id,
    }

    if (id) {
      const { collection, client } = await initDb()
      const [bet] = await collection.find({ _id: id }).limit(1).toArray()
      client.close()
      if (bet) {
        queryParams = {
          ...queryParams,
          name: bet.name,
          plannedBirthDate: bet.plannedBirthDate,
          betOptions: bet.betOptions,
          betAmount: bet.betAmount,
          numberOfBets: bet.bets.length,
        }
      }
    }

    const actualPage = '/b'
    app.render(req, res, actualPage, queryParams)
  })

  server.get('*', (req, res) => {
    return handle(req, res)
  })

  server.listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })
})
.catch((ex) => {
  console.error(ex.stack)
  process.exit(1)
})