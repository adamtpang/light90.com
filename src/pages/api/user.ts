import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import User from '../../models/User';

const MONGODB_URI = process.env.MONGODB_URI;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!MONGODB_URI) {
    throw new Error('Please define MONGODB_URI environment variable');
  }

  try {
    if (!mongoose.connections[0].readyState) {
      await mongoose.connect(MONGODB_URI);
    }

    switch (req.method) {
      case 'POST':
        // Create or update user
        const { email, whoopToken, preferences } = req.body;
        const user = await User.findOneAndUpdate(
          { email },
          { whoopToken, preferences },
          { upsert: true, new: true }
        );
        return res.status(200).json(user);

      case 'GET':
        // Get user data
        const { userEmail } = req.query;
        const userData = await User.findOne({ email: userEmail });
        if (!userData) {
          return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json(userData);

      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}