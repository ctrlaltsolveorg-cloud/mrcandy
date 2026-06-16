"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deductWholesaleStock = exports.addWholesaleStock = exports.updateProduct = exports.createProduct = exports.getAllProducts = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getAllProducts = async (req, res) => {
    try {
        const products = await prisma_1.default.product.findMany();
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch products', error });
    }
};
exports.getAllProducts = getAllProducts;
const createProduct = async (req, res) => {
    const { name, wholesaleUnitQty, price, unit } = req.body;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        const product = await prisma_1.default.product.create({
            data: {
                name,
                photoUrl,
                wholesaleUnitQty: parseFloat(wholesaleUnitQty),
                price: parseFloat(price),
                unit: unit || 'pcs',
                retailStock: 0,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create product', error });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, wholesaleUnitQty, price, retailStock, unit } = req.body;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    try {
        const product = await prisma_1.default.product.update({
            where: { id: id },
            data: {
                name,
                photoUrl,
                wholesaleUnitQty: wholesaleUnitQty ? parseFloat(wholesaleUnitQty) : undefined,
                price: price ? parseFloat(price) : undefined,
                unit: unit !== undefined ? unit : undefined,
                retailStock: retailStock !== undefined ? parseFloat(retailStock) : undefined,
            },
        });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update product', error });
    }
};
exports.updateProduct = updateProduct;
// Mother's interface: Increment inventory by wholesale unit
const addWholesaleStock = async (req, res) => {
    const { id } = req.params;
    const { multiplier = 1 } = req.body; // Usually +1 wholesale unit
    try {
        const product = await prisma_1.default.product.findUnique({ where: { id: id } });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const updatedProduct = await prisma_1.default.product.update({
            where: { id: id },
            data: {
                retailStock: {
                    increment: product.wholesaleUnitQty * multiplier,
                },
            },
        });
        res.json(updatedProduct);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to add stock', error });
    }
};
exports.addWholesaleStock = addWholesaleStock;
const deductWholesaleStock = async (req, res) => {
    const { id } = req.params;
    const { multiplier = 1 } = req.body;
    try {
        const product = await prisma_1.default.product.findUnique({ where: { id: id } });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const deductionAmount = product.wholesaleUnitQty * multiplier;
        // Prevent negative stock
        if (product.retailStock < deductionAmount) {
            return res.status(400).json({ message: 'Dukan me itna saman nahi hai ki itna kam kiya ja sake!' });
        }
        const updatedProduct = await prisma_1.default.product.update({
            where: { id: id },
            data: {
                retailStock: {
                    decrement: deductionAmount,
                },
            },
        });
        res.json(updatedProduct);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to deduct stock', error });
    }
};
exports.deductWholesaleStock = deductWholesaleStock;
