"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const router = (0, express_1.Router)();
// Temporarily using a hardcoded customerId since auth is removed
router.post('/', (req, res, next) => {
    // Use a default customer ID if none provided
    if (!req.body.customerId) {
        req.body.customerId = 'default-customer-id';
    }
    next();
}, orderController_1.createOrder);
router.get('/', orderController_1.getOrders);
router.post('/:id/accept', orderController_1.acceptOrder);
router.post('/:id/out-for-delivery', orderController_1.markOutForDelivery);
router.post('/:id/complete', orderController_1.completeOrder);
router.put('/:orderId/items/:itemId/pack', orderController_1.toggleItemPacked);
exports.default = router;
