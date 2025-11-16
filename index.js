// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Import Routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const salesRoutes = require('./routes/sales.routes');
const projectRoutes = require('./routes/project.routes');
const designerRoutes = require('./routes/designer.routes');
const developerRoutes = require('./routes/developer.routes');
const clientRoutes = require('./routes/client.routes');
const updateProjectRoutes=require("./routes/updateProject.routes");
const clientDashboardRoutes=require("./routes/clientDashboard.routes");
// Route Middleware
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/updateProjects', updateProjectRoutes);
app.use('/api/clientDashboard',clientDashboardRoutes)
// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {} 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});