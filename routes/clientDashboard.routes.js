// routes/client.routes.js
const express = require('express');
const Project = require('../models/Project');
const ProjectUpdate = require('../models/ProjectUpdate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);
// Only clients can access these routes
router.use(authorize('client','super_admin'));

/**
 * GET /api/client/projects
 * Get all projects assigned to the logged-in client
 */
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find({ 
      client: req.user._id 
    })
      .populate('client', 'name email phone company')
      .populate('designers', 'name email profileImage')
      .populate('developers', 'name email profileImage')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: projects.length,
      projects 
    });
  } catch (error) {
    console.error('Error fetching client projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch projects',
      error: error.message 
    });
  }
});

/**
 * GET /api/client/projects/:projectId
 * Get detailed information about a specific project
 * Returns: project name, start date, deadline, cost, payment, status, progress
 */
router.get('/projects/:projectId', async (req, res) => {
  console.log("hello")
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('client', 'name email phone company')
      .populate('designers', 'name email profileImage')
      .populate('developers', 'name email profileImage')
      .populate('remarks.addedBy', 'name role')
      .populate('files.uploadedBy', 'name role');
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
  
    // Verify that the project belongs to the logged-in client
    if (project.client._id.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This project does not belong to you.' 
      });
    }
    console.log("verified")
    // Calculate payment information
    const paymentInfo = {
      totalBudget: project.budget || 0,
      amountPaid: project.paid || 0,
      remainingBalance: (project.budget || 0) - (project.paid || 0),
      paymentPercentage: project.budget ? ((project.paid || 0) / project.budget * 100).toFixed(2) : 0
    };
    
    res.json({ 
      success: true, 
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        deadline: project.deadline,
        completedDate: project.completedDate,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        budget: project.budget,
        actualCost: project.actualCost,
        paid: project.paid,
        paymentInfo,
        designers: project.designers,
        developers: project.developers,
        remarks: project.remarks,
        files: project.files,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch project details',
      error: error.message 
    });
  }
});

/**
 * GET /api/client/projects/:projectId/updates
 * Get all updates for a specific project (only updates visible to client)
 * Groups updates by employee (designer/developer)
 */
router.get('/projects/:projectId/updates', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    // Verify project belongs to the client
    if (project.client.toString() !== req.user._id.toString() && req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This project does not belong to you.' 
      });
    }
    
    // Fetch only updates that are visible to the client
    const updates = await ProjectUpdate.find({ 
      project: req.params.projectId,
      isVisibleToClient: true 
    })
      .populate('user', 'name email role profileImage')
      .sort({ createdAt: -1 });
    
    // Group updates by employee
    const updatesByEmployee = updates.reduce((acc, update) => {
      const userId = update.user._id.toString();
      
      if (!acc[userId]) {
        acc[userId] = {
          employee: {
            _id: update.user._id,
            name: update.user.name,
            email: update.user.email,
            role: update.user.role,
            profileImage: update.user.profileImage
          },
          updates: []
        };
      }
      
      acc[userId].updates.push({
        _id: update._id,
        updateType: update.updateType,
        title: update.title,
        description: update.description,
        files: update.files,
        status: update.status,
        remarks: update.remarks,
        createdAt: update.createdAt,
        updatedAt: update.updatedAt
      });
      
      return acc;
    }, {});
    
    // Convert object to array
    const groupedUpdates = Object.values(updatesByEmployee);
    
    res.json({ 
      success: true,
      totalUpdates: updates.length,
      updatesByEmployee: groupedUpdates,
      allUpdates: updates // Also send flat list for flexibility
    });
  } catch (error) {
    console.error('Error fetching project updates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch project updates',
      error: error.message 
    });
  }
});

/**
 * GET /api/client/projects/:projectId/updates/:updateId
 * Get details of a specific update
 */
router.get('/projects/:projectId/updates/:updateId', async (req, res) => {
  try {
    const update = await ProjectUpdate.findById(req.params.updateId)
      .populate('user', 'name email role profileImage')
      .populate('project', 'name client');
    
    if (!update) {
      return res.status(404).json({ 
        success: false, 
        message: 'Update not found' 
      });
    }
    
    // Verify update belongs to the correct project
    if (update.project._id.toString() !== req.params.projectId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Update does not belong to this project' 
      });
    }
    
    // Verify project belongs to the client
    if (update.project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Verify update is visible to client
    if (!update.isVisibleToClient) {
      return res.status(403).json({ 
        success: false, 
        message: 'This update is not visible to clients' 
      });
    }
    
    res.json({ 
      success: true, 
      update 
    });
  } catch (error) {
    console.error('Error fetching update details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch update details',
      error: error.message 
    });
  }
});

/**
 * GET /api/client/projects/:projectId/statistics
 * Get project statistics and summary
 */
router.get('/projects/:projectId/statistics', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    // Verify project belongs to the client
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Get update counts
    const totalUpdates = await ProjectUpdate.countDocuments({ 
      project: req.params.projectId,
      isVisibleToClient: true 
    });
    
    const designUpdates = await ProjectUpdate.countDocuments({ 
      project: req.params.projectId,
      isVisibleToClient: true,
      updateType: 'design_update'
    });
    
    const developmentUpdates = await ProjectUpdate.countDocuments({ 
      project: req.params.projectId,
      isVisibleToClient: true,
      updateType: 'development_update'
    });
    
    // Calculate days remaining
    let daysRemaining = null;
    if (project.deadline) {
      const today = new Date();
      const deadline = new Date(project.deadline);
      const diffTime = deadline - today;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Calculate project duration
    let projectDuration = null;
    if (project.startDate && project.deadline) {
      const start = new Date(project.startDate);
      const end = new Date(project.deadline);
      const diffTime = end - start;
      projectDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      success: true,
      statistics: {
        totalUpdates,
        designUpdates,
        developmentUpdates,
        progress: project.progress,
        status: project.status,
        daysRemaining,
        projectDuration,
        teamSize: {
          designers: project.designers.length,
          developers: project.developers.length,
          total: project.designers.length + project.developers.length
        },
        payment: {
          budget: project.budget,
          paid: project.paid,
          remaining: (project.budget || 0) - (project.paid || 0),
          percentage: project.budget ? ((project.paid || 0) / project.budget * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching project statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch project statistics',
      error: error.message 
    });
  }
});

/**
 * GET /api/client/dashboard/summary
 * Get overall dashboard summary for the client
 */
router.get('/dashboard/summary', async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments({ 
      client: req.user._id 
    });
    
    const activeProjects = await Project.countDocuments({ 
      client: req.user._id,
      status: { $in: ['in_progress', 'review'] }
    });
    
    const completedProjects = await Project.countDocuments({ 
      client: req.user._id,
      status: 'completed'
    });
    
    const pendingProjects = await Project.countDocuments({ 
      client: req.user._id,
      status: 'pending'
    });
    
    // Get total budget and payments
    const projects = await Project.find({ client: req.user._id });
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalPaid = projects.reduce((sum, p) => sum + (p.paid || 0), 0);
    
    res.json({
      success: true,
      summary: {
        totalProjects,
        activeProjects,
        completedProjects,
        pendingProjects,
        totalBudget,
        totalPaid,
        remainingPayment: totalBudget - totalPaid
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard summary',
      error: error.message 
    });
  }
});

module.exports = router;