const express = require('express');
const Project = require('../models/Project');
const ProjectUpdate = require('../models/ProjectUpdate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('designer'));

// Get Assigned Projects
router.get('/projects', async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = { designers: req.user._id };
    if (status) filter.status = status;
    
    const projects = await Project.find(filter)
      .populate('client', 'name email company')
      .populate('designers', 'name email')
      .populate('developers', 'name email')
      .sort({ deadline: 1 });
    
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Post Design Update
router.post('/projects/:projectId/updates', async (req, res) => {
  try {
    const { title, description, files, remarks, isVisibleToClient } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if designer is assigned to this project
    const isAssigned = project.designers.some(d => d.toString() === req.user._id.toString());
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this project' });
    }
    
    const update = new ProjectUpdate({
      project: req.params.projectId,
      user: req.user._id,
      updateType: 'design_update',
      title,
      description,
      files: files || [],
      remarks,
      isVisibleToClient: isVisibleToClient !== undefined ? isVisibleToClient : true
    });
    
    await update.save();
    await update.populate('user', 'name email role');
    
    res.status(201).json({ success: true, update });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get My Updates
router.get('/updates', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const filter = { user: req.user._id, updateType: 'design_update' };
    if (projectId) filter.project = projectId;
    
    const updates = await ProjectUpdate.find(filter)
      .populate('project', 'name status')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, updates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const assignedProjects = await Project.countDocuments({ designers: req.user._id });
    const activeProjects = await Project.countDocuments({ 
      designers: req.user._id,
      status: { $in: ['pending', 'in_progress'] }
    });
    const completedProjects = await Project.countDocuments({ 
      designers: req.user._id,
      status: 'completed'
    });
    
    const totalUpdates = await ProjectUpdate.countDocuments({ 
      user: req.user._id,
      updateType: 'design_update'
    });
    
    res.json({
      success: true,
      stats: {
        assignedProjects,
        activeProjects,
        completedProjects,
        totalUpdates
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;