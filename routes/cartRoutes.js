// routes/cartRoutes.js
import express from "express";
import { checkout, getOrders } from "../controller/order.js"
import { addToCart, updateCart, deleteFromCart, getCart } from "../controller/cart.js";

const router = express.Router();

router.post("/add", addToCart);
router.post("/update", updateCart);
router.post("/delete", deleteFromCart);
router.get("/", getCart);
router.post("/checkout", checkout); 
router.get("/orders", getOrders);

export default router;