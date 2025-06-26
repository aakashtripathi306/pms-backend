import db from '../db/db.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// 1️⃣ Admin: Create a new meeting
export const createMeeting = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { title } = req.body;

  if (!token) return res.status(401).json({ message: 'Admin token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;

    const meetingId = uuidv4();

    await db.query(
      'INSERT INTO meetings (meeting_id, admin_id, title) VALUES (?, ?, ?)',
      [meetingId, adminId, title || 'Untitled Meeting']
    );

    res.status(201).json({
      message: 'Meeting created successfully',
      meetingId,
      title,
    });
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ message: 'Failed to create meeting' });
  }
};

// 2️⃣ Admin: Get all meetings created by them
export const getMeetingsByAdmin = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Admin token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;

    const [meetings] = await db.query(
      'SELECT * FROM meetings WHERE admin_id = ? ORDER BY created_at DESC',
      [adminId]
    );

    res.status(200).json({ meetings });
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ message: 'Failed to fetch meetings' });
  }
};

// 3️⃣ Employee: Join a meeting using meetingId (only if it belongs to their admin)
export const joinMeeting = async (req, res) => {
  const { meetingId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Employee token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employeeId = decoded.id;

    // Get employee's admin_id
    const [[employee]] = await db.query('SELECT admin_id FROM employees WHERE id = ?', [employeeId]);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Validate meeting
    const [[meeting]] = await db.query('SELECT * FROM meetings WHERE meeting_id = ?', [meetingId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.admin_id !== employee.admin_id) {
      return res.status(403).json({ message: 'Unauthorized: Meeting belongs to a different admin' });
    }

    res.status(200).json({
      message: 'Meeting joined successfully',
      meeting,
    });
  } catch (err) {
    console.error('Error joining meeting:', err);
    res.status(500).json({ message: 'Failed to join meeting' });
  }
};
