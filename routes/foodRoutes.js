import express from "express";
import { getAllFoods } from "../controller/food.js";

const router = express.Router();

router.get("/", getAllFoods);

export default router;
