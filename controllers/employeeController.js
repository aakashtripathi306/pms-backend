import db from '../db/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const addEmployee = async (req, res) => {
  const { adminId, firstName, lastName, email, password, gender, designation, joinDate } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO employees (admin_id, first_name, last_name, email, password, gender, designation, join_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [adminId, firstName, lastName, email, hashedPassword, gender, designation, joinDate]
    );

    res.status(201).json({ message: 'Employee added successfully', id: result.insertId });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ message: 'Failed to add employee' });
  }
};
export const getEmployeesByAdmin = async (req, res) => {
  const { adminId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id, first_name, last_name, gender, status FROM employees WHERE admin_id = ?',
      [adminId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employees', error: err });
  }
};

export const updateEmployeeStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const sql = 'UPDATE employees SET status = ? WHERE id = ?';
  db.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Status updated successfully' });
  });
};


export const loginEmployee = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query('SELECT id, password, admin_id FROM employees WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, id: user.id, adminId: user.admin_id });
  } catch (error) {
    console.error('Error logging in employee:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const updatePasswordByEmail = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the employee's password by email
    const sql = 'UPDATE employees SET password = ? WHERE email = ?';
    db.query(sql, [hashedPassword, email], (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      res.status(200).json({ message: 'Password updated successfully' });
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};