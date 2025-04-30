import mongoose from "mongoose";

const CartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
        {
            foodId: { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
            name: String,
            variant: String,
            quantity: { type: Number, default: 1 },
            price: Number,
            image: String,
        }
    ],
    totalPrice: { type: Number, default: 0 }
});

export default mongoose.model("Cart", CartSchema);
