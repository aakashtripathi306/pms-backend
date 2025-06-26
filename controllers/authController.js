// controllers/authController.js
import db from '../db/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
 import dotenv from 'dotenv';
dotenv.config();

export const signup = async (req, res) => {
  const { email, password, company_name } = req.body;

  try {
    const [userExists] = await db.query('SELECT * FROM admin WHERE email = ?', [email]);

    if (userExists.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO admin (email, password, company_name) VALUES (?, ?, ?)',
      [email, hashedPassword, company_name]
    );

    res.status(201).json({ message: 'Signup successful' });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup' });
  }
};


export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM admin WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, company_name: user.company_name },
      process.env.JWT_SECRET, // Secret key for JWT (make sure to store it securely, e.g., in environment variables)
      { expiresIn: '24h' } // Token expiry (1 hour in this case)
    );

    // Send the token back in the response
    res.status(200).json({
      message: 'Login successful',
      token, // Include token in the response
      user: {
        id: user.id,
        email: user.email,
        company_name: user.company_name
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

