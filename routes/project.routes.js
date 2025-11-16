// routes/project.routes.js
const express = require('express');
const Project = require('../models/Project');
const ProjectUpdate = require('../models/ProjectUpdate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
// create Projects

router.post('/create', async (req, res) => {
  try {
    const {
      name,
      description,
      client,
      designers,
      developers,
      status,
      priority,
      startDate,
      deadline,
      budget
    } = req.body;

    // Validate required fields
    if (!name || !client) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and client are required' 
      });
    }

    const project = new Project({
      name,
      description,
      client,
      designers: designers || [],
      developers: developers || [],
      status: status || 'pending',
      priority: priority || 'medium',
      startDate,
      deadline,
      budget
    });

    await project.save();
    
    const populatedProject = await Project.findById(project._id)
      .populate('client', 'name email company')
      .populate('designers', 'name email')
      .populate('developers', 'name email');

    res.status(201).json({ success: true, project: populatedProject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Get All Projects (filtered by role)
router.get('/', async (req, res) => {
  try {
    const { status, priority } = req.query;
    let filter = {};
    
    // Filter based on user role
    if (req.user.role === 'client') {
      filter.client = req.user._id;
    } else if (req.user.role === 'designer') {
      filter.designers = req.user._id;
    } else if (req.user.role === 'developer') {
      filter.developers = req.user._id;
    }
    // super_admin and sales can see all projects
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    const projects = await Project.find(filter)
      .populate('client', 'name email company')
      .populate('designers', 'name email')
      .populate('developers', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Project
router.get('/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('client', 'name email phone company')
      .populate('designers', 'name email')
      .populate('developers', 'name email')
      .populate('remarks.addedBy', 'name role')
      .populate('files.uploadedBy', 'name role');
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      req.user.role === 'sales' ||
      project.client.toString() === req.user._id.toString() ||
      project.designers.some(d => d._id.toString() === req.user._id.toString()) ||
      project.developers.some(d => d._id.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Remark to Project
router.post('/:projectId/remarks', async (req, res) => {
  try {
    const { text } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      project.client.toString() === req.user._id.toString() ||
      project.designers.some(d => d.toString() === req.user._id.toString()) ||
      project.developers.some(d => d.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
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

// Upload File to Project
router.post('/:projectId/files', async (req, res) => {
  try {
    const { name, url } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Only team members can upload files
    const hasAccess = 
      req.user.role === 'super_admin' ||
      project.designers.some(d => d.toString() === req.user._id.toString()) ||
      project.developers.some(d => d.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    project.files.push({
      name,
      url,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });
    
    await project.save();
    await project.populate('files.uploadedBy', 'name role');
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Project Status
router.put('/:projectId/status', authorize('super_admin', 'designer', 'developer'), async (req, res) => {
  try {
    const { status, progress } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if user is part of the project team
    if (req.user.role !== 'super_admin') {
      const isTeamMember = 
        project.designers.some(d => d.toString() === req.user._id.toString()) ||
        project.developers.some(d => d.toString() === req.user._id.toString());
      
      if (!isTeamMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    if (status) project.status = status;
    if (progress !== undefined) project.progress = progress;
    
    if (status === 'completed' && !project.completedDate) {
      project.completedDate = new Date();
    }
    
    await project.save();
    await project.populate(['client', 'designers', 'developers']);
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Project Updates
router.get('/:projectId/updates', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      req.user.role === 'sales' ||
      project.client.toString() === req.user._id.toString() ||
      project.designers.some(d => d.toString() === req.user._id.toString()) ||
      project.developers.some(d => d.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    let filter = { project: req.params.projectId };
    
    // Clients only see updates marked as visible to them
    if (req.user.role === 'client') {
      filter.isVisibleToClient = true;
    }
    
    const updates = await ProjectUpdate.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, updates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Project Update
router.post('/:projectId/updates', authorize('designer', 'developer', 'super_admin'), async (req, res) => {
  try {
    const { updateType, title, description, files, status, remarks, isVisibleToClient } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if user is part of the project team
    if (req.user.role !== 'super_admin') {
      const isTeamMember = 
        project.designers.some(d => d.toString() === req.user._id.toString()) ||
        project.developers.some(d => d.toString() === req.user._id.toString());
      
      if (!isTeamMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    const update = new ProjectUpdate({
      project: req.params.projectId,
      user: req.user._id,
      updateType,
      title,
      description,
      files: files || [],
      status,
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

// Get Project Statistics
router.get('/statistics/overview', authorize('super_admin', 'sales'), async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ 
      status: { $in: ['pending', 'in_progress'] } 
    });
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    const onHoldProjects = await Project.countDocuments({ status: 'on_hold' });
    
    const projectsByStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const projectsByPriority = await Project.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      statistics: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        projectsByStatus,
        projectsByPriority
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;