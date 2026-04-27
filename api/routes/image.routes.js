const fs = require('fs');
const path = require('path');
const express = require('express');

const router = express.Router()



router.get('/:folder/:filename', (req, res) => {
  const filename = req.params.filename;
  const folder = req.params.folder;
  //const imagePath = path.join(__dirname, 'public', 'uploads', folder, filename);
  const imagePath = path.join(
            __dirname,
            "../public",
            "uploads",
            folder, 
            filename
          );
  

//  return res.status(200).json({imagePath : imagePath})
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  // Send the file with proper headers
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({ error: 'Error serving image' });
    }
  });
});


module.exports = router;