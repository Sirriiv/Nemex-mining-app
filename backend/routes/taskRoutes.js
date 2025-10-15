const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Task routes
router.get('/tasks/:userId', taskController.getTasks);
router.post('/tasks/:userId/complete', taskController.completeTask);

module.exports = router;