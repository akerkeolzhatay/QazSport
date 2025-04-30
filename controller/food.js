import Food from '../models/food.js';

export const getAllFoods = async (req, res) => {
  try {
    const category = req.query.category;
    let foods;

    if (category) {
      foods = await Food.find({ category });
    } else {
      foods = await Food.find();
    }

    const categories = await Food.distinct('category');

    res.render('home', { foods, categories, selectedCategory: category });
  } catch (error) {
    res.status(500).send('Ошибка сервера');
  }
};
