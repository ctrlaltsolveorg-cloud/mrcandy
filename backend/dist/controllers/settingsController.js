"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getSettings = async (req, res) => {
    try {
        const settings = await prisma_1.default.systemSetting.findMany();
        // Format as a simple key-value object
        const config = {};
        settings.forEach(s => {
            config[s.key] = s.value;
        });
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    const { STORE_LAT, STORE_LNG, STORE_ADDRESS } = req.body;
    try {
        const updates = [
            { key: 'STORE_LAT', value: String(STORE_LAT || '') },
            { key: 'STORE_LNG', value: String(STORE_LNG || '') },
            { key: 'STORE_ADDRESS', value: String(STORE_ADDRESS || '') },
        ];
        for (const update of updates) {
            await prisma_1.default.systemSetting.upsert({
                where: { key: update.key },
                update: { value: update.value },
                create: { key: update.key, value: update.value },
            });
        }
        res.json({ message: 'Settings updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update settings', error: error.message });
    }
};
exports.updateSettings = updateSettings;
