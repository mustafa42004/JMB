let mongoose = require("mongoose");
mongoose.connect("mongodb+srv://mustafaaerozefcreations:9BNaUoFL3hEFgsR4@cluster0.priws.mongodb.net/JMB"), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
};

// mongoose.connect("mongodb://0.0.0.0:27017/assignment");

mongoose.connection.on("connected", ()=>{
    console.log("connected")
})
mongoose.connection.on("error", (err)=>{
    console.log(err)
})

module.exports = mongoose;