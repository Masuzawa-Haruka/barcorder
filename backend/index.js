require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/product',      require('./routes/product'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/refrigerators', require('./routes/refrigerators'));
app.use('/api/items',        require('./routes/items'));

app.listen(port, () => {
    console.log(`✅ Backend server listening on port ${port}`);
});
