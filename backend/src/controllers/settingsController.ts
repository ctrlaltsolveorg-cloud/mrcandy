import { Request, Response } from 'express';
import prisma from '../prisma';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    // Format as a simple key-value object
    const config: Record<string, string> = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const { STORE_LAT, STORE_LNG, STORE_ADDRESS } = req.body;

  try {
    const updates = [
      { key: 'STORE_LAT', value: String(STORE_LAT || '') },
      { key: 'STORE_LNG', value: String(STORE_LNG || '') },
      { key: 'STORE_ADDRESS', value: String(STORE_ADDRESS || '') },
    ];

    for (const update of updates) {
      await prisma.systemSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};
