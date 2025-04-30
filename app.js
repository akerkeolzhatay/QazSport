import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from "path";
import bcrypt from "bcrypt";
import session from "express-session";
import { User } from "./models/user.js";
import { dbConnection } from "./database/dbConnection.js";
import { generateOtp } from "./middlewares/generateOtp.js";
import sendEmail from "./middlewares/email.js";
import foodRoutes from "./routes/foodRoutes.js";
import authRoute from "./routes/authRoute.js"
import Food from "./models/food.js"
import cartRoutes from "./routes/cartRoutes.js"
import adminRoutes from "./routes/adminRoutes.js";
import methodOverride from "method-override";


dotenv.config({ path: "./config/config.env" });

const app = express();
app.use(methodOverride("_method"));

app.use(session({
    secret: "asd",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/images", express.static(path.join(__dirname, "views/images")));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));

dbConnection();

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/foods", foodRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/admin", adminRoutes);


app.get("/", async (req, res) => {
    
    try {
        const foods = await Food.find();
        res.render("home", { foods, user: req.session.user });
    } catch (error) {
        console.error("Ошибка загрузки продуктов:", error);
        res.status(500).send("Ошибка сервера");
    }
});

app.get("/login", (req, res) => {
    res.render("sign");
});

app.get("/orders", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("orders", { user: req.session.user });
});

app.get("/checkout", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("checkout", { user: req.session.user });
});

app.get("/profile", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("profile", { user: req.session.user });
});

app.post("/signup", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const data = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        };

        const existingUser = await User.findOne({ email: data.email });
        if (existingUser) {
            return res.status(400).send("Пользователь уже существует. Используйте другой email.");
        }

        const otp = generateOtp();
        console.log("Сгенерированный OTP:", otp);

        await User.create({ ...data, otp });
        req.session.otp = otp;
        req.session.email = data.email;

        await sendEmail({
            email: data.email,
            subject: "Email Verification Code",
            html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
                <h1>Email Confirmation</h1>
                <p>Your code OTP:</p>
                <h2>${otp}</h2>
                <p>This code is valid for 10 minutes.</p>
            </div>
            `,
        });

        res.redirect("/login");
    } catch (error) {
        console.error("Ошибка при регистрации:", error);
        res.status(500).send("Внутренняя ошибка сервера: " + error.message);
    }
});

app.get("/verify", (req, res) => {
    if (!req.session.email) {
        return res.redirect("/");
    }
    res.render("verify", { email: req.session.email });
});

app.post("/verify-otp", async (req, res) => {
    const { otp } = req.body;

    try {
        const user = await User.findOne({ email: req.session.email });

        if (!user) {
            return res.status(400).send("Пользователь не найден. Пожалуйста, зарегистрируйтесь снова.");
        }

        if (otp === req.session.otp) {
            user.otp = null;
            await user.save();

            req.session.user = { name: user.name, email: user.email };
            req.session.otp = null;
            req.session.email = null;

            return res.redirect("/profile");
        } else {
            return res.status(400).send("Invalid OTP. Please try again.");
        }
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).send("Внутренняя ошибка сервера: " + error.message);
    }
});

app.post("/resend-otp", async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send("Пользователь не найден.");
        }

        const otp = generateOtp();
        user.otp = otp;
        await user.save();

        req.session.otp = otp;

        console.log(`Neq OTP for ${email}: ${otp}`);

        await sendEmail({
            email: user.email,
            subject: "New email verification code",
            html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
                <h1>Confirmation Email</h1>
                <p>Your new code OTP:</p>
                <h2>${otp}</h2>
                <p>This code is valid for 10 minutes.</p>
            </div>
            `,
        });

        res.redirect("/login");

    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).send("Внутренняя ошибка сервера: " + error.message);
    }
});

app.post("/signin", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).send("Неправильный email.");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (isPasswordMatch) {
            req.session.user = { 
                _id: user._id, 
                name: user.name, 
                email: user.email,
                role: user.role 
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error("Ошибка сохранения сеанса:", err);
                    return res.status(500).send("Ошибка сервера.");
                }
                res.redirect("/");
            });
        } else {
            return res.send("Неверный пароль.");
        }
    } catch (error) {
        console.error("Ошибка при входе в систему:", error);
        return res.status(500).send("Внутренняя ошибка сервера");
    }
});

app.post("/update", async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!req.session.user) {
            return res.redirect("/");
        }

        await User.updateOne({ email: req.session.user.email }, { $set: { name, email } });

        req.session.user.name = name;
        req.session.user.email = email;

        res.redirect("/profile");
    } catch (error) {
        console.error("Ошибка обновления данных:", error);
        res.send("Не удалось обновить данные.");
    }
});

app.post("/delete", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect("/");
        }

        await User.deleteOne({ email: req.session.user.email });
        req.session.destroy();
        res.redirect("/");
    } catch (error) {
        console.error("Ошибка удаления аккаунта:", error);
        res.send("Не удалось удалить аккаунт.");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});


app.use("/cart", cartRoutes);
app.use("/admin", adminRoutes);

app.post('/cart/add', async (req, res) => {
    const { productId, quantity } = req.body;

    if (!productId) {
        return res.status(400).json({ success: false, message: "Неправильный ID продукта" });
    }

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(400).json({ success: false, message: "Товар не найден" });
    }

    res.json({ success: true, message: "Товар добавлен в корзину" });
});

app.post("/api/v1/orders", async (req, res) => {
    try {
        const { userId, products, totalPrice } = req.body;

        const newOrder = new Order({
            user: userId,
            products,
            totalPrice,
            isPaid: false,
            orderStatus: "В обработке"
        });

        await newOrder.save();

        res.json({ success: true, order: newOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Ошибка создания заказа" });
    }
});

app.get('/admin/orders', (req, res) => {
    res.render('admin/adminOrder'); 
});


export default app;
