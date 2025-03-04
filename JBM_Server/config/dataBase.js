let mongoose = require("mongoose");
// mongoose.connect("mongodb+srv://Sadiq53:ZX7t5iTyKPCNcMOE@cluster0.cunxumm.mongodb.net/JBM");
mongoose.connect("mongodb+srv://sadiqaerozefcreations:sgyn4hoYIBiPNSpU@cluster0.nr3rc.mongodb.net/JBM", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
});
// mongoose.connect("mongodb://0.0.0.0:27017/assignment");

mongoose.connection.on("connected", ()=>{
    console.log("connected")
})
mongoose.connection.on("error", (err)=>{
    console.log(err)
})

module.exports = mongoose;