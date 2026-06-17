import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as IOServer } from 'socket.io';

// Import Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import staffRoutes from './routes/staff.js';
import uploadsRoutes from './routes/uploads.js';
import reportsRoutes from './routes/reports.js';
import invoiceRoutes from './routes/invoices.js';
import razorpayRoutes from './routes/razorpay.js';
import notificationRoutes from './routes/notifications.js';
import contactRoutes from './routes/contact.js';
import reviewRoutes from './routes/reviews.js';
import masterRoutes from './routes/master.js';
import wishlistRoutes from './routes/wishlist.js';
import { rateLimiter, securityHeaders } from './middleware/security.js';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srbakery';

// Create http server so Socket.IO can attach
const httpServer = http.createServer(app);
let io = null;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(securityHeaders);
app.use(rateLimiter());

// Base Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'SR Bakery Backend Server is running smoothly.' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routing Registry
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).json({ status: 'error', message: err.message || 'Something went wrong on the server.' });
});

// Start listening and Database connection
console.log('Connecting to MongoDB database at:', MONGODB_URI);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully.');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`SR Bakery Backend Server listening on http://localhost:${PORT}`);
    });

    // Attach Socket.IO
    io = new IOServer(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling']
    });
    app.set('io', io);

    // Socket.IO Event Handlers
    io.on('connection', (socket) => {
      console.log('Socket connected:', socket.id);

      // Join KDS (Kitchen Display System) room
      socket.on('join_kds', () => {
        socket.join('kds');
        console.log('Client joined KDS room:', socket.id);
      });

      socket.on('leave_kds', () => {
        socket.leave('kds');
        console.log('Client left KDS room:', socket.id);
      });

      // Join staff notifications (for assigned staff)
      socket.on('join_staff', (staffId) => {
        socket.join(`staff_${staffId}`);
        console.log(`Staff ${staffId} joined notifications:`, socket.id);
      });

      socket.on('leave_staff', (staffId) => {
        socket.leave(`staff_${staffId}`);
      });

      // Join customer notifications (for order tracking)
      socket.on('join_customer', (customerId) => {
        socket.join(`customer_${customerId}`);
        console.log(`Customer ${customerId} joined notifications:`, socket.id);
      });

      socket.on('leave_customer', (customerId) => {
        socket.leave(`customer_${customerId}`);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    // Expose io to routes via app.set
    console.log('Socket.IO initialized successfully.');

    // Log engine errors for debugging client handshake issues
    try {
      io.engine.on('connection_error', (err) => {
        console.warn('Engine connection_error:', err && err.message);
      });
    } catch (e) {
      // older versions may not expose engine
    }
  })
  .catch(err => {
    console.error('MongoDB Connection Failed:', err.message);
  });

export { io, app, httpServer };
