"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const register = async (req, res) => {
    const { phone, password, name, role } = req.body;
    try {
        const existingUser = await prisma_1.default.user.findUnique({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                phone,
                password: hashedPassword,
                name,
                role: role || 'CUSTOMER',
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role }, token });
    }
    catch (error) {
        res.status(500).json({ message: 'Registration failed', error });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { phone, password } = req.body;
    try {
        const user = await prisma_1.default.user.findUnique({ where: { phone } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role }, token });
    }
    catch (error) {
        res.status(500).json({ message: 'Login failed', error });
    }
};
exports.login = login;
