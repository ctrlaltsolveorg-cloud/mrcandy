"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
// Public/User: View products
router.get('/', productController_1.getAllProducts);
// Admin: Create/Update products
router.post('/', uploadMiddleware_1.upload.single('photo'), productController_1.createProduct);
router.put('/:id', uploadMiddleware_1.upload.single('photo'), productController_1.updateProduct);
// Mother/Admin: Inventory management
router.post('/:id/add-stock', productController_1.addWholesaleStock);
router.post('/:id/deduct-stock', productController_1.deductWholesaleStock);
exports.default = router;
