const mongoose = require("mongoose");

// const DB = "mongodb+srv://vaibhavpingle:vaibhav@cluster0.gfrwio3.mongodb.net/Authusers?retryWrites=true&w=majority"
const DB = process.env.DATABASE

mongoose.connect(DB,{
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(()=> console.log("DataBase Connected")).catch((errr)=>{
    console.log(errr);
})