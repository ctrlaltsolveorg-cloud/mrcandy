import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Socket.io logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_delivery_room', () => {
    socket.join('delivery_boys');
    console.log(`Socket ${socket.id} joined delivery_boys room`);
  });

  socket.on('join_user_room', (deviceId: string) => {
    socket.join(`user_${deviceId}`);
    console.log(`Socket ${socket.id} joined user room: user_${deviceId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Export a helper to broadcast orders
export const broadcastNewOrder = (order: any) => {
  console.log('Broadcasting new order to delivery_boys room:', order.id);
  io.to('delivery_boys').emit('new_order', order);
};

// Root route
app.get('/', (req, res) => {
  res.send('Mr. Candy Backend API is running');
});

// Export both app and io (via server)
export { app, server, io };
