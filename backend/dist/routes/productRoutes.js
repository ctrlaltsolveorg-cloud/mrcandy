"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const router = (0, express_1.Router)();
// Public/User: View products
router.get('/', productController_1.getAllProducts);
// Admin: Create/Update products
router.post('/', productController_1.createProduct);
router.put('/:id', productController_1.updateProduct);
// Mother/Admin: Inventory management
router.post('/:id/add-stock', productController_1.addWholesaleStock);
router.post('/:id/deduct-stock', productController_1.deductWholesaleStock);
exports.default = router;
