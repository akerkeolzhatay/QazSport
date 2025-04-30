import Cart from "../models/cart.js";

export const getCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Пожалуйста, войдите в свою учетную запись" });
        }

        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId }).populate("items.foodId");

        if (!cart || cart.items.length === 0) {
            if (req.headers.accept && req.headers.accept.includes("application/json")) {
                return res.json({ success: true, items: [], totalPrice: 0 });
            } else {
                return res.render("cart", { items: [], totalPrice: 0, empty: true });
            }
        }

        if (req.headers.accept && req.headers.accept.includes("application/json")) {
            return res.json({ success: true, items: cart.items, totalPrice: cart.totalPrice });
        }

        res.render("cart", { items: cart.items, totalPrice: cart.totalPrice, empty: false });

    } catch (error) {
        console.error("Ошибка при извлечении корзины:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};


export const addToCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Вы не вошли в систему. Пожалуйста, войдите в систему.",
                redirect: "/login"
            });
        }

        const { foodId, name, price, variant, image } = req.body;
        const userId = req.session.user._id;

        if (!foodId) {
            return res.status(400).json({ success: false, message: "ProductId обязателен" });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(item => item.foodId.toString() === foodId && item.variant === variant);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += 1;
        } else {
            cart.items.push({ foodId, name, price, variant, image, quantity: 1 });
        }

        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await cart.save();

        res.json({ success: true, message: "Товар добавлен в корзину", cart });
    } catch (error) {
        console.error("Ошибка добавления в корзину:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

export const updateCart = async (req, res) => {
    try {
        const { itemId, quantity, variant } = req.body;
        const userId = req.session.user._id;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.json({ success: false });

        let item = cart.items.find(item => item.foodId.toString() === itemId && item.variant === variant);
        if (item) {
            item.quantity = Math.max(1, quantity);
        }

        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await cart.save();

        res.json({ success: true });
    } catch (error) {
        console.error("Ошибка добавления в корзину:", error);
        res.status(500).json({ success: false });
    }
};

import mongoose from "mongoose";

export const deleteFromCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не вошли в систему" });
        }

        const { itemId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ success: false, message: "Неверный ID продукта" });
        }

        const userId = req.session.user._id;
        const objectIdItemId = new mongoose.Types.ObjectId(itemId);

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Корзина не найдена" });
        }

        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item =>
            !item._id.equals(objectIdItemId)
        );

        if (cart.items.length === initialLength) {
            return res.status(404).json({ success: false, message: "Товар не найден в корзине" });
        }

        cart.totalPrice = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        await cart.save();

        res.json({ success: true, message: "Товар удален из корзины", cart });
    } catch (error) {
        console.error("Ошибка удаления продукта:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};