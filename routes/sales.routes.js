// routes/sales.routes.js
const express = require('express');
const Lead = require('../models/Lead');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All sales routes require authentication
router.use(authenticate);

// Create Lead
router.post('/leads', authorize('sales', 'super_admin'), async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, company, category, estimatedValue, description } = req.body;
    
    const lead = new Lead({
      salesPerson: req.user._id,
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

module.exports = router;