const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const MEDXPERT_TENANT_ID = 'medxpert-pharmacy-872200';

module.exports = async function tenantAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required!' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', JSON.stringify(decoded));

    if (decoded.type === 'tenant') {
      req.tenantId = decoded.tenantId;
      req.tenantRole = decoded.role || 'staff';
      next();
    } else if (decoded.tenantId) {
      req.tenantId = decoded.tenantId;
      req.tenantRole = decoded.role || 'owner';
      next();
    } else {
      req.tenantId = MEDXPERT_TENANT_ID;
      req.tenantRole = decoded.role || 'owner';
      next();
    }
  } catch (err) {
    res.status(401).json({ message: 'Invalid token!' });
  }
};