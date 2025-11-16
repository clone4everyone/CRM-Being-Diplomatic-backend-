// routes/admin.routes.js
const express = require('express');
const User = require('../models/User');
const Project = require('../models/Project');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require super_admin role
router.use(authenticate, authorize('super_admin'));

// Get Pending Users
router.get('/pending-users', async (req, res) => {
  try {
    const users = await User.find({ 
      isVerified: true, 
      isApproved: false,
      role: { $ne: 'client' } // Exclude clients
    }).select('-password -verificationToken');
    
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve/Reject User
router.put('/users/:userId/approval', async (req, res) => {
  try {
    const { isApproved, role } = req.body;
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isApproved = isApproved;
    if (isApproved && role) {
      user.role = role;
    }
    
    await user.save();

    res.json({ 
      success: true, 
      message: isApproved ? 'User approved successfully' : 'User rejected',
      user 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Users
router.get('/users', async (req, res) => {
  try {
    const { role, active } = req.query;
    const filter = { 
      isApproved: true, // Only show approved users
      role: { $ne: 'client' } // Exclude clients
    };
    
    if (role && role !== 'client') filter.role = role;
    if (active !== undefined) filter.active = active === 'true';
    
    const users = await User.find(filter).select('-password -verificationToken');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Users for project
router.get('/users/forProject', async (req, res) => {
  try {
    const { role, active } = req.query;
    const filter = { 
      isApproved: true, // Only show approved users
      
    };
    
    if (role ) filter.role = role;
    if (active !== undefined) filter.active = active === 'true';
    
    const users = await User.find(filter).select('-password -verificationToken');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Update User Role
router.put('/users/:userId', async (req, res) => {
  try {
    const { name, email, phone, address, role, salary, joiningDate, active } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (role !== undefined && role !== 'client') updateData.role = role;
    if (salary !== undefined) updateData.salary = salary;
    if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
    if (active !== undefined) updateData.active = active;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, user, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Deactivate/Activate User
router.put('/users/:userId/status', async (req, res) => {
  try {
    const { active } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { active },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Get all approved clients with their projects
router.get('/clients', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = { 
      role: 'client',
      isApproved: true 
    };
    
    // Add status filter if provided
    if (status !== undefined) {
      filter.active = status === 'true';
    }

    // Get clients
    let clients = await User.find(filter)
      .select('-password -verificationToken')
      .lean();

    // If search term provided, filter by name, email, or phone
    if (search) {
      const searchLower = search.toLowerCase();
      clients = clients.filter(client => 
        client.name.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower) ||
        (client.phone && client.phone.includes(search))
      );
    }

    // Get projects for each client
    const clientsWithProjects = await Promise.all(
      clients.map(async (client) => {
        const projects = await Project.find({ client: client._id })
          .select('name status priority startDate deadline')
          .lean();
        
        return {
          ...client,
          projects: projects,
          projectCount: projects.length
        };
      })
    );

    res.json({ success: true, clients: clientsWithProjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get pending clients (not approved yet)
router.get('/pending-clients', async (req, res) => {
  try {
    const clients = await User.find({ 
      role: 'client',
      isVerified: true,
      isApproved: false 
    }).select('-password -verificationToken');
    
    res.json({ success: true, clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve/Reject client
router.put('/clients/:clientId/approval', async (req, res) => {
  try {
    const { isApproved } = req.body;
    
    const client = await User.findById(req.params.clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (client.role !== 'client') {
      return res.status(400).json({ success: false, message: 'User is not a client' });
    }

    client.isApproved = isApproved;
    await client.save();

    res.json({ 
      success: true, 
      message: isApproved ? 'Client approved successfully' : 'Client rejected',
      client 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update client details
router.put('/clients/:clientId', async (req, res) => {
  try {
    const { name, email, phone, address, active } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (active !== undefined) updateData.active = active;
    
    const client = await User.findOneAndUpdate(
      { _id: req.params.clientId, role: 'client' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken');
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    res.json({ success: true, client, message: 'Client updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update client status (activate/deactivate)
router.put('/clients/:clientId/status', async (req, res) => {
  try {
    const { active } = req.body;
    
    const client = await User.findOneAndUpdate(
      { _id: req.params.clientId, role: 'client' },
      { active },
      { new: true }
    ).select('-password');
    
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    res.json({ success: true, client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single client with detailed project information
router.get('/clients/:clientId', async (req, res) => {
  try {
    const client = await User.findOne({
      _id: req.params.clientId,
      role: 'client'
    }).select('-password -verificationToken');

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get all projects with populated team members
    const projects = await Project.find({ client: client._id })
      .populate('designers', 'name email')
      .populate('developers', 'name email')
      .lean();

    res.json({ 
      success: true, 
      client: {
        ...client.toObject(),
        projects,
        projectCount: projects.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete client (soft delete by deactivating)
router.delete('/clients/:clientId', async (req, res) => {
  try {
    const client = await User.findOneAndUpdate(
      { _id: req.params.clientId, role: 'client' },
      { active: false },
      { new: true }
    ).select('-password');

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.json({ 
      success: true, 
      message: 'Client deactivated successfully',
      client 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Dashboard Statistics
router.get('/stats', async (req, res) => {
  try {
    // Project Statistics
    const totalProjects = await Project.countDocuments();
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    const pendingProjects = await Project.countDocuments({ status: 'pending' });
    const inProgressProjects = await Project.countDocuments({ status: 'in_progress' });
    const onHoldProjects = await Project.countDocuments({ status: 'on_hold' });
    const cancelledProjects = await Project.countDocuments({ status: 'cancelled' });

    // Financial Statistics
    const projects = await Project.find().lean();
    
    // Total earnings (sum of paid amounts)
    const totalEarnings = projects.reduce((sum, project) => sum + (project.paid || 0), 0);
    
    // Total budget (sum of all project budgets)
    const totalBudget = projects.reduce((sum, project) => sum + (project.budget || 0), 0);
    
    // Pending payments (budget - paid)
    const pendingPayments = projects.reduce((sum, project) => {
      const budget = project.budget || 0;
      const paid = project.paid || 0;
      return sum + (budget - paid);
    }, 0);

    // Employee Salaries (outgoing money)
    const employees = await User.find({ 
      role: { $ne: 'client' },
      active: true,
      isApproved: true 
    }).select('salary').lean();
    
    const totalMonthlySalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
    
    // Net profit (earnings - salaries)
    const netProfit = totalEarnings - totalMonthlySalary;

    // Projects by Status (for pie chart)
    const projectsByStatus = [
      { status: 'pending', count: pendingProjects, label: 'Pending' },
      { status: 'in_progress', count: inProgressProjects, label: 'In Progress' },
      { status: 'completed', count: completedProjects, label: 'Completed' },
      { status: 'on_hold', count: onHoldProjects, label: 'On Hold' },
      { status: 'cancelled', count: cancelledProjects, label: 'Cancelled' }
    ];

    // Monthly project completion trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const completedProjectsByMonth = await Project.aggregate([
      {
        $match: {
          status: 'completed',
          completedDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedDate' },
            month: { $month: '$completedDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Monthly earnings trend (last 6 months)
    const earningsByMonth = await Project.aggregate([
      {
        $match: {
          paid: { $gt: 0 },
          updatedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' }
          },
          earnings: { $sum: '$paid' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Top clients by revenue
    const topClients = await Project.aggregate([
      {
        $group: {
          _id: '$client',
          totalPaid: { $sum: '$paid' },
          projectCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalPaid: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      {
        $unwind: '$clientInfo'
      },
      {
        $project: {
          name: '$clientInfo.name',
          email: '$clientInfo.email',
          totalPaid: 1,
          projectCount: 1
        }
      }
    ]);

    // Active employees count
    const activeEmployees = await User.countDocuments({
      role: { $ne: 'client' },
      active: true,
      isApproved: true
    });

    // Total clients count
    const totalClients = await User.countDocuments({
      role: 'client',
      isApproved: true
    });

    // Project priority distribution
    const projectsByPriority = await Project.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent projects (last 5)
    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('client', 'name email')
      .select('name status priority budget paid createdAt')
      .lean();

    res.json({
      success: true,
      stats: {
        overview: {
          totalProjects,
          completedProjects,
          pendingProjects,
          inProgressProjects,
          activeEmployees,
          totalClients
        },
        financial: {
          totalEarnings,
          totalBudget,
          pendingPayments,
          totalMonthlySalary,
          netProfit
        },
        charts: {
          projectsByStatus,
          projectsByPriority,
          completedProjectsByMonth,
          earningsByMonth
        },
        topClients,
        recentProjects
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get detailed financial report
router.get('/stats/financial-details', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const filter = Object.keys(dateFilter).length > 0 
      ? { updatedAt: dateFilter } 
      : {};

    const projects = await Project.find(filter)
      .populate('client', 'name email')
      .select('name budget paid actualCost status client')
      .lean();

    const employees = await User.find({
      role: { $ne: 'client' },
      active: true,
      isApproved: true
    }).select('name email role salary').lean();

    const totalIncome = projects.reduce((sum, p) => sum + (p.paid || 0), 0);
    const totalExpense = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
    const netBalance = totalIncome - totalExpense;

    res.json({
      success: true,
      financialDetails: {
        projects,
        employees,
        summary: {
          totalIncome,
          totalExpense,
          netBalance
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Project
router.post('/projects', async (req, res) => {
  try {
    const { name, description, client, designers, developers, deadline, budget, priority } = req.body;
    
    const project = new Project({
      name,
      description,
      client,
      designers: designers || [],
      developers: developers || [],
      deadline,
      budget,
      priority,
      startDate: new Date()
    });
    
    await project.save();
    await project.populate(['client', 'designers', 'developers']);
    
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Project
router.put('/projects/:projectId', async (req, res) => {
  try {
    const updates = req.body;
    
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      updates,
      { new: true }
    ).populate(['client', 'designers', 'developers']);
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign Team to Project
router.put('/projects/:projectId/assign', async (req, res) => {
  try {
    const { designers, developers } = req.body;
    
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    if (designers) project.designers = designers;
    if (developers) project.developers = developers;
    
    await project.save();
    await project.populate(['client', 'designers', 'developers']);
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all users/employees for attendace
router.get('/users/attendance', async (req, res) => {
  const users = await User.find({ role: { $in: ['designer', 'developer', 'sales'] }})
    .select('name email role');
  res.json({ success: true, users });
  
});

// Bulk mark attendance
router.post('/attendance/bulk', async (req, res) => {
  try {
    const { attendances } = req.body; // Array of attendance objects
    const results = await Promise.all(
      attendances.map(att => Attendance.create({ ...att, markedBy: req.user._id }))
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
// Mark Attendance
router.post('/attendance', async (req, res) => {
  try {
    const { userId, date, status, checkIn, checkOut, totalHours, remarks } = req.body;
    
    const attendance = new Attendance({
      user: userId,
      date: new Date(date),
      status,
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      totalHours,
      remarks,
      markedBy: req.user._id
    });
    
    await attendance.save();
    await attendance.populate('user', 'name email');
    
    res.status(201).json({ success: true, attendance });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Attendance already marked for this date' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Attendance
router.get('/attendance', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const filter = {};
    if (userId) filter.user = userId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const attendance = await Attendance.find(filter)
      .populate('user', 'name email role')
      .sort({ date: -1 });
    console.log(attendance)
    res.json({ success: true, attendance });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Attendance
router.put('/attendance/:attendanceId', async (req, res) => {
  try {
    const updates = req.body;
    updates.markedBy = req.user._id;
    
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.attendanceId,
      updates,
      { new: true }
    ).populate('user', 'name email');
    
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process Salary
router.post('/salary', async (req, res) => {
  try {
    const { userId, month, year, baseSalary, bonus, deductions, projectEarnings, remarks } = req.body;
    
    const salary = new Salary({
      user: userId,
      month,
      year,
      baseSalary,
      bonus: bonus || 0,
      deductions: deductions || 0,
      projectEarnings: projectEarnings || [],
      remarks,
      processedBy: req.user._id
    });
    
    await salary.save();
    await salary.populate('user', 'name email role');
    
    res.status(201).json({ success: true, salary });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Salary already processed for this month' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Salary Records
router.get('/salary', async (req, res) => {
  try {
    const { userId, month, year, isPaid } = req.query;
    
    const filter = {};
    if (userId) filter.user = userId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (isPaid !== undefined) filter.isPaid = isPaid === 'true';
    
    const salaries = await Salary.find(filter)
      .populate('user', 'name email role')
      .populate('projectEarnings.project', 'name')
      .sort({ year: -1, month: -1 });
    
    res.json({ success: true, salaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark Salary as Paid
router.put('/salary/:salaryId/paid', async (req, res) => {
  try {
    const salary = await Salary.findByIdAndUpdate(
      req.params.salaryId,
      { isPaid: true, paidDate: new Date() },
      { new: true }
    ).populate('user', 'name email role');
    
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }
    
    res.json({ success: true, salary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isApproved: true });
    const pendingApprovals = await User.countDocuments({ isVerified: true, isApproved: false });
    const activeProjects = await Project.countDocuments({ status: { $in: ['pending', 'in_progress'] } });
    const completedProjects = await Project.countDocuments({ status: 'completed' });
    
    const usersByRole = await User.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        pendingApprovals,
        activeProjects,
        completedProjects,
        usersByRole
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;