const express = require('express');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Delete image endpoint
router.post('/delete', async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Public ID required' });
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;