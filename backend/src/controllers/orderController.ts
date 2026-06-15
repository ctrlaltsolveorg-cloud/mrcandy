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
  const { items, totalAmount, customerName, customerPhone, address, pincode, customerId } = req.body;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Creating order without strict customerId requirement but saving it if provided
      const order = await tx.order.create({
        data: {
          customerId, // Saving the device ID here
          totalAmount,
          customerName,
          customerPhone,
          address,
          pincode,
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
    const filter = customerId ? { customerId: String(customerId) } : {};

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

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING') {
      return res.status(400).json({ message: 'Order not available' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveryBoyId: deliveryBoy.id,
        status: 'ACCEPTED',
      },
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Accept Order Failed:', error.message);
    res.status(500).json({ message: 'Failed to accept order', error: error.message });
  }
};

export const completeOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { otp } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'DELIVERED',
      },
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Complete Order Failed:', error.message);
    res.status(500).json({ message: 'Failed to complete order', error: error.message });
  }
};
