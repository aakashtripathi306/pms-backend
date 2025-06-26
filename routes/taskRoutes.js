import express from 'express';
import {  createTask, deleteTask, getAssignedTasks, getEmployeeTasks, updateTask } from '../controllers/taskController.js';
const router = express.Router();

// router.get('/employees/:adminId', getEmployeesByAdmin);
router.post('/create-task', createTask);
router.get('/assigned/:adminId', getAssignedTasks);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);
router.get('/employee/:employeeId', getEmployeeTasks);


export default router;
