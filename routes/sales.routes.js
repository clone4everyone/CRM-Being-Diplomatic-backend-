// routes/sales.routes.js
const express = require('express');
const Lead = require('../models/Lead');
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();
const SalesTarget=require('../models/SalesTarget')

// All sales routes require authentication
router.use(authenticate);

// Create Lead
router.post('/leads', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, company, category, estimatedValue, description, salesPerson } = req.body;
    
    const lead = new Lead({
      salesPerson,
      clientName,
      clientEmail,
      clientPhone,
      company,
      category,
      estimatedValue,
      description
    });
    
    await lead.save();
    await lead.populate('salesPerson', 'name email');
    
    res.status(201).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Leads
router.get('/leads', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { status, category, salesPerson } = req.query;
    
    const filter = {};
    
    // Sales person can only see their own leads unless they're admin
    if (req.user.role === 'sales') {
      filter.salesPerson = req.user._id;
    } else if (salesPerson) {
      filter.salesPerson = salesPerson;
    }
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    const leads = await Lead.find(filter)
      .populate('salesPerson', 'name email')
      .populate('convertedToProject', 'name status')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Lead
router.get('/leads/:leadId', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId)
      .populate('salesPerson', 'name email')
      .populate('convertedToProject', 'name status')
      .populate('remarks.addedBy', 'name');
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only see their own leads
    if (req.user.role === 'sales' && lead.salesPerson._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Lead
router.put('/leads/:leadId', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only update their own leads
    if (req.user.role === 'sales' && lead.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const { clientName, clientEmail, clientPhone, company, category, status, estimatedValue, description } = req.body;
    
    if (clientName) lead.clientName = clientName;
    if (clientEmail) lead.clientEmail = clientEmail;
    if (clientPhone) lead.clientPhone = clientPhone;
    if (company) lead.company = company;
    if (category) lead.category = category;
    if (status) lead.status = status;
    if (estimatedValue !== undefined) lead.estimatedValue = estimatedValue;
    if (description) lead.description = description;
    
    await lead.save();
    await lead.populate('salesPerson', 'name email');
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Remark to Lead
router.post('/leads/:leadId/remarks', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { text } = req.body;
    
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only add remarks to their own leads
    if (req.user.role === 'sales' && lead.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    lead.remarks.push({
      text,
      addedBy: req.user._id,
      addedAt: new Date()
    });
    
    await lead.save();
    await lead.populate('remarks.addedBy', 'name');
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Lead
router.delete('/leads/:leadId', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only delete their own leads
    if (req.user.role === 'sales' && lead.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    await lead.deleteOne();
    
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Lead Statistics
router.get('/statistics/overview', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'sales' ? { salesPerson: req.user._id } : {};
    
    const totalLeads = await Lead.countDocuments(filter);
    const pendingLeads = await Lead.countDocuments({ ...filter, status: 'pending' });
    const confirmedLeads = await Lead.countDocuments({ ...filter, status: 'confirmed' });
    const convertedLeads = await Lead.countDocuments({ ...filter, status: 'converted' });
    
    const leadsByCategory = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const leadsByStatus = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      statistics: {
        totalLeads,
        pendingLeads,
        confirmedLeads,
        convertedLeads,
        leadsByCategory,
        leadsByStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== LEADS MANAGEMENT ====================

// Get My Leads (Sales Person)
router.get('/my-leads', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { status, category, priority, search } = req.query;
    
    const filter = { 
      salesPerson: req.user.role === 'sales' ? req.user._id : req.query.salesPersonId,
      isActive: true 
    };
    // if (status) filter.status = status;
    // if (category) filter.category = category;
    // if (priority) filter.priority = priority;
    
    // if (search) {
    //   filter.$or = [
    //     { clientName: new RegExp(search, 'i') },
    //     { clientEmail: new RegExp(search, 'i') },
    //     { clientPhone: new RegExp(search, 'i') },
    //     { company: new RegExp(search, 'i') }
    //   ];
    // }
    
    const leads = await Lead.find(filter)
      .populate('salesPerson', 'name email')
      .populate('activities.performedBy', 'name')
      .sort({ nextFollowUpDate: 1, createdAt: -1 });
    res.json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Today's Pipeline
router.get('/today-pipeline', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const salesPersonId = req.user.role === 'sales' ? req.user._id : req.query.salesPersonId;

    // Follow-ups due today
    const followUps = await Lead.find({
      salesPerson: salesPersonId,
      nextFollowUpDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['converted', 'lost', 'rejected'] }
    }).populate('salesPerson', 'name email');

    // Overdue follow-ups
    const overdue = await Lead.find({
      salesPerson: salesPersonId,
      nextFollowUpDate: { $lt: today },
      status: { $nin: ['converted', 'lost', 'rejected'] }
    }).populate('salesPerson', 'name email');

    // New leads (created in last 3 days, not contacted)
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const newLeads = await Lead.find({
      salesPerson: salesPersonId,
      status: 'new',
      createdAt: { $gte: threeDaysAgo }
    }).populate('salesPerson', 'name email');

    // Hot deals
    const hotDeals = await Lead.find({
      salesPerson: salesPersonId,
      category: 'hot_deal',
      status: { $nin: ['converted', 'lost', 'rejected'] }
    }).populate('salesPerson', 'name email');

    res.json({
      success: true,
      pipeline: {
        followUpsToday: followUps,
        overdueFollowUps: overdue,
        newLeads,
        hotDeals
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Sales Stats
router.get('/stats', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const salesPersonId = req.user.role === 'sales' ? req.user._id : req.query.salesPersonId;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Total leads
    const totalLeads = await Lead.countDocuments({ 
      salesPerson: salesPersonId,
      isActive: true 
    });

    // Leads by status
    const newLeads = await Lead.countDocuments({ 
      salesPerson: salesPersonId, 
      status: 'new' 
    });
    
    const contacted = await Lead.countDocuments({ 
      salesPerson: salesPersonId, 
      status: 'contacted' 
    });
    
    const negotiation = await Lead.countDocuments({ 
      salesPerson: salesPersonId, 
      status: 'negotiation' 
    });
    
    const converted = await Lead.countDocuments({ 
      salesPerson: salesPersonId, 
      status: 'converted' 
    });

    // This month stats
    const monthLeads = await Lead.countDocuments({
      salesPerson: salesPersonId,
      createdAt: { $gte: startOfMonth }
    });

    const monthConverted = await Lead.countDocuments({
      salesPerson: salesPersonId,
      status: 'converted',
      conversionDate: { $gte: startOfMonth }
    });

    // This week stats
    const weekLeads = await Lead.countDocuments({
      salesPerson: salesPersonId,
      createdAt: { $gte: startOfWeek }
    });

    const weekConverted = await Lead.countDocuments({
      salesPerson: salesPersonId,
      status: 'converted',
      conversionDate: { $gte: startOfWeek }
    });

    // Revenue
    const totalRevenue = await Lead.aggregate([
      { 
        $match: { 
          salesPerson: salesPersonId, 
          status: 'converted',
          actualValue: { $exists: true, $ne: null }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$actualValue' } 
        } 
      }
    ]);

    const monthRevenue = await Lead.aggregate([
      { 
        $match: { 
          salesPerson: salesPersonId, 
          status: 'converted',
          conversionDate: { $gte: startOfMonth },
          actualValue: { $exists: true, $ne: null }
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$actualValue' } 
        } 
      }
    ]);

    // Conversion rate
    const conversionRate = totalLeads > 0 
      ? ((converted / totalLeads) * 100).toFixed(2) 
      : 0;

    res.json({
      success: true,
      stats: {
        overview: {
          totalLeads,
          newLeads,
          contacted,
          negotiation,
          converted,
          conversionRate
        },
        thisMonth: {
          leads: monthLeads,
          converted: monthConverted,
          revenue: monthRevenue[0]?.total || 0
        },
        thisWeek: {
          leads: weekLeads,
          converted: weekConverted
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          thisMonth: monthRevenue[0]?.total || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Lead (Sales can create their own, Admin can assign)
// Create Lead (Sales can create their own, Admin can assign)
router.post('/leads', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { 
      clientName, clientEmail, clientPhone, company, 
      category, priority, estimatedValue, description, 
      nextFollowUpDate, source, targetCloseDate,
      salesPerson
    } = req.body;
    
    const lead = new Lead({
      salesPerson: req.user.role === 'super_admin' && salesPerson 
        ? salesPerson 
        : req.user._id,
      assignedBy: req.user._id,
      clientName,
      clientEmail,
      clientPhone,
      company,
      category,
      priority: priority || 'medium',
      estimatedValue,
      description,
      nextFollowUpDate,
      source,
      targetCloseDate,
      status: 'new'
    });
    
    await lead.save();
    await lead.populate('salesPerson', 'name email');
    
    // Update target achievements
    await updateTargetAchievements(lead.salesPerson);
    
    res.status(201).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Lead
router.get('/leads/:leadId', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId)
      .populate('salesPerson', 'name email')
      .populate('activities.performedBy', 'name')
      .populate('remarks.addedBy', 'name')
      .populate('convertedToProject', 'name status');
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only see their own leads
    if (req.user.role === 'sales' && lead.salesPerson._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Lead Status & Details
router.put('/leads/:leadId', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only update their own leads
    if (req.user.role === 'sales' && lead.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const { 
      clientName, clientEmail, clientPhone, company,
      category, status, priority, estimatedValue, actualValue,
      description, nextFollowUpDate, lastContactedDate,
      targetCloseDate, lostReason
    } = req.body;
    
    // Track status changes
    if (status && status !== lead.status) {
      lead.activities.push({
        type: 'status_change',
        description: `Status changed from ${lead.status} to ${status}`,
        performedBy: req.user._id
      });

      // Set conversion date
      if (status === 'converted' && !lead.conversionDate) {
        lead.conversionDate = new Date();
        lead.actualCloseDate = new Date();
      }
    }
    
    // Update fields
    if (clientName) lead.clientName = clientName;
    if (clientEmail) lead.clientEmail = clientEmail;
    if (clientPhone) lead.clientPhone = clientPhone;
    if (company) lead.company = company;
    if (category) lead.category = category;
    if (status) lead.status = status;
    if (priority) lead.priority = priority;
    if (estimatedValue !== undefined) lead.estimatedValue = estimatedValue;
    if (actualValue !== undefined) lead.actualValue = actualValue;
    if (description) lead.description = description;
    if (nextFollowUpDate) lead.nextFollowUpDate = nextFollowUpDate;
    if (lastContactedDate) lead.lastContactedDate = lastContactedDate;
    if (targetCloseDate) lead.targetCloseDate = targetCloseDate;
    if (lostReason) lead.lostReason = lostReason;
    
    await lead.save();
    await lead.populate('salesPerson', 'name email');
        if (status === 'converted') {
      await updateTargetAchievements(lead.salesPerson);
    }

    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Activity (Call, Email, Meeting, Note)
router.post('/leads/:leadId/activity', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { type, description, notes, outcome, nextAction } = req.body;
    
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only add activity to their own leads
    if (req.user.role === 'sales' && lead.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    lead.activities.push({
      type,
      description,
      notes,
      outcome,
      nextAction,
      performedBy: req.user._id
    });

    // Update last contacted date if it's a call, email, or meeting
    if (['call', 'email', 'meeting'].includes(type)) {
      lead.lastContactedDate = new Date();
    }
    
    await lead.save();
    await lead.populate('activities.performedBy', 'name');
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Remark/Note to Lead
router.post('/leads/:leadId/remarks', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { text } = req.body;
    
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    // Sales person can only add remarks to their own leads
    if (req.user.role === 'sales' && lead.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    lead.remarks.push({
      text,
      addedBy: req.user._id
    });
    
    await lead.save();
    await lead.populate('remarks.addedBy', 'name');
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ADMIN - LEAD ASSIGNMENT ====================

// Assign/Reassign Lead (Admin only)
router.put('/leads/:leadId/assign', authorize('super_admin'), async (req, res) => {
  try {
    const { salesPersonId } = req.body;
    
    const lead = await Lead.findById(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    lead.salesPerson = salesPersonId;
    lead.assignedBy = req.user._id;
    lead.assignedDate = new Date();
    
    lead.activities.push({
      type: 'note',
      description: `Lead reassigned to new sales person`,
      performedBy: req.user._id
    });
    
    await lead.save();
    await lead.populate('salesPerson', 'name email');
    
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Sales People Performance (Admin only)
router.get('/admin/performance', authorize('super_admin'), async (req, res) => {
  try {
    const salesPeople = await User.find({ role: 'sales', active: true });
    
    const performance = await Promise.all(
      salesPeople.map(async (person) => {
        const totalLeads = await Lead.countDocuments({ 
          salesPerson: person._id 
        });
        
        const converted = await Lead.countDocuments({ 
          salesPerson: person._id, 
          status: 'converted' 
        });
        
        const revenue = await Lead.aggregate([
          { 
            $match: { 
              salesPerson: person._id, 
              status: 'converted',
              actualValue: { $exists: true, $ne: null }
            } 
          },
          { 
            $group: { 
              _id: null, 
              total: { $sum: '$actualValue' } 
            } 
          }
        ]);
        
        return {
          salesPerson: {
            _id: person._id,
            name: person.name,
            email: person.email
          },
          totalLeads,
          converted,
          conversionRate: totalLeads > 0 
            ? ((converted / totalLeads) * 100).toFixed(2) 
            : 0,
          revenue: revenue[0]?.total || 0
        };
      })
    );
    
    res.json({ success: true, performance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TARGETS MANAGEMENT ====================

// Set Target (Admin only)
router.post('/targets', authorize('super_admin'), async (req, res) => {
  try {
    const { 
      salesPersonId, targetType, year, month, week, quarter,
      leadsTarget, conversionsTarget, revenueTarget, notes 
    } = req.body;
    
    const target = new SalesTarget({
      salesPerson: salesPersonId,
      targetType,
      year,
      month,
      week,
      quarter,
      leadsTarget,
      conversionsTarget,
      revenueTarget,
      notes,
      setBy: req.user._id
    });
    
    await target.save();
    await target.populate('salesPerson', 'name email');
    
    res.status(201).json({ success: true, target });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target already exists for this period' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get My Targets
// Helper function to update target achievements
const updateTargetAchievements = async (salesPersonId) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Find active monthly target for current month
    const monthlyTarget = await SalesTarget.findOne({
      salesPerson: salesPersonId,
      targetType: 'monthly',
      year: currentYear,
      month: currentMonth,
      isActive: true
    });
    
    if (monthlyTarget) {
      // Count leads created this month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
      
      const leadsThisMonth = await Lead.countDocuments({
        salesPerson: salesPersonId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      const conversionsThisMonth = await Lead.countDocuments({
        salesPerson: salesPersonId,
        status: 'converted',
        conversionDate: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      const revenueResult = await Lead.aggregate([
        {
          $match: {
            salesPerson: salesPersonId,
            status: 'converted',
            conversionDate: { $gte: startOfMonth, $lte: endOfMonth },
            actualValue: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$actualValue' }
          }
        }
      ]);
      
      monthlyTarget.leadsAchieved = leadsThisMonth;
      monthlyTarget.conversionsAchieved = conversionsThisMonth;
      monthlyTarget.revenueAchieved = revenueResult[0]?.total || 0;
      
      await monthlyTarget.save();
    }
  } catch (error) {
    console.error('Error updating target achievements:', error);
  }
};

// Get My Targets
router.get('/my-targets', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const salesPersonId = req.user.role === 'sales' 
      ? req.user._id 
      : req.query.salesPersonId;
    
    // Update achievements before fetching
    await updateTargetAchievements(salesPersonId);
    
    const targets = await SalesTarget.find({ 
      salesPerson: salesPersonId,
      isActive: true 
    })
      .populate('salesPerson', 'name email')
      .populate('setBy', 'name')
      .sort({ year: -1, month: -1 });
    
    res.json({ success: true, targets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Target Achievement (Auto-calculated but can be manually updated)
router.put('/targets/:targetId', authorize('super_admin'), async (req, res) => {
  try {
    const { 
      leadsTarget, conversionsTarget, revenueTarget,
      leadsAchieved, conversionsAchieved, revenueAchieved 
    } = req.body;
    
    const target = await SalesTarget.findById(req.params.targetId);
    
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target not found' });
    }
    
    if (leadsTarget !== undefined) target.leadsTarget = leadsTarget;
    if (conversionsTarget !== undefined) target.conversionsTarget = conversionsTarget;
    if (revenueTarget !== undefined) target.revenueTarget = revenueTarget;
    if (leadsAchieved !== undefined) target.leadsAchieved = leadsAchieved;
    if (conversionsAchieved !== undefined) target.conversionsAchieved = conversionsAchieved;
    if (revenueAchieved !== undefined) target.revenueAchieved = revenueAchieved;
    
    await target.save();
    await target.populate('salesPerson', 'name email');
    
    res.json({ success: true, target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports = router;