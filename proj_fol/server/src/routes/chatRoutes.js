const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage, deleteMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:matchId', getChatHistory);
router.post('/:matchId', sendMessage);
router.delete('/:matchId/:messageId', deleteMessage);

module.exports = router;