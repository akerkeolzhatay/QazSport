import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
            name: String,
            variant: String,
            quantity: Number,
            price: Number,
            image: String,
        }
    ],
    totalPrice: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }, 
    orderStatus: { type: String, enum: ["В обработке", "Доставляется", "Доставлено"], default: "В обработке" },
    isPaid: { type: Boolean, default: false },
});

export default mongoose.model("Order", OrderSchema);
