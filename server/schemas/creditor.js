
import mongoose, { Schema } from "mongoose";
const titleSchema = new Schema({
    title: String,
    subtitle: String,
})
const creditorSchema = new Schema({
    title: {
        type: String,
        unique: true,
    },
    subtitle: String,
    src: String,
    blocks: [{title: String, value: String}],
    advantages: [String],
    link: {
        type: String,
        default: '',
    },
    isRecommended: {
        type: Boolean,
        default: false,
    },
    isEmail: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
});

export default mongoose.model('creditors', creditorSchema, 'creditor');