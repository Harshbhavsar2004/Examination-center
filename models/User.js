const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const keysecret = process.env.SECRET_KEY;

const userSchema = new mongoose.Schema({
    fname: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, validate(value) {
        if (!validator.isEmail(value)) {
            throw new Error("not valid email");
        }
    }},
    phone: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    password: { type: String, required: true, minlength: 6 },
    cpassword: { type: String, required: true, minlength: 6 },
    tokens: [{ token: { type: String, required: true } }],
    verifytoken: { type: String },
    Role: { type: String, default: "user" }
});

userSchema.methods.generateAuthtoken = async function () {
    try {
        let token23 = jwt.sign({ _id: this._id }, keysecret, { expiresIn: "1d" });
        this.tokens = this.tokens.concat({ token: token23 });
        await this.save();
        return token23;
    } catch (error) {
        throw new Error(error);
    }
}

const User = mongoose.model("User", userSchema);
module.exports = User; 