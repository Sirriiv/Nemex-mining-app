const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authMiddleware } = require('../middleware/auth');

// Protected routes
router.get('/', authMiddleware, taskController.getTasks);
router.get('/stats', authMiddleware, taskController.getTaskStats);
router.post('/:taskId/complete', authMiddleware, taskController.completeTask);

module.exports = router;