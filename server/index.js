import express from 'express';
import cors from 'cors';
import modelsRouter from './routes/models.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/models', modelsRouter);

// Basic error handler (e.g. multer file-type/size errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Something went wrong' });
});

app.get('/', (req, res) => {
  res.send('GLB Viewer API is running. Try GET /api/models');
});

app.listen(PORT, () => {
  console.log(`GLB Viewer API listening on http://localhost:${PORT}`);
});
