import express from 'express';
import { addEmployee, getEmployeesByAdmin, loginEmployee, updateEmployeeStatus, updatePasswordByEmail } from '../controllers/employeeController.js';


const router = express.Router();

router.post('/add', addEmployee);
router.get('/:adminId', getEmployeesByAdmin);
router.put('/status/:id', updateEmployeeStatus);
router.post('/login', loginEmployee);
router.put('/update-password', updatePasswordByEmail)
export default router;
