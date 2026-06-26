import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products', error });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, wholesaleUnitQty, price, unit, category, photoUrl } = req.body;
  const finalPhotoUrl = photoUrl || null;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        photoUrl: finalPhotoUrl,
        wholesaleUnitQty: parseFloat(wholesaleUnitQty),
        price: parseFloat(price),
        unit: unit || 'pcs',
        category: category || 'Snacks & Munchies',
        retailStock: 0,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, wholesaleUnitQty, price, retailStock, unit, category, photoUrl } = req.body;
  const finalPhotoUrl = photoUrl !== undefined ? photoUrl : undefined;

  try {
    const product = await prisma.product.update({
      where: { id: id as string },
      data: {
        name,
        photoUrl: finalPhotoUrl,
        wholesaleUnitQty: wholesaleUnitQty ? parseFloat(wholesaleUnitQty) : undefined,
        price: price ? parseFloat(price) : undefined,
        unit: unit !== undefined ? unit : undefined,
        retailStock: retailStock !== undefined ? parseFloat(retailStock) : undefined,
        category: category !== undefined ? category : undefined,
      },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product', error });
  }
};

// Mother's interface: Increment inventory by wholesale unit
export const addWholesaleStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { multiplier = 1 } = req.body; // Usually +1 wholesale unit

  try {
    const product = await prisma.product.findUnique({ where: { id: id as string } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: id as string },
      data: {
        retailStock: {
          increment: product.wholesaleUnitQty * multiplier,
        },
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add stock', error });
  }
};

export const deductWholesaleStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { multiplier = 1 } = req.body;

  try {
    const product = await prisma.product.findUnique({ where: { id: id as string } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const deductionAmount = product.wholesaleUnitQty * multiplier;
    
    // Prevent negative stock
    if (product.retailStock < deductionAmount) {
      return res.status(400).json({ message: 'Dukan me itna saman nahi hai ki itna kam kiya ja sake!' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: id as string },
      data: {
        retailStock: {
          decrement: deductionAmount,
        },
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to deduct stock', error });
  }
};
