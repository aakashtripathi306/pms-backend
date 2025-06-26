import db from '../db/db.js';
import jwt from 'jsonwebtoken';
export const createTask = async (req, res) => {
  const {
    title, description, start_date, due_date,
    priority, status, admin_id, assignedEmployees, position
  } = req.body;
  const io = req.app.get('io');

  try {
    const [result] = await db.query(
      'INSERT INTO tasks (title, description, start_date, due_date, priority, status, admin_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, start_date, due_date, priority, status, admin_id, position || 0]
    );
    const taskId = result.insertId;

    const assignmentInserts = assignedEmployees.map(empId =>
      db.query('INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)', [taskId, empId])
    );

    await Promise.all(assignmentInserts);

    // Fetch employee details for the task
    const [employeeRows] = await db.query(
      'SELECT id, first_name, last_name, gender FROM employees WHERE id IN (?) AND admin_id = ?',
      [assignedEmployees, admin_id]
    );

    const taskData = {
      task_id: taskId,
      title,
      description,
      start_date,
      due_date,
      priority,
      status,
      admin_id,
      position: position || 0,
      employee_ids: assignedEmployees,
      employees: employeeRows.map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        gender: emp.gender
      }))
    };

    // Emit to assigned employees and admin
    assignedEmployees.forEach(empId => {
      // console.log(`Emitting newTask to employee ${empId}`);
      io.to(empId.toString()).emit('newTask', taskData);
    });
    // console.log(`Emitting newTask to admin ${admin_id}`);
    io.to(admin_id.toString()).emit('newTask', taskData);

    res.status(201).json({ message: 'Task created and employees assigned', task_id: taskId });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Error creating task', error: err.message });
  }
};

export const getAssignedTasks = async (req, res) => {
  const { adminId } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        e.id AS employee_id, e.first_name, e.last_name, e.gender,
        t.id AS task_id, t.title, t.description, 
        t.start_date, t.due_date, t.priority, 
        t.status, t.completion_date, t.position
      FROM tasks t
      INNER JOIN task_assignments ta ON ta.task_id = t.id
      INNER JOIN employees e ON ta.employee_id = e.id
      WHERE e.admin_id = ?
      ORDER BY t.position ASC
    `, [adminId]);

    res.status(200).json(rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const {
    title, description, start_date, due_date,
    priority, status, completion_date, position
  } = req.body;
  const io = req.app.get('io');

  try {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (start_date !== undefined) updates.start_date = start_date;
    if (due_date !== undefined) updates.due_date = due_date;
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) updates.status = status;
    if (status === 'Completed' && completion_date !== undefined) {
      updates.completion_date = completion_date;
    } else if (status !== 'Completed') {
      updates.completion_date = null;
    }
    if (position !== undefined) updates.position = position;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => updates[field]);

    const [result] = await db.query(`
      UPDATE tasks SET ${setClause}
      WHERE id = ?
    `, [...values, taskId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const [assigned] = await db.query(
      'SELECT employee_id FROM task_assignments WHERE task_id = ?',
      [taskId]
    );
    const assignedEmployeeIds = assigned.map(row => row.employee_id);

    const [taskRow] = await db.query('SELECT admin_id FROM tasks WHERE id = ?', [taskId]);
    const adminId = taskRow[0].admin_id;

    const taskData = {
      task_id: parseInt(taskId),
      ...updates,
      employee_ids: assignedEmployeeIds
    };

    // Emit to assigned employees and admin
    assignedEmployeeIds.forEach(empId => {
      io.to(empId.toString()).emit('updateTask', taskData);
    });
    io.to(adminId.toString()).emit('updateTask', taskData);

    // Return the taskData in the HTTP response
    res.status(200).json(taskData);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};
export const deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const io = req.app.get('io');

  try {
    const [assigned] = await db.query(
      'SELECT employee_id FROM task_assignments WHERE task_id = ?',
      [taskId]
    );
    const assignedEmployeeIds = assigned.map(row => row.employee_id);

    const [taskRow] = await db.query('SELECT admin_id FROM tasks WHERE id = ?', [taskId]);
    const adminId = taskRow[0]?.admin_id;

    await db.query('DELETE FROM task_assignments WHERE task_id = ?', [taskId]);

    const [taskResult] = await db.query('DELETE FROM tasks WHERE id = ?', [taskId]);

    if (taskResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Emit to assigned employees and admin
    assignedEmployeeIds.forEach(empId => {
      io.to(empId.toString()).emit('deleteTask', { task_id: parseInt(taskId) });
    });
    if (adminId) {
      io.to(adminId.toString()).emit('deleteTask', { task_id: parseInt(taskId) });
    }

    res.status(200).json({ message: 'Task deleted' });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: 'Delete failed', error: err });
  }
};

export const getEmployeeTasks = async (req, res) => {
  const { employeeId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      `
      SELECT 
        t.id AS task_id, t.title, t.description, 
        t.start_date, t.due_date, t.priority, 
        t.status, t.completion_date, t.position,
        e.first_name, e.last_name, e.designation, e.gender
      FROM tasks t
      INNER JOIN task_assignments ta ON ta.task_id = t.id
      INNER JOIN employees e ON ta.employee_id = e.id
      WHERE ta.employee_id = ?
      ORDER BY t.position ASC
      `,
      [employeeId]
    );

    if (rows.length === 0) {
      const [employee] = await db.query(
        'SELECT first_name, last_name, designation, gender FROM employees WHERE id = ?',
        [employeeId]
      );
      return res.status(200).json({ tasks: [], employee: employee[0] || {} });
    }

    res.status(200).json({
      tasks: rows.map(row => ({
        task_id: row.task_id,
        title: row.title,
        description: row.description,
        start_date: row.start_date,
        due_date: row.due_date,
        priority: row.priority,
        status: row.status,
        completion_date: row.completion_date,
        position: row.position,
      })),
      employee: {
        first_name: rows[0].first_name,
        last_name: rows[0].last_name,
        designation: rows[0].designation,
        gender: rows[0].gender,
      },
    });
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};