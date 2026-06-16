"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleItemPacked = exports.completeOrder = exports.markOutForDelivery = exports.acceptOrder = exports.getOrders = exports.createOrder = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const app_1 = require("../app");
const createOrder = async (req, res) => {
    const { items, totalAmount, customerName, customerPhone, address, pincode, customerId } = req.body;
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            // Creating order without strict customerId requirement but saving it if provided
            const order = await tx.order.create({
                data: {
                    deviceTrackingId: customerId, // Saving the device ID here instead of foreign key
                    totalAmount,
                    customerName,
                    customerPhone,
                    address,
                    pincode,
                    status: 'PENDING',
                    otp,
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                },
            });
            // Deduct stock
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        retailStock: {
                            decrement: item.quantity,
                        },
                    },
                });
            }
            return order;
        });
        // Broadcast to delivery boys
        (0, app_1.broadcastNewOrder)(result);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Order Creation Failed:', error.message);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
};
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    try {
        const { customerId } = req.query;
        const filter = customerId ? { deviceTrackingId: String(customerId) } : {};
        const orders = await prisma_1.default.order.findMany({
            where: filter,
            include: {
                items: { include: { product: true } },
                customer: true,
                deliveryBoy: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    }
    catch (error) {
        console.error('Fetch Orders Failed:', error.message);
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
};
exports.getOrders = getOrders;
const acceptOrder = async (req, res) => {
    const { id } = req.params;
    try {
        // For testing, pick any delivery boy from DB
        const deliveryBoy = await prisma_1.default.user.findFirst({ where: { role: 'DELIVERY' } });
        if (!deliveryBoy) {
            return res.status(400).json({ message: 'No delivery boy found in DB.' });
        }
        const order = await prisma_1.default.order.findUnique({ where: { id: id } });
        if (!order || order.status !== 'PENDING') {
            return res.status(400).json({ message: 'Order not available' });
        }
        const updatedOrder = await prisma_1.default.order.update({
            where: { id: id },
            data: {
                deliveryBoyId: deliveryBoy.id,
                status: 'ACCEPTED',
            },
        });
        res.json(updatedOrder);
    }
    catch (error) {
        console.error('Accept Order Failed:', error.message);
        res.status(500).json({ message: 'Failed to accept order', error: error.message });
    }
};
exports.acceptOrder = acceptOrder;
const markOutForDelivery = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedOrder = await prisma_1.default.order.update({
            where: { id: id },
            data: {
                status: 'OUT_FOR_DELIVERY',
            },
            include: {
                items: { include: { product: true } },
                customer: true,
                deliveryBoy: true
            }
        });
        // Notify user that order is out for delivery
        if (updatedOrder.deviceTrackingId) {
            app_1.io.to(`user_${updatedOrder.deviceTrackingId}`).emit('order_status_update', updatedOrder);
        }
        res.json(updatedOrder);
    }
    catch (error) {
        console.error('Out for delivery failed:', error.message);
        res.status(500).json({ message: 'Failed to update order status', error: error.message });
    }
};
exports.markOutForDelivery = markOutForDelivery;
const completeOrder = async (req, res) => {
    const { id } = req.params;
    const { otp } = req.body;
    try {
        const order = await prisma_1.default.order.findUnique({ where: { id: id } });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        const updatedOrder = await prisma_1.default.order.update({
            where: { id: id },
            data: {
                status: 'DELIVERED',
            },
        });
        res.json(updatedOrder);
    }
    catch (error) {
        console.error('Complete Order Failed:', error.message);
        res.status(500).json({ message: 'Failed to complete order', error: error.message });
    }
};
exports.completeOrder = completeOrder;
const toggleItemPacked = async (req, res) => {
    const { orderId, itemId } = req.params;
    const { isPacked } = req.body;
    try {
        const order = await prisma_1.default.order.findUnique({ where: { id: orderId } });
        if (!order)
            return res.status(404).json({ message: 'Order not found' });
        const updatedItem = await prisma_1.default.orderItem.update({
            where: { id: itemId },
            data: { isPacked },
            include: { product: true }
        });
        // Notify the specific customer that an item's packing status changed
        if (order.deviceTrackingId) {
            app_1.io.to(`user_${order.deviceTrackingId}`).emit('item_packed_status', {
                orderId,
                itemId,
                isPacked
            });
        }
        res.json(updatedItem);
    }
    catch (error) {
        console.error('Toggle Item Packed Failed:', error.message);
        res.status(500).json({ message: 'Failed to update item status', error: error.message });
    }
};
exports.toggleItemPacked = toggleItemPacked;
