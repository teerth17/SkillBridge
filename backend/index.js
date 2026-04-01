import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// Route to user service
app.use('/users', async (req, res) => {
  const response = await axios({
    method: req.method,
    url: `http://localhost:4000${req.url}`,
    data: req.body,
  });
  res.send(response.data);
});

// Route to mentor service
app.use('/mentors', async (req, res) => {
  const response = await axios({
    method: req.method,
    url: `http://localhost:4001${req.url}`,
    data: req.body,
  });
  res.send(response.data);
});


