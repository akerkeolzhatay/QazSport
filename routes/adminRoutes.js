import express from "express";
import { isAdmin } from "../middlewares/isAdmin.js";
import Food from "../models/food.js";
import Order from "../models/order.js";

const router = express.Router();

router.get("/foods", isAdmin, async (req, res) => {
    try {
        const foods = await Food.find();
        res.render('admin/foods', { foods, user: req.session.user }); 
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/foods/new", isAdmin, (req, res) => {
    res.render("admin/newFood", {user: req.session.user});
});

router.post("/foods", isAdmin, async (req, res) => {
    try {
        const { name, variants, prices, category, image, description } = req.body;

        let parsedPrices;
        try {
            parsedPrices = JSON.parse(prices);
        } catch (err) {
            return res.status(400).json({ success: false, message: "Invalid price format" });
        }

        const newFood = new Food({ 
            name, 
            variants: variants.split(','), 
            prices: parsedPrices, 
            category, 
            image, 
            description 
        });

        await newFood.save();
        res.redirect("/admin/foods");
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



router.get("/foods/:id/edit", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const food = await Food.findById(id);
        res.render("admin/editFood", { food, user: req.session.user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.put("/foods/:id", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, variants, prices, category, image, description } = req.body;
        const updatedFood = await Food.findByIdAndUpdate(id, { name, variants: variants.split(','), prices: JSON.parse(prices), category, image, description }, { new: true });
        res.redirect("/admin/foods");
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.delete("/foods/:id", isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await Food.findByIdAndDelete(id);
        res.redirect("/admin/foods");
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get('/orders', isAdmin, async (req, res) => {
    try {
        const orders = await Order.find({}).populate('userId'); 
        res.render('admin/adminOrder', { 
            orders: orders,
            user: req.session.user 
        });
    } catch (error) {
        console.error("Error receiving orders:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/orders/:orderId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        order.orderStatus = status;
        await order.save();

        res.json({ success: true, message: "Order status updated" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error updating status" });
    }
});

router.delete('/orders/:orderId', isAdmin, async (req, res) => {
    try {
        console.log("Deleting an order:", req.params.orderId); 
        const order = await Order.findByIdAndDelete(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        res.json({ success: true, message: "Order deleted" });
    } catch (error) {
        console.error("Error deleting status:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


export default router;