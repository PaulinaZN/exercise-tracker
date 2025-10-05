const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Variables de entorno
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exercisetracker';

// Variables globales para la conexión a la base de datos
let db;
let client;

// Conectar a MongoDB
async function connectToDatabase() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    
    // Crear índices únicos para username
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
  }
}

// Middleware para manejar la conexión a la base de datos
app.use(async (req, res, next) => {
  if (!db) {
    await connectToDatabase();
  }
  next();
});

// Rutas de la API

// POST /api/users - Crear nuevo usuario
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.json({
        username: existingUser.username,
        _id: existingUser._id.toString()
      });
    }
    
    // Crear nuevo usuario
    const result = await db.collection('users').insertOne({
      username: username
    });
    
    res.json({
      username: username,
      _id: result.insertedId.toString()
    });
    
  } catch (error) {
    if (error.code === 11000) {
      // Usuario duplicado
      const existingUser = await db.collection('users').findOne({ username: req.body.username });
      return res.json({
        username: existingUser.username,
        _id: existingUser._id.toString()
      });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users - Obtener todos los usuarios
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users').find({}).toArray();
    
    const formattedUsers = users.map(user => ({
      username: user.username,
      _id: user._id.toString()
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:_id/exercises - Agregar ejercicio
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    let { description, duration, date } = req.body;
    
    // Validaciones
    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' });
    }
    
    duration = parseInt(duration);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ error: 'Duration must be a positive number' });
    }
    
    // Buscar usuario
    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(_id) });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Procesar fecha
    let exerciseDate;
    if (date) {
      exerciseDate = new Date(date);
      if (isNaN(exerciseDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    } else {
      exerciseDate = new Date();
    }
    
    // Crear ejercicio
    const exercise = {
      userId: new ObjectId(_id),
      description: description,
      duration: duration,
      date: exerciseDate
    };
    
    await db.collection('exercises').insertOne(exercise);
    
    // Respuesta
    res.json({
      _id: user._id.toString(),
      username: user.username,
      description: description,
      duration: duration,
      date: exerciseDate.toDateString()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:_id/logs - Obtener registro de ejercicios
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;
    
    // Buscar usuario
    let user;
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(_id) });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Construir consulta
    let query = { userId: new ObjectId(_id) };
    
    // Filtros de fecha
    if (from || to) {
      query.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({ error: 'Invalid from date format' });
        }
        query.date.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({ error: 'Invalid to date format' });
        }
        query.date.$lte = toDate;
      }
    }
    
    // Obtener ejercicios
    let exercisesQuery = db.collection('exercises')
      .find(query)
      .project({ description: 1, duration: 1, date: 1, _id: 0 });
    
    // Aplicar límite
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        exercisesQuery = exercisesQuery.limit(limitNum);
      }
    }
    
    // Ordenar por fecha (más reciente primero)
    exercisesQuery = exercisesQuery.sort({ date: -1 });
    
    const exercises = await exercisesQuery.toArray();
    
    // Formatear respuesta
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id.toString(),
      username: user.username,
      count: log.length,
      log: log
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'Exercise Tracker API is working!' });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
  await connectToDatabase();
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
  }
  process.exit(0);
});
