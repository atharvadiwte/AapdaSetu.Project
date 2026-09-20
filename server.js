require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const hazardRoutes = require('./routes/hazards');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AapdaSetu backend is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', hazardRoutes);

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }

  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AapdaSetu backend is running on http://localhost:${PORT}`);
});
