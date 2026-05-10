const express = require('express');
const router = express.Router();

const STATE_CODES = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
  '24':'Gujarat','26':'Dadra & Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh',
  '29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu',
  '34':'Puducherry','35':'Andaman & Nicobar','36':'Telangana','37':'Andhra Pradesh'
};

const ENTITY_TYPES = {
  'P':'Proprietor','C':'Company/Pvt Ltd','F':'Firm/LLP','H':'HUF',
  'A':'AOP/BOI','T':'Trust','G':'Government','L':'Local Authority',
  'J':'Artificial Juridical Person','B':'Body of Individuals'
};

router.get('/verify/:gstin', (req, res) => {
  const gstin = req.params.gstin.toUpperCase().trim();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!regex.test(gstin)) {
    return res.json({ success:false, valid:false, message:'Invalid GST format' });
  }

  // GST structure decode
  const stateCode = gstin.substring(0, 2);
  const pan       = gstin.substring(2, 12);         // 10-digit PAN
  const entityKey = pan.charAt(3).toUpperCase();     // 4th char of PAN = entity type
  const regNo     = gstin.substring(12, 13);         // Registration number

  const state      = STATE_CODES[stateCode] || 'Unknown State';
  const entityType = ENTITY_TYPES[entityKey] || 'Business Entity';

  res.json({
    success:    true,
    valid:      true,
    formatOnly: true,
    gstin,
    pan,
    state,
    stateCode,
    entityType,
    regNo,
    message: `✅ Valid GST — ${state}`,
    active: null  // Online verify nahi ho sakta
  });
});

module.exports = router;