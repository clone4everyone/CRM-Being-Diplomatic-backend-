// routes/client.routes.js
const express = require('express');
const Project = require('../models/Project');
const ProjectUpdate = require('../models/ProjectUpdate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('client'));

// Get My Projects
router.get('/projects', async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = { client: req.user._id };
    if (status) filter.status = status;
    
    const projects = await Project.find(filter)
      .populate('designers', 'name email')
      .populate('developers', 'name email')
      .populate('remarks.addedBy', 'name role')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Project Details
router.get('/projects/:projectId', async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.projectId,
      client: req.user._id 
    })
      .populate('designers', 'name email phone')
      .populate('developers', 'name email phone')
      .populate('remarks.addedBy', 'name role')
      .populate('files.uploadedBy', 'name role');
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Project Updates
router.get('/projects/:projectId/updates', async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.projectId,
      client: req.user._id 
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Only get updates visible to client
    const updates = await ProjectUpdate.find({ 
      project: req.params.projectId,
      isVisibleToClient: true
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, updates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Feedback/Remark to Project
router.post('/projects/:projectId/remarks', async (req, res) => {
  try {
    const { text } = req.body;
    
    const project = await Project.findOne({ 
      _id: req.params.projectId,
      client: req.user._id 
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    project.remarks.push({
      text,
      addedBy: req.user._id,
      addedAt: new Date()
    });
    
    await project.save();
    await project.populate('remarks.addedBy', 'name role');
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Dashboard Overview
router.get('/dashboard/overview', async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ client: req.user._id });
    const activeProjects = await Project.countDocuments({ 
      client: req.user._id,
      status: { $in: ['pending', 'in_progress'] }
    });
    const completedProjects = await Project.countDocuments({ 
      client: req.user._id,
      status: 'completed'
    });
    const onHoldProjects = await Project.countDocuments({ 
      client: req.user._id,
      status: 'on_hold'
    });
    
    // Get recent updates
    const myProjects = await Project.find({ client: req.user._id }).select('_id');
    const projectIds = myProjects.map(p => p._id);
    
    const recentUpdates = await ProjectUpdate.find({ 
      project: { $in: projectIds },
      isVisibleToClient: true
    })
      .populate('user', 'name role')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        recentUpdates
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Project Timeline
router.get('/projects/:projectId/timeline', async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.projectId,
      client: req.user._id 
    });
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const updates = await ProjectUpdate.find({ 
      project: req.params.projectId,
      isVisibleToClient: true
    })
      .populate('user', 'name role')
      .sort({ createdAt: 1 });
    
    const timeline = [
      {
        event: 'Project Created',
        date: project.createdAt,
        type: 'milestone'
      },
      ...updates.map(update => ({
        event: update.title,
        description: update.description,
        date: update.createdAt,
        type: update.updateType,
        by: update.user.name,
        role: update.user.role
      })),
      ...(project.completedDate ? [{
        event: 'Project Completed',
        date: project.completedDate,
        type: 'milestone'
      }] : [])
    ];
    
    res.json({ success: true, timeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;