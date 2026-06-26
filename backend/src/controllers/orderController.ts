import { Request, Response } from 'express';
import prisma from '../prisma';
import { io, broadcastNewOrder } from '../app';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { items, totalAmount, customerName, customerPhone, address, pincode, customerId, deliveryCharges, distance } = req.body;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
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
          deliveryCharges: Number(deliveryCharges || 0),
          distance: Number(distance || 0),
          status: 'PENDING',
          otp,
          items: {
            create: items.map((item: any) => ({
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
    broadcastNewOrder(result);

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Order Creation Failed:', error.message);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.query;
    const filter = customerId ? { deviceTrackingId: String(customerId) } : {};

    const orders = await prisma.order.findMany({ 
      where: filter,
      include: { 
        items: { include: { product: true } }, 
        customer: true, 
        deliveryBoy: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error: any) {
    console.error('Fetch Orders Failed:', error.message);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

export const acceptOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  try {
    // For testing, pick any delivery boy from DB
    const deliveryBoy = await prisma.user.findFirst({ where: { role: 'DELIVERY' } });
    
    if (!deliveryBoy) {
        return res.status(400).json({ message: 'No delivery boy found in DB.' });
    }

    const order = await prisma.order.findUnique({ where: { id: id as string } });
    if (!order || order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Order not available' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: id as string },
      data: {
        deliveryBoyId: deliveryBoy.id,
        status: 'ACCEPTED',
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        deliveryBoy: true
      }
    });

    if (updatedOrder.deviceTrackingId) {
      io.to(`user_${updatedOrder.deviceTrackingId}`).emit('order_status_update', updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Accept Order Failed:', error.message);
    res.status(500).json({ message: 'Failed to accept order', error: error.message });
  }
};

export const markOutForDelivery = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: id as string },
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
      io.to(`user_${updatedOrder.deviceTrackingId}`).emit('order_status_update', updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Out for delivery failed:', error.message);
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
};

export const completeOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { otp } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: id as string } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: id as string },
      data: {
        status: 'DELIVERED',
      },
      include: {
        items: { include: { product: true } },
        customer: true,
        deliveryBoy: true
      }
    });

    if (updatedOrder.deviceTrackingId) {
      io.to(`user_${updatedOrder.deviceTrackingId}`).emit('order_status_update', updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Complete Order Failed:', error.message);
    res.status(500).json({ message: 'Failed to complete order', error: error.message });
  }
};

export const toggleItemPacked = async (req: AuthRequest, res: Response) => {
  const { orderId, itemId } = req.params;
  const { isPacked } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId as string } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId as string },
      data: { isPacked },
      include: { product: true }
    });

    // Notify the specific customer that an item's packing status changed
    if (order.deviceTrackingId) {
      io.to(`user_${order.deviceTrackingId}`).emit('item_packed_status', {
        orderId,
        itemId,
        isPacked
      });
    }

    res.json(updatedItem);
  } catch (error: any) {
    console.error('Toggle Item Packed Failed:', error.message);
    res.status(500).json({ message: 'Failed to update item status', error: error.message });
  }
};
