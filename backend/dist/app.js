"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = exports.broadcastNewOrder = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // For development, allow all
        methods: ['GET', 'POST'],
    },
});
exports.io = io;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static('uploads'));
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
app.use('/api/auth', authRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
// Socket.io logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('join_delivery_room', () => {
        socket.join('delivery_boys');
        console.log(`Socket ${socket.id} joined delivery_boys room`);
    });
    socket.on('join_user_room', (deviceId) => {
        socket.join(`user_${deviceId}`);
        console.log(`Socket ${socket.id} joined user room: user_${deviceId}`);
    });
    // Relay live location from Rider to User
    socket.on('delivery_location_update', (data) => {
        io.to(`user_${data.trackingId}`).emit('rider_location', { lat: data.lat, lng: data.lng });
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// Export a helper to broadcast orders
const broadcastNewOrder = (order) => {
    console.log('Broadcasting new order to delivery_boys room:', order.id);
    io.to('delivery_boys').emit('new_order', order);
};
exports.broadcastNewOrder = broadcastNewOrder;
// Root route
app.get('/', (req, res) => {
    res.send('Mr. Candy Backend API is running');
});
