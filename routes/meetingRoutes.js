import express from 'express';
import {
  createMeeting,
  getMeetingsByAdmin,
  joinMeeting,
} from '../controllers/meetingController.js';

const router = express.Router();

// Admin routes
router.post('/create', createMeeting);
router.get('/admin', getMeetingsByAdmin);

// Employee route
router.get('/join/:meetingId', joinMeeting);

export default router;
