require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiProxyRouter = require('./routes/apiProxy');
const { router: resourceNavigatorRouter, fetchFeaturedItem } = require('./routes/resourceNavigator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/nasa', apiProxyRouter);
app.use('/api/resources', resourceNavigatorRouter);

app.get('/', (req, res) => res.send('NASA System 7 Portal Backend is running.'));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  fetchFeaturedItem(); // Fetch the featured item when the server starts.
});
