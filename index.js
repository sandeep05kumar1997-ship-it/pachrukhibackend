const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection String - IMPORTANT: Replace YOUR_PASSWORD with actual password
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sandeep05kumar1997_db_user:DbXbLWP19@pps.grrdy3k.mongodb.net/complaintDB?retryWrites=true&w=majority&appName=pps';

// MongoDB Connection with caching for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    cachedDb = db;
    console.log('✅ MongoDB connected');
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// Complaint Schema
const complaintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  complaint: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'In Progress', 'Resolved']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Complaint Model
const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

// Routes

// Home Route
app.get('/', (req, res) => {
  res.json({ 
    message: '🚔 Bihar Police Complaint System API',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      submit: 'POST /api/complaints',
      getAll: 'GET /api/complaints',
      getOne: 'GET /api/complaints/:id',
      update: 'PATCH /api/complaints/:id',
      delete: 'DELETE /api/complaints/:id',
      health: 'GET /api/health'
    }
  });
});

// Health Check Route
app.get('/api/health', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      mongodb: 'Working'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Submit Complaint
app.post('/api/complaints', async (req, res) => {
  try {
    await connectToDatabase();
    
    const { name, mobile, email, address, complaint } = req.body;

    // Validation
    if (!name || !mobile || !email || !address || !complaint) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sabhi fields zaroori hain!' 
      });
    }

    // Mobile validation
    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number 10 digits ka hona chahiye!'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address daalen!'
      });
    }

    // Create new complaint
    const newComplaint = new Complaint({
      name,
      mobile,
      email,
      address,
      complaint
    });

    // Save to database
    await newComplaint.save();

    res.status(201).json({
      success: true,
      message: 'Complaint successfully submit ho gayi!',
      data: newComplaint
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error! Complaint submit nahi ho payi.',
      error: error.message
    });
  }
});

// Get All Complaints
app.get('/api/complaints', async (req, res) => {
  try {
    await connectToDatabase();
    
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Complaints fetch nahi ho payi',
      error: error.message
    });
  }
});

// Get Single Complaint by ID
app.get('/api/complaints/:id', async (req, res) => {
  try {
    await connectToDatabase();
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint nahi mili'
      });
    }
    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching complaint',
      error: error.message
    });
  }
});

// Update Complaint Status
app.patch('/api/complaints/:id', async (req, res) => {
  try {
    await connectToDatabase();
    
    const { status } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint nahi mili'
      });
    }
    
    res.json({
      success: true,
      message: 'Status update ho gaya!',
      data: complaint
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Status update nahi ho payi',
      error: error.message
    });
  }
});

// Delete Complaint
app.delete('/api/complaints/:id', async (req, res) => {
  try {
    await connectToDatabase();
    
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint nahi mili'
      });
    }
    res.json({
      success: true,
      message: 'Complaint delete ho gayi!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Complaint delete nahi ho payi',
      error: error.message
    });
  }
});

// 404 Handler - Must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route nahi mila',
    requestedPath: req.path,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/complaints',
      'GET /api/complaints',
      'GET /api/complaints/:id',
      'PATCH /api/complaints/:id',
      'DELETE /api/complaints/:id'
    ]
  });
});

// Export for Vercel (serverless)
module.exports = app;
