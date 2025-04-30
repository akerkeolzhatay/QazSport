import mongoose from "mongoose";

export const dbConnection = () => {
  mongoose
    .connect("mongodb+srv://qazsports09:Qazsports09@qazsports.7ffyl6z.mongodb.net/", {
      dbName: "qazsports",
    })
    .then(() => {
      console.log("Подключено к базе данных!");
    })
    .catch((err) => {
      console.log(`Произошла ошибка при подключении к базе данных: ${err}`);
    });
};
