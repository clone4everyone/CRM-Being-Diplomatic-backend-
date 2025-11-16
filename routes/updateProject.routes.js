// routes/updateProject.routes.js
// Additional routes for developer project updates - Add these to your existing project routes

const express = require('express');
const Project = require('../models/Project');
const ProjectUpdate = require('../models/ProjectUpdate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {

    let filter = {};
    
    // Filter based on user role
    if (req.user.role === 'client') {
      filter.client = req.user._id;
    } else if (req.user.role === 'designer') {
      filter.designers = req.user._id;
    } else if (req.user.role === 'developer') {
      filter.developers = req.user._id;
    }
    
    
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

router.get('/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('client', 'name email company')
      .populate('designers', 'name email')
      .populate('developers', 'name email');
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check access permissions
    const hasAccess = 
      req.user.role === 'super_admin' ||
      req.user.role === 'developer' ||
       req.user.role === 'designer' ||
      project.client.toString() === req.user._id.toString() ||
      project.designers.some(d => d.toString() === req.user._id.toString()) ||
      project.developers.some(d => d.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Project Updates (Enhanced for developers)
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
    
    // Developers see their own updates and design updates
    if (req.user.role === 'developer') {
      filter.$or = [
        { user: req.user._id },
        { updateType: 'design_update' },
        { updateType: 'status_change' }
      ];
    }
    
    // Designers see their own updates and development updates
    if (req.user.role === 'designer') {
      filter.$or = [
        { user: req.user._id },
        { updateType: 'development_update' },
        { updateType: 'status_change' }
      ];
    }
    
    const updates = await ProjectUpdate.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, updates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Project Update (Enhanced for developers)
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
        return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this project.' });
      }
    }
    
    // Auto-determine updateType based on user role if not provided
    let finalUpdateType = updateType;
    if (!finalUpdateType) {
      if (req.user.role === 'developer') {
        finalUpdateType = 'development_update';
      } else if (req.user.role === 'designer') {
        finalUpdateType = 'design_update';
      } else {
        finalUpdateType = 'status_change';
      }
    }
    
    const update = new ProjectUpdate({
      project: req.params.projectId,
      user: req.user._id,
      updateType: finalUpdateType,
      title: title || `${req.user.role === 'developer' ? 'Development' : 'Design'} Update`,
      description,
      files: files || [],
      status,
      remarks,
      isVisibleToClient: isVisibleToClient !== undefined ? isVisibleToClient : true
    });
    
    await update.save();
    await update.populate('user', 'name email role');
    
    // Update project status if provided
    if (status && status !== project.status) {
      project.status = status;
      if (status === 'completed' && !project.completedDate) {
        project.completedDate = new Date();
      }
      await project.save();
    }
    
    res.status(201).json({ success: true, update });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Project Status (For developers to update progress)
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

// Delete Project Update (Optional - for developers to delete their own updates)
router.delete('/:projectId/updates/:updateId', async (req, res) => {
  try {
    const update = await ProjectUpdate.findById(req.params.updateId);
    
    if (!update) {
      return res.status(404).json({ success: false, message: 'Update not found' });
    }
    
    // Only the creator or super_admin can delete
    if (update.user.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    await ProjectUpdate.findByIdAndDelete(req.params.updateId);
    
    res.json({ success: true, message: 'Update deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single update details
router.get('/:projectId/updates/:updateId', async (req, res) => {
  try {
    const update = await ProjectUpdate.findById(req.params.updateId)
      .populate('user', 'name email role')
      .populate('project', 'name');
    
    if (!update) {
      return res.status(404).json({ success: false, message: 'Update not found' });
    }
    
    // Check if update belongs to the project
    if (update.project._id.toString() !== req.params.projectId) {
      return res.status(400).json({ success: false, message: 'Update does not belong to this project' });
    }
    
    res.json({ success: true, update });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;