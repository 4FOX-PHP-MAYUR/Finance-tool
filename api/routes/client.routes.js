const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const auth = require('../middlewares/auth.middleware');
const {
  checkPermission,
  checkAnyPermission,
  ASSIGN_VENDOR_MASTER_DATA_ALTS,
} = require("../middlewares/permission.middleware");

const CLIENT_GET_ALTS = [
  ["clients_list", "view"],
  ["clients_add", "add"],
  ["vendor_hod_review", "view"],
  ["vendor_finance_review", "view"],
  ...ASSIGN_VENDOR_MASTER_DATA_ALTS,
];

// All routes are JWT protected
router.use(auth);

router.post('/', checkPermission("clients_add", "add"), clientController.createClient);
router.get('/', checkAnyPermission(CLIENT_GET_ALTS), clientController.getClients);
router.get('/:id', checkAnyPermission(CLIENT_GET_ALTS), clientController.getClient);
router.put('/:id', checkPermission("clients_list", "update"), clientController.updateClient);
router.delete('/:id', checkPermission("clients_list", "delete"), clientController.deleteClient);
router.patch('/:id/active', checkPermission("clients_list", "update"), clientController.toggleActive);

module.exports = router;
