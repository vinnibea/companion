import mongoose, { Schema } from "mongoose";

const subscribeSchema = new Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
         validate: {
             validator: function(v) {
                 return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
             },
             message: "Неверный формат электронной почты"
         },
         required: [true, "Поле не может быть пустым"]
    },
  
});


export default mongoose.model('Subscribers', subscribeSchema, 'subscriber');