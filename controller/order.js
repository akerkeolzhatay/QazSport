import Order from "../models/order.js";
import Cart from "../models/cart.js";

export const checkout = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Вы не вошли в систему" });
        }

        const userId = req.session.user._id;

        const cart = await Cart.findOne({ userId }).populate("items.foodId");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Корзина пуста" });
        }

        const paymentSuccess = Math.random() > 0.1; 
        if (!paymentSuccess) {
            return res.status(400).json({ success: false, message: "Платеж не прошёл" });
        }

        const order = new Order({
            userId,
            items: cart.items,
            totalPrice: cart.totalPrice,
        });

        await order.save();

        await Cart.deleteOne({ userId });

        res.json({ success: true, message: "Заказ был успешно размещен.", order });
    } catch (error) {
        console.error("Ошибка при оформлении заказа:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

export const getOrders = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Ошибка при оформлении заказа:" });
        }

        const userId = req.session.user._id;
        const orders = await Order.find({ userId }).sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        console.error("Ошибка получения заказов:", error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
};

async function updateStatus(orderId) {
    const newStatus = document.getElementById(`status-select-${orderId}`).value;

    if (!["В обработке", "Доставляется", "Доставлено"].includes(newStatus)) {
        alert("Неверный статус!");
        return;
    }

    const response = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus })
    });

    const data = await response.json();
    if (data.success) {
        document.getElementById(`status-${orderId}`).innerText = newStatus;
        alert("Статус доставки обновлен!");
    } else {
        alert("Ошибка обновления статуса");
    }
}
